import os
import json
import logging
from typing import List, Optional
from datetime import datetime

# Web Framework
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Data Validation & Models
from pydantic import BaseModel

# Database
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey, Float, Boolean
from sqlalchemy.orm import sessionmaker, Session, declarative_base, relationship
from sqlalchemy.exc import IntegrityError

# AI & Utilities
from openai import OpenAI
import pdfplumber
import razorpay
from dotenv import load_dotenv

# --- 1. CONFIGURATION & SETUP ---

# Load environment variables from .env file
load_dotenv()

# Configuration
# DATABASE CONFIGURATION
# 1. Try to get the Cloud Database URL (from Render/Neon)
DATABASE_URL = os.getenv("DATABASE_URL")

# 2. If no Cloud DB, fallback to Local SQLite
if not DATABASE_URL:
    print("⚠️  No Cloud DB found. Using Local SQLite.")
    DATABASE_URL = "sqlite:///./gharkadiet.db"
    connect_args = {"check_same_thread": False} 
else:
    print("✅  Cloud DB Detected! Using PostgreSQL.")
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    connect_args = {}
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
RAZORPAY_SECRET = os.getenv("RAZORPAY_SECRET")

# Initialize AI Client
client = OpenAI(api_key=OPENAI_API_KEY)

# Initialize FastAPI
app = FastAPI(
    title="AI Ghar-Ka-Diet API",
    description="Backend for personalized diet and grocery generation",
    version="1.0.0"
)

# --- 2. CORS MIDDLEWARE (CRUCIAL FOR REACT/NETLIFY) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace "*" with your specific Netlify URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 3. DATABASE MODELS (SQLAlchemy) ---
# --- 3. DATABASE MODELS (UPDATED FOR COMMERCE) ---
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# In backend/main.py, add this class near the top

class GeneratePlanRequest(BaseModel):
    age: int
    weight: float       # in kg
    height: float       # in cm
    gender: str         # "male" or "female"
    goal: str           # "weight_loss", "muscle_gain", "maintenance"
    activity_level: str # "sedentary", "active", "moderate"
    diet_type: str      # "veg", "non_veg", "jain", "eggetarian"
    region: str         # "north_indian", "south_indian", "maharashtrian", "bengali"
    pantry_level: str = "core"  # "core" (Basic), "modern" (Oats/Paneer), "global" (Avocado)
    allergies: Optional[str] = None

# Add this class along with your other Pydantic models (around line 125)
class LoginRequest(BaseModel):
    phone: str

class SavePlanRequest(BaseModel):
    user_id: int
    phone: str
    title: str

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    phone = Column(String, unique=True, index=True)  # UNIQUE IDENTIFIER
    email = Column(String, nullable=True)
    
    # Store profile as JSON so we can update it if they change goals
    profile_data = Column(Text) 
    medical_issues = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    diet_plans = relationship("DietPlan", back_populates="user")
    orders = relationship("Order", back_populates="user")

class DietPlan(Base):
    __tablename__ = "diet_plans"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    title = Column(String, default="My Diet Plan") # <--- NEW COLUMN
    plan_json = Column(Text)     
    grocery_json = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="diet_plans")
    orders = relationship("Order", back_populates="diet_plan")

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    diet_plan_id = Column(Integer, ForeignKey("diet_plans.id"))
    
    amount = Column(Float)            # e.g., 999.00
    currency = Column(String, default="INR")
    status = Column(String, default="pending") # pending, paid, shipped
    
    razorpay_order_id = Column(String, nullable=True)
    razorpay_payment_id = Column(String, nullable=True)
    
    shipping_address = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="orders")
    diet_plan = relationship("DietPlan", back_populates="orders")

# Create Tables
Base.metadata.create_all(bind=engine)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- 4. DATA VALIDATION MODELS (Pydantic) ---

class UserProfile(BaseModel):
    name: str = "Guest"
    phone: str = "0000000000"  # <--- NEW: Vital for tracking
    age: int
    gender: str
    height_cm: float
    weight_kg: float
    goal: str
    diet_pref: str
    region: str
    budget: str
    medical_manual: List[str] = []

class OrderRequest(BaseModel):
    amount: int       # Amount in paise (e.g., 99900 for ₹999)
    currency: str = "INR"

# --- 5. AI HELPER FUNCTION ---

def call_ai_json(system_prompt: str, user_prompt: str):
    """
    Helper to call OpenAI with JSON mode enforcement.
    """
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini", # Use "gpt-4-turbo" for better results if budget allows
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.7
        )
        content = response.choices[0].message.content
        return json.loads(content)
    except Exception as e:
        print(f"AI Error: {e}")
        # Fallback JSON if AI fails
        return {"error": "AI generation failed", "details": str(e)}

# --- 6. API ENDPOINTS ---

@app.get("/")
def home():
    return {"message": "AI Ghar-Ka-Diet Backend is Running!", "status": "active"}

@app.post("/upload-blood-report")
async def analyze_blood_report(file: UploadFile = File(...)):
    """
    Extracts text from an uploaded PDF blood report and uses AI 
    to find nutritional deficiencies.
    """
    text_content = ""
    try:
        # 1. Extract Text from PDF
        with pdfplumber.open(file.file) as pdf:
            for page in pdf.pages:
                extracted = page.extract_text()
                if extracted:
                    text_content += extracted + "\n"
        
        if not text_content:
            return {"issues": [], "summary": "Could not read text from PDF."}

        # 2. Analyze with AI
        # UPGRADED MEDICAL INTELLIGENCE PROMPT
        # UPGRADED "SENTIENT" MEDICAL PROMPT
        system_prompt = """
        You are an expert Functional Nutritionist analyzing a blood report.
        
        Your Task: Detect nutritional imbalances and classify their severity based on the context provided in the text.
        
        CRITICAL INSTRUCTION - SEVERITY CLASSIFICATION:
        1. **Borderline / Slight Deviation:** - If a value is slightly out of range or described as "Borderline", "Mildly Elevated", or "Slightly Low".
           - Label these as: "Monitor: [Nutrient/Marker]" (e.g., "Monitor: Cholesterol").
           - Feedback Goal: Neutral, preventative.
           
        2. **High / Clinical Deficiency:**
           - If a value is significantly out of range, flagged as "High", "Low", "Abnormal", or "Critical".
           - Label these as: "Action: [Nutrient/Marker]" (e.g., "Action: High Sugar", "Action: Low Iron").
           - Feedback Goal: Alert, strict dietary correction needed.

        3. **Ignore Non-Nutritional:** - Ignore structural markers (Platelets, WBC) unless critically dangerous. Focus on Diet (Vitamins, Lipids, Sugar, Thyroid).

        OUTPUT FORMAT (JSON ONLY):
        { 
            "issues": ["Monitor: Cholesterol", "Action: Low Vitamin D"], 
            "summary": "Your Vitamin D requires immediate attention with iron-rich foods. Your Cholesterol is slightly elevated, so we will gently reduce fried foods." 
        }
        """
        analysis = call_ai_json(system_prompt, f"Report Text: {text_content[:3000]}") # Limit chars for cost
        return analysis

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-diet")
async def generate_diet(profile: UserProfile, db: Session = Depends(get_db)):
    """
    Generates a plan where the SUMMARY explains the connection between Goal + Stats + Report.
    """
    
    # 1. LOGIC: Check Identity & Create/Update User
    db_user = db.query(User).filter(User.phone == profile.phone).first()
    
    if db_user:
        db_user.name = profile.name
        db_user.profile_data = profile.json()
        db_user.medical_issues = json.dumps(profile.medical_manual)
    else:
        db_user = User(
            name=profile.name,
            phone=profile.phone,
            profile_data=profile.json(),
            medical_issues=json.dumps(profile.medical_manual)
        )
        db.add(db_user)
    
    db.commit()
    db.refresh(db_user)

    # 2. AI GENERATION - "REASONING ENGINE" LOGIC
    system_prompt = f"""
    You are an expert Indian Clinical Nutritionist. Create a 7-day meal plan.
    
    **USER PROFILE ANALYSIS:**
    - **Goal:** {profile.goal}
    - **Demographics:** {profile.age} years old, {profile.gender}
    - **Medical Report:** {profile.medical_manual}
    - **Region:** {profile.region} ({profile.diet_pref})

    **CRITICAL INSTRUCTION: CHIEF NUTRITIONIST NOTE (The 'summary'):**
    The summary must be a personal explanation to the user. You MUST mention:
    1. How this specific food helps their Goal ({profile.goal}).
    2. Any specific adjustment you made for their Age/Gender.
    3. How you addressed their Medical Tags (if any).
    
    *Example Summary:* "Rahul, for Muscle Gain, we have added Paneer Bhurji to your breakfast. Since you have high sugar, we replaced white rice with brown rice in your lunch."

    **REGIONAL BALANCE (The 80/20 Rule):**
    1. **South Indian**: 80% Rice/Idli/Dosa. 20% Roti/Chapati (Dinner only).
    2. **North Indian**: 80% Roti/Paratha. 20% Idli/Dosa (Breakfast only).

    **DIET STRICTNESS:**
    - {profile.diet_pref}: Follow strict rules (e.g. Vegetarian = No Meat/Eggs).

    REQUIRED JSON OUTPUT:
    {{
      "summary": "Your personalized note here...",
      "days": [
        {{
           "day": 1,
           "breakfast": "...",
           "lunch": "...",
           "snack": "...",
           "dinner": "..."
        }},
        ...
      ]
    }}
    """
    
    user_prompt = f"""
    Profile: {profile.name}, {profile.age}y, {profile.gender}
    Stats: {profile.height_cm}cm, {profile.weight_kg}kg
    Goal: {profile.goal}
    Preferences: {profile.diet_pref}, {profile.region}
    Medical Tags: {profile.medical_manual}
    """

    print(f"--- Generating {profile.goal} Plan for {profile.name} ---") 
    diet_plan_json = call_ai_json(system_prompt, user_prompt)
    
    # 3. SAVE PLAN
    db_plan = DietPlan(
        user_id=db_user.id,
        plan_json=json.dumps(diet_plan_json),
        title=f"{profile.goal} - {profile.region} Plan"
    )
    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)

    return {
        "user_id": db_user.id,
        "plan_id": db_plan.id,
        "diet": diet_plan_json
    }
@app.post("/generate-grocery/{plan_id}")
async def generate_grocery(plan_id: int, db: Session = Depends(get_db)):
    """
    Retrieves a diet plan and converts it into a consolidated grocery list.
    """
    # 1. Fetch Plan
    plan = db.query(DietPlan).filter(DietPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    # 2. AI Conversion
    system_prompt = """
    You are a Grocery Assistant. Analyze the meal plan and generate a shopping list.
    1. Consolidate items (e.g., don't say 'onion' 3 times, say '500g Onion').
    2. Output JSON:
    {
      "categories": [
        { "name": "Vegetables", "items": ["1kg Potato", "500g Tomato"] },
        { "name": "Spices & Oils", "items": ["100g Cumin", "1L Mustard Oil"] }
      ]
    }
    """
    
    grocery_data = call_ai_json(system_prompt, f"Meal Plan JSON: {plan.plan_json}")

    # 3. Save Update
    plan.grocery_json = json.dumps(grocery_data)
    db.commit()

    return grocery_data

@app.post("/checkout")
async def create_razorpay_order(request: OrderRequest):
    """
    Creates an order on Razorpay for payment processing.
    """
    if not RAZORPAY_KEY_ID or not RAZORPAY_SECRET:
        # Development stub if keys are missing
        return {"id": "order_test_12345", "amount": request.amount, "currency": "INR", "status": "created (mock)"}

    try:
        client_rzp = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_SECRET))
        data = {
            "amount": request.amount,
            "currency": request.currency,
            "receipt": f"receipt_{datetime.now().timestamp()}",
            "payment_capture": 1 
        }
        order = client_rzp.order.create(data=data)
        return order
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
@app.post("/save-plan")
async def save_plan_phone(req: SavePlanRequest, db: Session = Depends(get_db)):
    # 1. Find the temporary session user
    current_user = db.query(User).filter(User.id == req.user_id).first()
    if not current_user:
        raise HTTPException(status_code=404, detail="User session not found.")

    # 2. Find the plan that needs saving (associated with temporary user)
    latest_plan = db.query(DietPlan).filter(DietPlan.user_id == current_user.id).order_by(DietPlan.created_at.desc()).first()
    if not latest_plan:
        raise HTTPException(status_code=404, detail="No plan found to save.")

    # 3. Handle Phone Number Logic
    if req.phone:
        # Check if this phone belongs to an EXISTING user (from the past)
        existing_user = db.query(User).filter(User.phone == req.phone).first()

        if existing_user and existing_user.id != current_user.id:
            # CASE A: RETURNING USER
            # The phone number exists on another account.
            # We must move the plan to the OLD account to avoid the crash.
            print(f"Merging plan from User {current_user.id} to User {existing_user.id}")
            latest_plan.user_id = existing_user.id
            
            # Optional: You might want to update the old user's details if needed
            # existing_user.name = req.name (if you had a name field)
            
        else:
            # CASE B: NEW USER (or same user)
            # Phone number is free. Claim it for this session.
            current_user.phone = req.phone

        # Commit changes (either the plan transfer OR the phone update)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(status_code=400, detail="Phone number conflict.")

    # 4. Update the Plan Title
    latest_plan.title = req.title
    db.commit()
    
    return {"message": "Plan saved successfully!"}

@app.post("/login")
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.phone == request.phone).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found. Please create a plan first.")

    # FETCH ALL PLANS (Not just one)
    plans = db.query(DietPlan).filter(DietPlan.user_id == user.id).order_by(DietPlan.created_at.desc()).all()

    return {
        "message": "Login successful",
        "user": {
            "id": user.id,
            "name": user.name,
            "phone": user.phone
        },
        "plans": [
            {
                "id": p.id,
                "title": p.title,
                "created_at": p.created_at,
                "diet": json.loads(p.plan_json)
            } for p in plans
        ]
    }
# --- 7. RUN INSTRUCTION ---
if __name__ == "__main__":
    import uvicorn
    # This block allows you to run `python main.py` directly for testing
    uvicorn.run(app, host="0.0.0.0", port=8000)