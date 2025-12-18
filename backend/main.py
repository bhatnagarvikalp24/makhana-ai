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
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey, Float, Boolean, text
from sqlalchemy.orm import sessionmaker, Session, declarative_base, relationship
from sqlalchemy.exc import IntegrityError, OperationalError

# AI & Utilities
from openai import OpenAI
import pdfplumber
import razorpay
from dotenv import load_dotenv

# --- 1. CONFIGURATION & SETUP ---

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()

# Configuration
# DATABASE CONFIGURATION
# 1. Try to get the Cloud Database URL (from Render/Neon)
# --- DATABASE CONFIGURATION (SMART SWITCH) ---
DATABASE_URL = os.getenv("DATABASE_URL")

# 1. SETUP VARIABLES BASED ON ENVIRONMENT
if not DATABASE_URL:
    # Scenario A: Local Development (SQLite)
    print("⚠️  No Cloud DB found. Using Local SQLite.")
    DATABASE_URL = "sqlite:///./gharkadiet.db"
    connect_args = {"check_same_thread": False}
    pool_config = {}
else:
    # Scenario B: Cloud Production (PostgreSQL)
    print("✅  Cloud DB Detected! Using PostgreSQL.")
    # Fix for some cloud providers using 'postgres://' instead of 'postgresql://'
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

    # Add SSL requirement for Neon
    connect_args = {"sslmode": "require"}

    # Production-grade connection pooling for Neon
    pool_config = {
        "pool_size": 5,              # Max connections in pool
        "max_overflow": 10,          # Extra connections beyond pool_size
        "pool_timeout": 30,          # Wait 30s for connection
        "pool_recycle": 1800,        # Recycle connections every 30 min (Neon closes after inactivity)
        "pool_pre_ping": True,       # Test connection before using
    }

# 2. CREATE ENGINE (Run this AFTER variables are set)
engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    **pool_config,
    echo=False  # Set to True for SQL query logging
)

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
# Allow all origins temporarily for debugging - will restrict later
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Temporarily allow all origins to fix CORS
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Add request timing middleware
from fastapi import Request
import time

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    logger.info(f"{request.method} {request.url.path} - {process_time:.2f}s")
    return response

# --- 3. DATABASE MODELS (SQLAlchemy) ---
# --- 3. DATABASE MODELS (UPDATED FOR COMMERCE) ---
# CORRECT
engine = create_engine(DATABASE_URL, connect_args=connect_args)
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
    """Database session with automatic reconnection on failure"""
    db = SessionLocal()
    try:
        yield db
        db.commit()  # Commit any pending changes
    except Exception as e:
        db.rollback()  # Rollback on error
        logger.error(f"Database session error: {e}")
        raise
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

def call_ai_json(system_prompt: str, user_prompt: str, max_retries: int = 2):
    """
    Helper to call OpenAI with JSON mode enforcement and retry logic.
    """
    for attempt in range(max_retries):
        try:
            logger.info(f"Calling AI API (attempt {attempt + 1}/{max_retries})")
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.7,
                max_tokens=2000  # Optimize token usage
            )
            content = response.choices[0].message.content
            result = json.loads(content)
            logger.info("AI API call successful")
            return result
        except Exception as e:
            logger.error(f"AI Error (attempt {attempt + 1}): {e}")
            if attempt == max_retries - 1:
                # Fallback JSON if all retries fail
                return {"error": "AI generation failed", "details": str(e)}
            time.sleep(1)  # Wait before retry
    return {"error": "AI generation failed after retries"}

# --- 6. API ENDPOINTS ---

@app.get("/")
def home():
    return {"message": "AI Ghar-Ka-Diet Backend is Running!", "status": "active"}

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint with database connectivity test"""
    try:
        # Test database connection
        db.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Database connection failed")

@app.get("/admin/stats")
def get_stats(db: Session = Depends(get_db)):
    """Get database statistics - users, plans, etc."""
    try:
        total_users = db.query(User).count()
        total_plans = db.query(DietPlan).count()
        total_saved = db.query(SavedPlan).count()

        # Get recent users (last 10)
        recent_users = db.query(User).order_by(User.created_at.desc()).limit(10).all()

        # Get recent plans (last 10)
        recent_plans = db.query(DietPlan).order_by(DietPlan.created_at.desc()).limit(10).all()

        return {
            "stats": {
                "total_users": total_users,
                "total_plans": total_plans,
                "total_saved_plans": total_saved
            },
            "recent_users": [
                {
                    "id": u.id,
                    "name": u.name,
                    "phone": u.phone[:4] + "****" + u.phone[-2:] if u.phone else None,  # Masked
                    "created_at": u.created_at.isoformat()
                } for u in recent_users
            ],
            "recent_plans": [
                {
                    "id": p.id,
                    "user_id": p.user_id,
                    "created_at": p.created_at.isoformat()
                } for p in recent_plans
            ]
        }
    except Exception as e:
        logger.error(f"Stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
    try:
        logger.info(f"Generating diet plan for {profile.name} (phone: {profile.phone})")

        # 1. LOGIC: Check Identity & Create/Update User
        db_user = db.query(User).filter(User.phone == profile.phone).first()

        if db_user:
            db_user.name = profile.name
            db_user.profile_data = profile.json()
            db_user.medical_issues = json.dumps(profile.medical_manual)
            logger.info(f"Updated existing user: {db_user.id}")
        else:
            db_user = User(
                name=profile.name,
                phone=profile.phone,
                profile_data=profile.json(),
                medical_issues=json.dumps(profile.medical_manual)
            )
            db.add(db_user)
            logger.info("Created new user")

        db.commit()
        db.refresh(db_user)
    except Exception as e:
        logger.error(f"Database error: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error occurred")

    # 2. AI GENERATION - COMPREHENSIVE NUTRITION PLANNING ENGINE
    system_prompt = f"""You are a **nutrition planning engine** for a health and fitness web platform.
Your task is to generate **goal-oriented, medically-aware, and outcome-driven diet plans**, not just static food charts.

---

### 🔸 USER PROFILE
- **Name:** {profile.name}
- **Age:** {profile.age} years, **Gender:** {profile.gender}
- **Current Stats:** {profile.height_cm}cm, {profile.weight_kg}kg
- **Goal:** {profile.goal}
- **Diet Preference:** {profile.diet_pref}
- **Region:** {profile.region}
- **Medical Conditions:** {profile.medical_manual if profile.medical_manual else "None"}

---

### 🔸 OUTPUT REQUIREMENTS (VERY IMPORTANT)

Your output must be **structured, refined, and complete**, not just a 7-day food list.

#### 1️⃣ Goal Summary (Top Section)
Briefly restate:
- User's goal and why this plan supports it
- Current body stats and nutritional focus (calorie deficit/surplus, protein optimization, sugar control, etc.)
- Any medical adjustments made

#### 2️⃣ Daily Nutrition Targets
Clearly mention:
- Target daily calories (provide a range, e.g., 1800-2000 kcal)
- Daily protein intake (grams)
- Carbohydrates and fats (high-level guidance)
- Any medical constraints applied (low GI foods, low sodium, etc.)

#### 3️⃣ Meal Structure (Dynamic, NOT fixed 4 meals)
Include meals **only if beneficial**:
- Early Morning (if needed)
- Breakfast
- Mid-Morning Snack (if needed)
- Lunch
- Evening Snack
- Dinner
- Before Bed (if helpful for goal)

Each meal should include:
- Food items with portion sizes (e.g., "2 Rotis + 1 cup Dal")
- Purpose of the meal (energy, protein, recovery, digestion)

#### 4️⃣ 7-Day Plan (Refined, Goal-Based)
Provide a **7-day plan** with:
- Variety (not same meals every day)
- Simple food swaps where possible
- Practical and realistic Indian meals
- 80% {profile.region} regional preference, 20% variety

#### 5️⃣ Activity Guidance (If Applicable)
If goal involves muscle gain/fat loss:
- Recommended training frequency (days/week)
- Type: strength / cardio / mix
- Simple beginner-friendly guidance

If weight loss or medical diet:
- Walking / light activity recommendations

#### 6️⃣ Expected Results (Mandatory)
Clearly state:
- Expected weight change per week
- When visible changes may appear
- Success milestones: 30 / 60 / 90 days
- Warning if progress may plateau

#### 7️⃣ Important Notes & Safety
Include:
- Hydration guidance (liters per day)
- Sleep importance
- Medical disclaimer if conditions exist
- When to reassess calories/plan

---

### 🔸 DIET STRICTNESS RULES
- **Vegetarian:** No meat, fish, eggs
- **Non-Veg:** Include meat/fish options
- **Jain:** No onion, garlic, root vegetables
- **Eggetarian:** Vegetarian + eggs allowed

---

### 🔸 REGIONAL BALANCE (80/20 Rule)
- **South Indian:** 80% Rice/Idli/Dosa, 20% Roti (dinner)
- **North Indian:** 80% Roti/Paratha, 20% Idli/Dosa (breakfast)
- **West/East Indian:** Balanced mix with regional staples

---

### 🔸 TONE & STYLE
- Simple, clear, and human
- Encouraging and coach-like
- No extreme or unsafe advice
- Think like a **nutrition coach**, not a recipe generator

---

### 🔸 REQUIRED JSON OUTPUT FORMAT

{{
  "summary": "Personalized 2-3 sentence summary explaining the plan's focus and medical adjustments",
  "daily_targets": {{
    "calories": "1800-2000 kcal",
    "protein": "80-100g",
    "carbs_guidance": "Moderate, focus on whole grains",
    "fats_guidance": "Healthy fats from nuts, ghee",
    "medical_adjustments": "Low GI foods for diabetes control"
  }},
  "days": [
    {{
      "day": 1,
      "early_morning": "Optional: 1 glass warm water with lemon",
      "breakfast": "2 Moong Dal Chilla + 1 cup Curd (Protein-rich start)",
      "mid_morning": "1 Apple + 10 Almonds (Energy boost)",
      "lunch": "2 Rotis + 1 cup Dal + Salad (Balanced macro meal)",
      "evening_snack": "1 cup Green Tea + 2 Marie Biscuits",
      "dinner": "Grilled Paneer (100g) + Sautéed Vegetables (Light protein)",
      "before_bed": "Optional: 1 glass warm milk with turmeric"
    }},
    ...continue for 7 days with variety
  ],
  "activity_guidance": {{
    "training_frequency": "4-5 days/week",
    "type": "Strength training + light cardio",
    "beginner_tips": "Start with bodyweight exercises, gradually add weights"
  }},
  "expected_results": {{
    "weekly_weight_change": "0.5-1 kg loss per week",
    "visible_changes": "Noticeable in 3-4 weeks",
    "30_day_milestone": "3-4 kg loss, improved energy",
    "60_day_milestone": "6-8 kg loss, muscle definition",
    "90_day_milestone": "10-12 kg loss, significant body recomposition",
    "plateau_warning": "Progress may slow after 8 weeks, reassess calories"
  }},
  "important_notes": {{
    "hydration": "Drink 3-4 liters of water daily",
    "sleep": "Aim for 7-8 hours of quality sleep",
    "medical_disclaimer": "Consult doctor if diabetic conditions worsen",
    "reassessment": "Reassess plan every 4 weeks based on progress"
  }}
}}
"""

    user_prompt = f"""Generate a comprehensive, goal-oriented diet plan for {profile.name}.
Goal: {profile.goal}
Current: {profile.weight_kg}kg, {profile.height_cm}cm
Focus on practical Indian meals with clear outcome expectations."""

    try:
        logger.info(f"Generating {profile.goal} plan for {profile.name}")
        diet_plan_json = call_ai_json(system_prompt, user_prompt)

        # Check for AI errors
        if "error" in diet_plan_json:
            logger.error(f"AI generation failed: {diet_plan_json}")
            raise HTTPException(status_code=500, detail="Failed to generate diet plan")

        # 3. SAVE PLAN
        db_plan = DietPlan(
            user_id=db_user.id,
            plan_json=json.dumps(diet_plan_json),
            title=f"{profile.goal} - {profile.region} Plan"
        )
        db.add(db_plan)
        db.commit()
        db.refresh(db_plan)

        logger.info(f"Plan created successfully: {db_plan.id}")

        return {
            "user_id": db_user.id,
            "plan_id": db_plan.id,
            "diet": diet_plan_json
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating plan: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to generate and save plan")
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