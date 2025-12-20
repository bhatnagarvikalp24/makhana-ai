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
import requests
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
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")  # Optional - for recipe videos

# Initialize AI Client
client = OpenAI(api_key=OPENAI_API_KEY)

# Simple in-memory cache for recipe videos (avoids repeated API calls)
recipe_video_cache = {}

# Initialize FastAPI
app = FastAPI(
    title="AI Ghar-Ka-Diet API",
    description="Backend for personalized diet and grocery generation",
    version="1.0.0",
    servers=[
        {"url": "https://makhana-ai.onrender.com", "description": "Production Server"},
        {"url": "http://localhost:8000", "description": "Local Development"}
    ]
)

# --- 2. CORS MIDDLEWARE (CRUCIAL FOR REACT/NETLIFY) ---
# Allow all origins for now - can restrict later with environment variable
default_origins = "*"  # Allow all origins to fix CORS issues
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", default_origins)

# FastAPI CORS doesn't support ["*"] directly, so we use a regex or list
if allowed_origins_env == "*":
    # Use regex pattern to allow all origins
    origins = [r".*"]
else:
    origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r".*",  # Allow all origins using regex
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
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
    goal_pace: str = "balanced"  # New field: conservative, balanced, rapid
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
def health_check():
    """Lightweight health check endpoint - fast response for monitoring"""
    # Fast response without DB check for keep-alive pings
    return {
        "status": "healthy",
        "service": "active",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health/detailed")
def health_check_detailed(db: Session = Depends(get_db)):
    """Detailed health check with database connectivity test"""
    try:
        # Test database connection
        db.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "database": "connected",
            "service": "active",
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

        # Get recent users (last 10)
        recent_users = db.query(User).order_by(User.created_at.desc()).limit(10).all()

        # Get recent plans (last 10)
        recent_plans = db.query(DietPlan).order_by(DietPlan.created_at.desc()).limit(10).all()

        return {
            "stats": {
                "total_users": total_users,
                "total_plans": total_plans
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
    to find nutritional deficiencies. Validates that the PDF is actually a medical report.
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
            return {"error": "not_readable", "message": "Could not read text from PDF. Please ensure it's a clear, text-based PDF."}

        # 2. VALIDATE: Check if this is actually a medical/blood report
        medical_keywords = [
            'hemoglobin', 'glucose', 'cholesterol', 'vitamin', 'blood', 'test', 'lab',
            'pathology', 'hba1c', 'thyroid', 'tsh', 'hdl', 'ldl', 'triglycerides',
            'creatinine', 'urea', 'platelet', 'wbc', 'rbc', 'hemato', 'serum',
            'mg/dl', 'mmol', 'reference', 'range', 'normal', 'low', 'high'
        ]

        text_lower = text_content.lower()
        keyword_matches = sum(1 for keyword in medical_keywords if keyword in text_lower)

        # If less than 3 medical keywords found, likely not a blood report
        if keyword_matches < 3:
            logger.warning(f"PDF validation failed: only {keyword_matches} medical keywords found")
            return {
                "error": "not_medical",
                "message": "This doesn't appear to be a blood report. Please upload a valid medical lab report containing test results.",
                "keyword_matches": keyword_matches
            }

        # 3. Analyze with AI - ENHANCED VERSION with specific values
        system_prompt = """
        You are an expert Functional Nutritionist analyzing a blood report.

        Your Task: Detect nutritional imbalances, extract specific values, and provide actionable dietary guidance.

        CRITICAL INSTRUCTION - SEVERITY CLASSIFICATION:
        1. **Borderline / Slight Deviation:**
           - If a value is slightly out of range or described as "Borderline", "Mildly Elevated", or "Slightly Low".
           - Label these as: "Monitor: [Nutrient/Marker]" (e.g., "Monitor: Cholesterol (205 mg/dL)").
           - Feedback Goal: Neutral, preventative.

        2. **High / Clinical Deficiency:**
           - If a value is significantly out of range, flagged as "High", "Low", "Abnormal", or "Critical".
           - Label these as: "Action: [Nutrient/Marker]" (e.g., "Action: Low Vitamin D (12 ng/mL)", "Action: High HbA1c (7.2%)").
           - Feedback Goal: Alert, strict dietary correction needed.

        3. **Focus on Nutrition-Relevant Markers:**
           - Prioritize: Vitamin D, B12, Iron/Ferritin, Hemoglobin, HbA1c, Glucose, Cholesterol (Total, HDL, LDL), Triglycerides, Thyroid (TSH, T3, T4)
           - Ignore: Platelet count, WBC count (unless extremely abnormal)

        4. **Extract Specific Values:**
           - Try to include the actual value and unit when possible
           - Example: "Action: Low Vitamin D (15 ng/mL, normal >30)"

        OUTPUT FORMAT (JSON ONLY):
        {
            "issues": [
                "Monitor: Cholesterol (205 mg/dL)",
                "Action: Low Vitamin D (12 ng/mL)",
                "Action: High HbA1c (7.2%)"
            ],
            "summary": "Your Vitamin D is critically low and needs immediate dietary attention with fortified foods and sunlight exposure. HbA1c indicates pre-diabetes - we'll focus on low GI foods. Cholesterol is slightly elevated, so we'll limit fried and processed foods.",
            "deficiencies": [
                {
                    "marker": "Vitamin D",
                    "value": "12 ng/mL",
                    "status": "Low",
                    "severity": "high",
                    "dietary_focus": "Increase fatty fish, egg yolks, fortified milk, and sunlight exposure"
                },
                {
                    "marker": "HbA1c",
                    "value": "7.2%",
                    "status": "High",
                    "severity": "high",
                    "dietary_focus": "Low GI carbs, reduce sugar, increase fiber"
                }
            ]
        }
        """
        analysis = call_ai_json(system_prompt, f"Report Text: {text_content[:3500]}") # Increased limit for better analysis

        logger.info(f"Blood report analysis successful: {len(analysis.get('issues', []))} issues found")
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

    # 2. AI GENERATION - COMPREHENSIVE NUTRITION PLANNING ENGINE WITH PRECISE CALCULATIONS
    system_prompt = f"""You are a **nutrition planning engine** for a health and fitness web platform.
Your task is to generate **goal-oriented, medically-aware, and outcome-driven diet plans** with PRECISE, CALCULATED nutrition targets and clear explanations.

---

### 🔸 USER PROFILE
- **Name:** {profile.name}
- **Age:** {profile.age} years, **Gender:** {profile.gender}
- **Current Stats:** {profile.height_cm}cm, {profile.weight_kg}kg
- **Goal:** {profile.goal}
- **Goal Pace:** {profile.goal_pace} (conservative/balanced/rapid)
- **Diet Preference:** {profile.diet_pref}
- **Region:** {profile.region}
- **Medical Conditions:** {profile.medical_manual if profile.medical_manual else "None"}

---

### 🔸 CRITICAL: CALCULATE PERSONALIZED METRICS (DO NOT USE TEMPLATES!)

You MUST calculate the following based on the user's **actual stats, age, gender, and goal**. NO generic ranges!

#### STEP 1: Calculate BMR (Basal Metabolic Rate)
Use Mifflin-St Jeor Formula:
- **Men:** BMR = (10 × weight_kg) + (6.25 × height_cm) - (5 × age) + 5
- **Women:** BMR = (10 × weight_kg) + (6.25 × height_cm) - (5 × age) - 161

For this user:
- Gender: {profile.gender}
- Weight: {profile.weight_kg}kg
- Height: {profile.height_cm}cm
- Age: {profile.age}

**Calculate their exact BMR now.**

#### STEP 2: Estimate TDEE (Total Daily Energy Expenditure)
**CRITICAL: Since activity level is NOT explicitly provided, use CONSERVATIVE estimates!**

Activity multipliers (reference):
- Sedentary (office job, minimal movement): BMR × 1.2
- Light activity (light walks, standing): BMR × 1.3-1.4
- Moderate (regular exercise 3-4x/week): BMR × 1.5-1.55
- Active (intense training 5-6x/week): BMR × 1.65-1.75

**DEFAULT ASSUMPTION (be conservative):**
- **Age < 60:** Use BMR × 1.3-1.4 (light activity) - DO NOT assume moderate!
- **Age 60+:** Use BMR × 1.2 (sedentary for safety)

**IMPORTANT FOR EXPLANATIONS:**
- DO NOT state a precise TDEE number (e.g., "your TDEE is 2100 kcal")
- Instead use: "estimated maintenance calories" or "maintenance range of X-Y kcal"
- This accounts for individual variation in daily movement

#### STEP 3: Adjust Calories Based on Goal AND Goal Pace
Goal: {profile.goal}
Goal Pace: {profile.goal_pace}

**CRITICAL: Use the goal_pace to determine calorie deficit/surplus!**

**For Weight Loss:**
- **Conservative:** ~15-20% deficit from estimated maintenance = ~0.25-0.5kg/week loss
- **Balanced:** ~20-25% deficit from estimated maintenance = ~0.5-0.75kg/week loss
- **Rapid:** ~25-30% deficit from estimated maintenance = ~0.75-1kg/week loss
- **Safety Floor:** Never go below 1200 kcal for women, 1500 kcal for men

**For Muscle Gain:**
- **Conservative:** +250-300 kcal surplus (lean gains)
- **Balanced:** +300-400 kcal surplus (steady progress)
- **Rapid:** +400-500 kcal surplus (faster but more fat)

**For Weight Gain:**
- **Conservative:** +300-400 kcal
- **Balanced:** +400-500 kcal
- **Rapid:** +500-600 kcal

**For Balanced Diet / Maintenance:**
- Calories = estimated maintenance (ignore goal_pace)

**For Medical Conditions:**
- Calories = estimated maintenance - 200-300 kcal (mild deficit, ignore goal_pace)

**CALCULATION VALIDATION (CRITICAL - MUST FOLLOW):**
1. Calculate BMR using Mifflin-St Jeor
2. Estimate TDEE range = BMR × 1.3 to BMR × 1.4 (or 1.2 for 60+)
3. Take the MIDPOINT of TDEE range for calculations
4. Apply deficit/surplus based on goal_pace
5. Round to nearest 50 kcal
6. Create a 50-80 kcal range around the target

**Example calculation for 29M, 83kg, 177cm, Weight Loss, Balanced:**
- BMR = (10 × 83) + (6.25 × 177) - (5 × 29) + 5 = 1836 kcal
- TDEE range = 1836 × 1.3 to 1836 × 1.4 = 2387-2570 kcal
- Midpoint = 2479 kcal (call this "estimated maintenance")
- Balanced deficit (22.5%) = 2479 - 557 = 1922 kcal
- Final target: **1900-1950 kcal**

**In explanation, say:**
"Your estimated maintenance calories are around 2400-2550 kcal. For balanced weight loss, we're applying a moderate deficit to target 0.5-0.75kg per week."
OR if you want to avoid stating TDEE:
"Based on your BMR and typical activity, we've designed a calibrated deficit for steady, sustainable fat loss of 0.5-0.75kg per week."

**NEVER state exact TDEE if it creates math inconsistency!**

#### STEP 4: Calculate Protein Based on Goal, Goal Pace, and Body Weight
**CRITICAL: Use SUSTAINABLE, ACHIEVABLE protein ranges - NOT athlete-level defaults!**

User Stats: {profile.weight_kg}kg, {profile.age}y, Goal: {profile.goal}, Pace: {profile.goal_pace}

**REFINED PROTEIN GUIDELINES (more realistic for general population):**

**For Weight Loss:**
- **Conservative:** 1.4-1.6g per kg bodyweight (adequate muscle preservation, easier adherence)
- **Balanced:** 1.6-1.8g per kg bodyweight (good muscle preservation, sustainable)
- **Rapid:** 1.7-1.9g per kg bodyweight (higher end for aggressive deficit, conditional on training)

**For Muscle Gain:**
- **Conservative:** 1.6-1.8g per kg bodyweight (lean gains, no bloat)
- **Balanced:** 1.7-1.9g per kg bodyweight (optimal for most lifters)
- **Rapid:** 1.8-2.0g per kg bodyweight (only if training 5-6x/week)

**For Weight Gain (general):**
- **Conservative:** 1.4-1.6g per kg
- **Balanced:** 1.5-1.7g per kg
- **Rapid:** 1.6-1.8g per kg

**For Balanced Diet / Maintenance:**
- **Age < 60:** 1.2-1.5g per kg bodyweight (health-focused, not performance)
- **Age 60+:** 0.9-1.1g per kg bodyweight (reduce kidney stress, adequate for muscle maintenance)
- Ignore goal_pace for maintenance

**For Medical Conditions:**
- 1.0-1.3g per kg (unless kidney issues, then 0.8-1.0g per kg)

**CALCULATION RULES:**
1. Calculate: weight × lower_multiplier and weight × higher_multiplier
2. Round to nearest 5g
3. Keep range tight: 10-20g difference max
4. Final output example: "120-135g" NOT "120-160g"

**Example for 83kg male, weight loss, balanced:**
- Lower: 83 × 1.6 = 133g → round to **130g**
- Upper: 83 × 1.8 = 149g → round to **150g**
- Final: **130-150g protein**

**For this specific user:** {profile.weight_kg}kg, {profile.age}y, {profile.goal}, {profile.goal_pace}
→ Calculate using the appropriate multiplier range above

---

### 🔸 STEP 5: MEDICAL CONDITIONS & DIETARY ADJUSTMENTS

**User's Medical Conditions:** {profile.medical_manual if profile.medical_manual else "None"}

**CRITICAL: If user has medical conditions, you MUST adapt the diet plan accordingly!**

**Condition-Specific Dietary Adjustments:**

**1. Diabetes / Pre-diabetes / High HbA1c:**
- ✅ Focus on LOW GI carbs: whole grains, millets, oats, brown rice
- ✅ Increase fiber intake: vegetables, legumes, whole fruits (not juice)
- ✅ Protein with every meal to stabilize blood sugar
- ❌ AVOID: White rice, maida products, refined sugar, sugary drinks, fruit juices
- ❌ LIMIT: Potatoes, white bread, processed foods
- 📊 Carb distribution: Spread across meals, avoid large carb loads
- **Meal timing:** Never skip meals, eat every 3-4 hours

**2. Thyroid Issues (Hypo/Hyper):**
- **For Hypothyroid:**
  - ✅ Increase: Iodine-rich foods (iodized salt, fish, dairy)
  - ✅ Include: Selenium (Brazil nuts, eggs, fish), Zinc (pumpkin seeds, chickpeas)
  - ❌ LIMIT: Raw cruciferous vegetables in excess (cabbage, cauliflower, broccoli - cook them)
  - ❌ AVOID: Soy products in large amounts (can interfere with medication)
- **For Hyperthyroid:**
  - ✅ Focus on: Calcium-rich foods, anti-inflammatory foods
  - ❌ LIMIT: Iodine intake, caffeine

**3. PCOD / PCOS:**
- ✅ Focus on: Low GI carbs, high fiber, anti-inflammatory foods
- ✅ Increase: Omega-3 (fatty fish, walnuts, flaxseeds), protein, cinnamon
- ✅ Include: Spearmint tea, whole grains, leafy greens
- ❌ AVOID: Refined carbs, sugar, processed foods, trans fats
- ❌ LIMIT: Dairy (can worsen symptoms for some), red meat
- **Key:** Manage insulin resistance through diet

**4. High Cholesterol:**
- ✅ Increase: Soluble fiber (oats, barley, apples, beans), omega-3 fatty acids
- ✅ Include: Nuts (almonds, walnuts), olive oil, fatty fish, garlic
- ❌ AVOID: Deep-fried foods, saturated fats, trans fats, processed meats
- ❌ LIMIT: Red meat, full-fat dairy, egg yolks (max 2-3 per week), coconut oil
- **Focus:** Replace saturated fats with unsaturated fats

**5. Hypertension (High Blood Pressure):**
- ✅ Focus on: DASH diet principles - fruits, vegetables, whole grains, low-fat dairy
- ✅ Increase: Potassium (bananas, spinach, beans), magnesium, fiber
- ✅ Include: Beetroot, garlic, dark chocolate (70%+), hibiscus tea
- ❌ CRITICAL: LOW SODIUM - avoid pickles, papad, packaged snacks, processed foods
- ❌ LIMIT: Salt to <5g per day (1 tsp), alcohol, caffeine
- **Cooking:** Use herbs and spices instead of salt

**6. Low Vitamin D (from blood report):**
- ✅ Increase: Fatty fish (salmon, mackerel), egg yolks, fortified milk, mushrooms (sun-exposed)
- ✅ Recommendation: 15-20 min sunlight exposure daily (before 10 AM or after 4 PM)
- Consider supplementation if levels <20 ng/mL

**7. Low Iron / Anemia:**
- ✅ Increase: Iron-rich foods (spinach, beetroot, dates, raisins, jaggery)
- ✅ For non-veg: Chicken liver, red meat (moderation)
- ✅ Include: Vitamin C with meals (lemon, amla, tomatoes) - enhances iron absorption
- ❌ AVOID: Tea/coffee with meals (inhibits iron absorption)

**8. High Triglycerides:**
- ✅ Increase: Omega-3, fiber, whole grains
- ❌ AVOID: Refined carbs, sugar, alcohol, fruit juices
- ❌ LIMIT: Simple carbs, saturated fats

**IMPLEMENTATION RULES:**
1. **Multiple Conditions:** If user has multiple conditions, prioritize adjustments that satisfy ALL conditions
   - Example: Diabetes + High Cholesterol → Low GI + Low saturated fat foods
2. **Meal Modifications:** Explicitly modify meal suggestions based on conditions
   - Example: If diabetic, replace white rice with brown rice/quinoa/millets
3. **Medical Adjustments Field:** Clearly state what was adjusted in the `medical_adjustments` field
4. **Safety:** If conditions conflict or are severe (e.g., kidney issues + high protein need), recommend conservative approach

**For this user's conditions:** {profile.medical_manual if profile.medical_manual else "None - proceed with standard recommendations"}
→ Apply the above adjustments to EVERY meal in the 7-day plan

---

### 🔸 OUTPUT REQUIREMENTS (VERY IMPORTANT)

Your output must be **structured, refined, and complete**, not just a 7-day food list.

#### 1️⃣ Goal Summary (Top Section)
Briefly restate:
- User's goal and why this plan supports it
- Current body stats and nutritional focus (calorie deficit/surplus, protein optimization, sugar control, etc.)
- Any medical adjustments made

#### 2️⃣ Daily Nutrition Targets (WITH EXPLANATIONS)
**CRITICAL:** Use EXACT calculated values AND provide COACH-LIKE, CONFIDENCE-BUILDING explanations!

**EXPLANATION TONE GUIDELINES:**
- Keep explanations SHORT (2-4 lines max)
- Use encouraging, coach-like language
- Avoid overly technical jargon
- Use conditional language where appropriate ("higher end if training hard")
- Emphasize sustainability and adherence over perfection
- Build trust by showing logic WITHOUT exposing math that can contradict

**You MUST include:**

**Calories:** Narrow 50-80 kcal range (e.g., "1900-1950 kcal")
**Calories Reasoning Examples:**

✅ GOOD (avoids stating exact TDEE when risky):
"Based on your age, stats, and typical activity, your estimated maintenance is around 2400-2550 kcal. For balanced weight loss, we've designed a calibrated deficit to support steady fat loss of 0.5-0.75kg per week."

✅ GOOD (doesn't mention TDEE at all):
"We've calculated a sustainable calorie target that creates a steady, manageable deficit for your goal. This supports 0.5-0.75kg loss per week without feeling overly restrictive."

✅ GOOD (for maintenance):
"These calories are designed to maintain your current weight while supporting your daily energy needs and overall health."

❌ BAD (exposes math inconsistency):
"Your TDEE is 2100 kcal. We're applying a 25% deficit = 1575 kcal." [But then shows 1900-1950 kcal - CONTRADICTORY!]

**Protein:** Tight 10-20g range (e.g., "130-150g")
**Protein Reasoning Examples:**

✅ GOOD (sustainable, not aggressive):
"This protein level (1.6-1.8g per kg) supports muscle preservation during your deficit while staying achievable with normal meals. Higher end if you're training regularly."

✅ GOOD (emphasizes benefits):
"Adequate protein helps preserve lean mass, keeps you satisfied between meals, and supports recovery. This range is sustainable for most people."

✅ GOOD (for maintenance):
"This moderate protein intake (1.2-1.5g per kg) supports overall health and muscle maintenance without being excessive."

❌ BAD (too technical or aggressive):
"At 2.0-2.2g per kg bodyweight, this maximizes muscle protein synthesis and minimizes catabolism during hypocaloric conditions."

**Other Required Fields:**
- **Carbs & Fats Guidance:** Brief, goal-appropriate
- **Medical Adjustments:** **CRITICAL - Be specific about what was changed!**
  - If NO conditions: "None - standard healthy diet approach"
  - If conditions exist: List specific modifications made
  - Example: "Diabetes: Using low GI carbs (brown rice, millets, oats). Avoiding white rice and refined flour. Including protein with every meal to stabilize blood sugar."
  - Example: "High Cholesterol: Limiting saturated fats, avoiding deep-fried foods. Using olive oil instead of ghee. Including oats and walnuts for heart health."
  - Example: "PCOD + Diabetes: Combined low GI approach with anti-inflammatory foods. Increased omega-3 and fiber. Limited dairy products."
- **Adherence Note:** "These targets can be adjusted by ±100 kcal based on your energy levels and how you feel. Consistency matters more than hitting exact numbers daily."

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

#### 5️⃣ Activity Guidance (CONDITIONAL - Be Specific!)
**CRITICAL:** Adapt to user's age and goal. NO generic "strength + cardio" for everyone!

**For Muscle Gain (Age < 50):**
- Frequency: 4-5 days/week
- Type: "Strength training with progressive overload"
- Tips: "Focus on compound movements, increase weights gradually"

**For Weight Loss (Age < 50):**
- Frequency: 5-6 days/week
- Type: "Cardio (walking/jogging) + light strength training"
- Tips: "Start with 30-min walks, gradually add intensity"

**For Balanced Diet / Maintenance (Age < 60):**
- Frequency: 3-4 days/week
- Type: "Walking, yoga, or light exercise"
- Tips: "Focus on consistency, not intensity"

**For Age 60+ (ANY goal):**
- Frequency: 3-4 days/week
- Type: "Light walking, stretching, chair exercises"
- Tips: "Prioritize joint health, avoid high-impact activities"

**For Diabetes / Medical:**
- Frequency: 5 days/week
- Type: "30-45 min walking after meals"
- Tips: "Monitor blood sugar before and after activity"

**Current user:** Age {profile.age}, Goal: {profile.goal}
**→ Choose the appropriate guidance above. DO NOT mix categories!**

#### 6️⃣ Expected Results (Mandatory - Be Realistic!)
**CRITICAL:** Base on ACTUAL calculated calories and user's stats. NO templates!

**Calculate weight change:**
- Calorie deficit of 500/day = 0.5kg/week
- Calorie deficit of 750/day = 0.75kg/week
- Surplus of 300-500/day = 0.25-0.5kg muscle gain/month

**For this user:**
Goal: {profile.goal}
- If weight loss: Calculate expected kg/week from calorie deficit
- If muscle gain: "0.25-0.5kg gain per month" (realistic muscle)
- If balanced diet: "Maintenance - no significant weight change"

**Visible changes:** Adapt to age!
- Age < 40: "Visible in 3-4 weeks"
- Age 40-60: "Visible in 4-6 weeks"
- Age 60+: "Visible in 6-8 weeks"

**Milestones:** Calculate based on weekly change × weeks
Example: 0.5kg/week × 4 weeks = 2kg in 30 days (NOT generic "3-4kg")

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

### 🔸 FINAL ENFORCEMENT: REAL EXAMPLES TO FOLLOW

**Example 1: 68-year-old Woman, 60kg, 160cm, Balanced Diet (Maintenance)**
- BMR = (10 × 60) + (6.25 × 160) - (5 × 68) - 161 = 1139 kcal
- TDEE (sedentary, age 60+) = 1139 × 1.2 = 1367 kcal
- Goal: Balanced/Maintenance → Calories = **"1350-1400 kcal"**
- Protein (age 60+, maintenance) = 0.9-1.1g/kg = 60 × 0.9 to 60 × 1.1 = **"55-65g"**
- Activity: "Light walking, stretching, chair exercises"

**Example 2: 25-year-old Man, 75kg, 175cm, Muscle Gain, Balanced**
- BMR = (10 × 75) + (6.25 × 175) - (5 × 25) + 5 = 1719 kcal
- TDEE range = 1719 × 1.3 to 1719 × 1.4 = 2235-2407 kcal
- Midpoint = 2321 kcal
- Balanced surplus (+350 kcal) = 2321 + 350 = 2671 kcal
- Final: **"2650-2700 kcal"**
- Protein (1.7-1.9g/kg) = 75 × 1.7 to 75 × 1.9 = **"128-143g"**
- Activity: "Strength training with progressive overload, 4-5 days/week"

**Example 3: 40-year-old Woman, 70kg, 165cm, Weight Loss, Balanced**
- BMR = (10 × 70) + (6.25 × 165) - (5 × 40) - 161 = 1370 kcal
- TDEE range = 1370 × 1.3 to 1370 × 1.4 = 1781-1918 kcal
- Midpoint = 1850 kcal (estimated maintenance)
- Balanced deficit (22.5%) = 1850 - 416 = 1434 kcal
- Final: **"1400-1450 kcal"**
- Protein (1.6-1.8g/kg) = 70 × 1.6 to 70 × 1.8 = **"110-125g"**

**FINAL VALIDATION CHECKLIST (USE THIS BEFORE GENERATING OUTPUT):**
1. ✅ Did I calculate BMR using the correct formula?
2. ✅ Did I use CONSERVATIVE TDEE (1.3-1.4×BMR, or 1.2 for 60+)?
3. ✅ Did I apply the correct deficit/surplus % for the goal_pace?
4. ✅ Is my final calorie range 50-80 kcal wide (not 200+)?
5. ✅ Does my calories_reasoning match the math (or avoid stating exact numbers)?
6. ✅ Did I use SUSTAINABLE protein multipliers (NOT 2.0+ for everyone)?
7. ✅ Is my protein range 10-20g wide (not 30+)?
8. ✅ Is my protein_reasoning coach-like and encouraging (not technical)?
9. ✅ Did I include the adherence note?
10. ✅ Will users TRUST this output (no contradictions)?

**→ NOW Calculate for {profile.name}: {profile.age}y, {profile.gender}, {profile.weight_kg}kg, {profile.height_cm}cm, {profile.goal}, {profile.goal_pace}**

---

### 🔸 REQUIRED JSON OUTPUT FORMAT

**CRITICAL:** Replace ALL template values with CALCULATED values!

{{
  "summary": "Personalized 2-3 sentence summary with actual stats and adjustments",
  "daily_targets": {{
    "calories": "[CALCULATED narrow 50-80 kcal range, e.g., 1900-1950 kcal]",
    "calories_reasoning": "[MANDATORY: Coach-like explanation, 2-4 lines. Choose GOOD examples from guidelines above. AVOID stating exact TDEE if it creates math contradictions. Example: 'Based on your age, stats, and typical activity, your estimated maintenance is around 2400-2550 kcal. For balanced weight loss, we've designed a calibrated deficit to support steady fat loss of 0.5-0.75kg per week.']",
    "protein": "[CALCULATED tight 10-20g range using SUSTAINABLE multipliers, e.g., 130-150g]",
    "protein_reasoning": "[MANDATORY: Coach-like, 2-3 lines. Use GOOD examples from guidelines. AVOID athlete-level justifications. Example: 'This protein level (1.6-1.8g per kg) supports muscle preservation during your deficit while staying achievable with normal meals. Higher end if you're training regularly.']",
    "carbs_guidance": "[Adapt based on medical conditions. Example: 'Moderate whole grains' OR 'Low GI carbs (brown rice, oats, millets)' if diabetic]",
    "fats_guidance": "[Adapt based on medical conditions. Example: 'Healthy fats from nuts, olive oil' OR 'Limited saturated fats, focus on omega-3' if high cholesterol]",
    "medical_adjustments": "[CRITICAL: If conditions exist, be specific! Example: 'Diabetes: Using low GI carbs, avoiding refined flour and white rice. Including protein with every meal.' OR 'None - standard healthy approach' if no conditions]",
    "adherence_note": "These targets can be adjusted by ±100 kcal based on your energy levels and how you feel. Consistency matters more than hitting exact numbers daily."
  }},
  "days": [
    {{
      "day": 1,
      "early_morning": "[Include ONLY if beneficial for goal]",
      "breakfast": "Specific dish with portions",
      "mid_morning": "[Include ONLY if needed]",
      "lunch": "Specific dish with portions",
      "evening_snack": "Specific dish",
      "dinner": "Specific dish with portions",
      "before_bed": "[Include ONLY if helpful]"
    }},
    ...continue for 7 days with variety
  ],
  "activity_guidance": {{
    "training_frequency": "[CHOOSE from age-goal matrix above]",
    "type": "[SPECIFIC to user's age and goal]",
    "beginner_tips": "[RELEVANT to chosen activity type]"
  }},
  "expected_results": {{
    "weekly_weight_change": "[CALCULATED from calorie deficit/surplus]",
    "visible_changes": "[ADAPT to user's age from guidelines]",
    "30_day_milestone": "[CALCULATED: weekly_change × 4]",
    "60_day_milestone": "[CALCULATED: weekly_change × 8]",
    "90_day_milestone": "[CALCULATED: weekly_change × 12]",
    "plateau_warning": "[Relevant warning or 'N/A' if maintenance]"
  }},
  "important_notes": {{
    "hydration": "[Adapt to user's weight: ~0.03L per kg bodyweight]",
    "sleep": "Aim for 7-8 hours of quality sleep",
    "medical_disclaimer": "[ONLY if user has medical conditions, else generic]",
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
    Retrieves a diet plan and converts it into a consolidated grocery list with:
    - Price estimates and budget analysis
    - Seasonal availability warnings
    - Smart swap suggestions
    - Multi-store price comparison
    - Bulk buying optimization
    - Expiry date warnings
    - Shopping route optimization
    """
    # 1. Fetch Plan
    plan = db.query(DietPlan).filter(DietPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    # 2. Get current month and week for seasonal/trend analysis
    current_month = datetime.now().strftime("%B")
    current_week = datetime.now().isocalendar()[1]

    # 3. MINIMAL Grocery Intelligence - Force valid JSON
    system_prompt = """
Generate a grocery shopping list from the meal plan.

CRITICAL: Output MUST be valid JSON. Keep all text simple with no special chars.

Use these prices:
Vegetables Rs 50, Fruits Rs 80, Dairy Rs 100, Grains Rs 60, Protein Rs 200

Output this exact structure:
{
  "categories": [
    {"name": "Vegetables", "items": [{"name": "Tomato", "quantity": "1kg", "display": "1kg Tomato", "estimated_price": 50, "price_range": "Rs 40-60", "seasonal_status": "available", "seasonal_warning": null, "alternative": null, "used_in_meals": ["Day 1"]}]}
  ],
  "budget_analysis": {"total_estimated": 1200, "breakdown": {"vegetables": 300, "dairy_proteins": 400, "grains_pulses": 300, "spices": 100, "other": 100}, "budget_level": "moderate", "savings_potential": 200, "smart_swaps": [{"original": "Paneer", "alternative": "Tofu", "savings": 50, "reason": "Cheaper protein"}]},
  "seasonal_summary": {"out_of_season_count": 0, "warnings": [], "message": "All items available"},
  "shopping_tips": ["Buy from local market", "Buy in bulk"]
}

RULES:
- Keep ALL text under 30 chars
- Use only letters numbers and spaces
- NO commas apostrophes or special punctuation in any text field
- Use null not empty string
"""

    user_prompt = f"Meal plan: {plan.plan_json[:2000]}"

    try:
        logger.info(f"Generating enhanced grocery list for plan {plan_id}")
        grocery_data = call_ai_json(system_prompt, user_prompt)

        # Validate response structure
        if "error" in grocery_data:
            logger.error(f"AI grocery generation failed: {grocery_data}")
            raise HTTPException(status_code=500, detail="Failed to generate grocery list")

        # 4. Save Update
        plan.grocery_json = json.dumps(grocery_data)
        db.commit()

        logger.info(f"Enhanced grocery list generated successfully. Total: ₹{grocery_data.get('budget_analysis', {}).get('total_estimated', 0)}")
        return grocery_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating grocery list: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate grocery list")

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

# --- SMART MEAL SWAP ENDPOINT ---
class SwapMealRequest(BaseModel):
    meal_text: str  # e.g., "2 Rotis + 1 cup Dal + Sabzi"
    meal_type: str  # breakfast, lunch, dinner, snack
    user_profile: dict  # {diet_pref, region, goal, medical_manual, age, gender, weight_kg}

@app.post("/swap-meal")
async def swap_meal(request: SwapMealRequest):
    """
    Generate smart meal alternatives based on user's profile and dietary preferences.
    Returns macro-matched, contextually relevant substitutions.
    """
    try:
        # Build context-aware prompt for AI
        swap_prompt = f"""You are a nutrition substitution engine. Generate 3 smart meal alternatives.

**Original Meal:** {request.meal_text}
**Meal Type:** {request.meal_type}
**User Profile:**
- Diet Preference: {request.user_profile.get('diet_pref', 'vegetarian')}
- Region: {request.user_profile.get('region', 'North Indian')}
- Goal: {request.user_profile.get('goal', 'balanced diet')}
- Age: {request.user_profile.get('age', 30)}, Gender: {request.user_profile.get('gender', 'male')}
- Medical: {request.user_profile.get('medical_manual', 'None')}

**Rules:**
1. Match macros (protein/carbs/fats) as closely as possible
2. Respect diet preference (veg/non-veg/vegan)
3. Use {request.user_profile.get('region', 'North Indian')} regional ingredients primarily
4. Consider goal: {request.user_profile.get('goal', 'balanced diet')}
5. If medical conditions exist, avoid trigger foods

**Output Format (JSON):**
{{
  "alternatives": [
    {{
      "name": "Alternative 1 Name",
      "description": "2 items + 1 item",
      "macro_match": "Similar protein (25g), Lower carbs",
      "why": "Better for weight loss goal",
      "diet_tag": "vegetarian"
    }},
    {{
      "name": "Alternative 2 Name",
      "description": "Detailed meal description",
      "macro_match": "Higher protein (30g)",
      "why": "Good for muscle recovery",
      "diet_tag": "non-vegetarian"
    }},
    {{
      "name": "Alternative 3 Name",
      "description": "Another option",
      "macro_match": "Same calories, more fiber",
      "why": "Easier to prepare",
      "diet_tag": "vegan"
    }}
  ]
}}

Provide ONLY the JSON, no other text."""

        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a nutrition substitution expert. Output ONLY valid JSON."},
                {"role": "user", "content": swap_prompt}
            ],
            temperature=0.7,
            response_format={"type": "json_object"}
        )

        swap_data = json.loads(response.choices[0].message.content)

        # Filter alternatives based on diet preference
        diet_pref = request.user_profile.get('diet_pref', '').lower()
        filtered_alternatives = []

        for alt in swap_data.get('alternatives', []):
            alt_diet = alt.get('diet_tag', '').lower()

            # Filter logic
            if diet_pref == 'vegetarian' and alt_diet in ['vegetarian', 'vegan']:
                filtered_alternatives.append(alt)
            elif diet_pref == 'vegan' and alt_diet == 'vegan':
                filtered_alternatives.append(alt)
            elif diet_pref in ['non-vegetarian', 'eggetarian']:
                # Non-veg can have everything
                filtered_alternatives.append(alt)
            else:
                # Default: include all vegetarian options
                if alt_diet in ['vegetarian', 'vegan']:
                    filtered_alternatives.append(alt)

        # If no matches after filtering, return all (safety fallback)
        if not filtered_alternatives:
            filtered_alternatives = swap_data.get('alternatives', [])

        return {
            "success": True,
            "original_meal": request.meal_text,
            "alternatives": filtered_alternatives[:3]  # Max 3 alternatives
        }

    except Exception as e:
        logger.error(f"Meal swap error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate alternatives: {str(e)}")

# --- RECIPE VIDEO ENDPOINT ---
class RecipeVideoRequest(BaseModel):
    meal_name: str  # e.g., "Palak Paneer", "Oats with Banana"
    language: Optional[str] = "any"  # "hindi", "english", "any"

@app.post("/get-recipe-video")
async def get_recipe_video(request: RecipeVideoRequest):
    """
    Fetches top cooking video from YouTube for a given meal.
    Uses caching to avoid repeated API calls.
    """
    try:
        # Check cache first
        cache_key = f"{request.meal_name.lower()}_{request.language}"
        if cache_key in recipe_video_cache:
            logger.info(f"Cache hit for recipe: {request.meal_name}")
            return recipe_video_cache[cache_key]

        # If no YouTube API key, return search URL instead
        if not YOUTUBE_API_KEY or YOUTUBE_API_KEY.strip() == "":
            logger.warning("YouTube API key not configured, returning search link")
            search_query = f"{request.meal_name} recipe easy indian"
            return {
                "success": True,
                "video_id": None,
                "title": f"Search: {request.meal_name} Recipe",
                "channel": "YouTube",
                "thumbnail": "https://via.placeholder.com/480x360?text=No+API+Key",
                "url": f"https://www.youtube.com/results?search_query={search_query.replace(' ', '+')}",
                "fallback": True
            }
        
        logger.info(f"Fetching YouTube video for: {request.meal_name} (language: {request.language})")

        # Build search query
        language_hint = ""
        if request.language == "hindi":
            language_hint = " hindi"
        elif request.language == "english":
            language_hint = " english"

        search_query = f"{request.meal_name} recipe easy indian{language_hint}"

        # Call YouTube Data API
        youtube_url = "https://www.googleapis.com/youtube/v3/search"
        params = {
            "part": "snippet",
            "q": search_query,
            "type": "video",
            "videoDuration": "medium",  # 4-20 minutes
            "maxResults": 3,
            "key": YOUTUBE_API_KEY,
            "relevanceLanguage": "hi" if request.language == "hindi" else "en",
            "order": "relevance"
        }

        response = requests.get(youtube_url, params=params, timeout=10)

        if response.status_code != 200:
            error_data = response.json() if response.content else {}
            error_message = error_data.get("error", {}).get("message", "Unknown error")
            logger.error(f"YouTube API error: {response.status_code} - {error_message}")
            
            # If API key is invalid or missing, return fallback
            if response.status_code == 403 or "API key" in error_message:
                logger.warning("YouTube API key invalid or quota exceeded, using fallback")
                search_query = f"{request.meal_name} recipe easy indian"
                return {
                    "success": True,
                    "video_id": None,
                    "title": f"Search: {request.meal_name} Recipe",
                    "channel": "YouTube",
                    "thumbnail": "https://via.placeholder.com/480x360?text=API+Key+Issue",
                    "url": f"https://www.youtube.com/results?search_query={search_query.replace(' ', '+')}",
                    "fallback": True
                }
            
            raise HTTPException(status_code=500, detail=f"YouTube API request failed: {error_message}")

        data = response.json()

        if not data.get("items"):
            logger.info(f"No videos found for: {request.meal_name}")
            return {
                "success": False,
                "message": "No recipe videos found",
                "fallback": True,
                "url": f"https://www.youtube.com/results?search_query={search_query.replace(' ', '+')}"
            }

        # Get first video
        video = data["items"][0]
        video_id = video["id"]["videoId"]
        snippet = video["snippet"]

        result = {
            "success": True,
            "video_id": video_id,
            "title": snippet["title"],
            "channel": snippet["channelTitle"],
            "thumbnail": snippet["thumbnails"]["high"]["url"],
            "url": f"https://www.youtube.com/watch?v={video_id}",
            "embed_url": f"https://www.youtube.com/embed/{video_id}",
            "fallback": False
        }

        # Cache the result
        recipe_video_cache[cache_key] = result
        
        logger.info(f"Successfully fetched YouTube video: {result['title']} (ID: {video_id})")

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Recipe video error: {e}")
        # Fallback to search link
        search_query = f"{request.meal_name} recipe easy indian"
        return {
            "success": True,
            "video_id": None,
            "title": f"Search: {request.meal_name} Recipe",
            "channel": "YouTube",
            "thumbnail": "https://via.placeholder.com/480x360?text=Error",
            "url": f"https://www.youtube.com/results?search_query={search_query.replace(' ', '+')}",
            "fallback": True,
            "error": str(e)
        }

# --- BARCODE SCANNER ENDPOINT ---

class BarcodeScanRequest(BaseModel):
    barcode: str
    user_diet_preference: Optional[str] = None
    user_goal: Optional[str] = None

@app.post("/scan-barcode")
async def scan_barcode(request: BarcodeScanRequest):
    """
    Scan a product barcode and get nutrition info + diet compatibility.
    Uses Open Food Facts API (free, 2M+ products, strong Indian coverage).
    """
    try:
        barcode = request.barcode.strip()
        
        # Validate barcode format
        if not barcode or len(barcode) < 8:
            return {
                "success": False,
                "error": "Invalid barcode format. Please scan a valid product barcode."
            }

        logger.info(f"Looking up barcode: {barcode}")

        # 1. Look up product in Open Food Facts
        openfoodfacts_url = f"https://world.openfoodfacts.org/api/v2/product/{barcode}.json"

        response = requests.get(openfoodfacts_url, timeout=10)
        
        if response.status_code != 200:
            logger.warning(f"Open Food Facts API error: {response.status_code}")
            return {
                "success": False,
                "error": "Unable to connect to product database. Please try again."
            }
        
        data = response.json()

        if data.get("status") != 1:
            logger.info(f"Product not found for barcode: {barcode}")
            return {
                "success": False,
                "error": "Product not found in database. Try another barcode or use 'Search by Name' instead."
            }

        product = data.get("product", {})

        # 2. Extract product info
        product_name = product.get("product_name", "Unknown Product")
        brands = product.get("brands", "Unknown Brand")
        quantity = product.get("quantity", "N/A")

        # 3. Extract nutrition (per 100g)
        nutriments = product.get("nutriments", {})
        nutrition_info = {
            "calories": nutriments.get("energy-kcal_100g", nutriments.get("energy-kcal", 0)),
            "protein": nutriments.get("proteins_100g", nutriments.get("proteins", 0)),
            "carbs": nutriments.get("carbohydrates_100g", nutriments.get("carbohydrates", 0)),
            "sugar": nutriments.get("sugars_100g", nutriments.get("sugars", 0)),
            "fat": nutriments.get("fat_100g", nutriments.get("fat", 0)),
            "saturated_fat": nutriments.get("saturated-fat_100g", nutriments.get("saturated-fat", 0)),
            "fiber": nutriments.get("fiber_100g", nutriments.get("fiber", 0)),
            "sodium": nutriments.get("sodium_100g", nutriments.get("sodium", 0)),
        }

        # 4. Check ingredients for diet compatibility
        ingredients_text = product.get("ingredients_text", "").lower()
        allergens = product.get("allergens", "").lower()

        # Diet flags
        is_vegetarian = "non-vegetarian" not in product.get("labels", "").lower()
        is_vegan = "vegan" in product.get("labels", "").lower()

        # Check for non-veg ingredients
        non_veg_keywords = ["chicken", "mutton", "beef", "pork", "fish", "egg", "meat", "gelatin"]
        contains_non_veg = any(keyword in ingredients_text for keyword in non_veg_keywords)

        if contains_non_veg:
            is_vegetarian = False
            is_vegan = False

        # 5. AI Analysis - Diet Compatibility & Alternatives
        ai_prompt = f"""
You are a nutrition expert analyzing a scanned product for an Indian user.

Product: {product_name} by {brands}
Quantity: {quantity}

Nutrition (per 100g):
- Calories: {nutrition_info['calories']} kcal
- Protein: {nutrition_info['protein']}g
- Carbs: {nutrition_info['carbs']}g (Sugar: {nutrition_info['sugar']}g)
- Fat: {nutrition_info['fat']}g (Saturated: {nutrition_info['saturated_fat']}g)
- Fiber: {nutrition_info['fiber']}g
- Sodium: {nutrition_info['sodium']}mg

User Profile:
- Diet Preference: {request.user_diet_preference or 'Not specified'}
- Goal: {request.user_goal or 'Not specified'}

Ingredients: {ingredients_text[:200] if ingredients_text else 'Not available'}

Task:
1. Analyze if this product fits the user's diet preference and goal (2-3 sentences max)
2. Suggest 3 healthier Indian alternatives (brands available in India)
3. Focus on popular Indian brands like: Amul, Mother Dairy, Britannia, Parle, Nestle India, ITC, Haldiram's, MTR, etc.

Format:
COMPATIBILITY: [Your analysis with emoji ✅ or ❌]

ALTERNATIVES:
1. [Product name] - [Why it's better]
2. [Product name] - [Why it's better]
3. [Product name] - [Why it's better]
"""

        ai_response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": ai_prompt}],
            temperature=0.7,
            max_tokens=300
        )

        ai_analysis = ai_response.choices[0].message.content.strip()

        # Parse AI response
        compatibility = ""
        alternatives = []

        if "COMPATIBILITY:" in ai_analysis:
            parts = ai_analysis.split("ALTERNATIVES:")
            compatibility = parts[0].replace("COMPATIBILITY:", "").strip()

            if len(parts) > 1:
                alt_text = parts[1].strip()
                alt_lines = [line.strip() for line in alt_text.split("\n") if line.strip() and line.strip()[0].isdigit()]
                alternatives = [line[3:].strip() if line[2] == '.' else line[2:].strip() for line in alt_lines[:3]]

        # 6. Return formatted response
        return {
            "success": True,
            "product": {
                "name": product_name,
                "brand": brands,
                "quantity": quantity,
                "image_url": product.get("image_url", ""),
                "barcode": barcode
            },
            "nutrition": nutrition_info,
            "diet_info": {
                "is_vegetarian": is_vegetarian,
                "is_vegan": is_vegan,
                "allergens": allergens if allergens else "None listed"
            },
            "ai_analysis": {
                "compatibility": compatibility,
                "alternatives": alternatives
            },
            "raw_ingredients": ingredients_text[:300] if ingredients_text else "Not available"
        }

    except requests.Timeout:
        logger.error("Barcode lookup timeout")
        return {
            "success": False,
            "error": "Request timeout. Please try again or use 'Search by Name' instead."
        }
    except requests.RequestException as e:
        logger.error(f"Network error during barcode lookup: {e}")
        return {
            "success": False,
            "error": "Network error. Please check your connection and try again."
        }
    except Exception as e:
        logger.error(f"Barcode scan error: {e}")
        return {
            "success": False,
            "error": f"Error scanning barcode: {str(e)}. Please try 'Search by Name' instead."
        }

# --- PRODUCT SEARCH ENDPOINT (for products without barcode) ---

class ProductSearchRequest(BaseModel):
    search_query: str
    user_diet_preference: Optional[str] = None
    user_goal: Optional[str] = None

@app.post("/search-product")
async def search_product(request: ProductSearchRequest):
    """
    Search for products by name in Open Food Facts database.
    For products without barcodes or when barcode scan fails.
    """
    try:
        search_query = request.search_query.strip()

        # Search Open Food Facts by product name
        search_url = "https://world.openfoodfacts.org/cgi/search.pl"
        params = {
            "search_terms": search_query,
            "search_simple": 1,
            "action": "process",
            "json": 1,
            "page_size": 10,
            "fields": "product_name,brands,code,image_url,nutriments,quantity"
        }

        response = requests.get(search_url, params=params, timeout=10)
        data = response.json()

        if not data.get("products") or len(data["products"]) == 0:
            return {
                "success": False,
                "error": "No products found. Try a different search term."
            }

        # Return list of matching products
        results = []
        for product in data["products"][:5]:  # Top 5 results
            results.append({
                "name": product.get("product_name", "Unknown"),
                "brand": product.get("brands", "Unknown"),
                "barcode": product.get("code", ""),
                "image_url": product.get("image_url", ""),
                "quantity": product.get("quantity", "N/A")
            })

        return {
            "success": True,
            "results": results
        }

    except requests.Timeout:
        return {
            "success": False,
            "error": "Search timeout. Please try again."
        }
    except Exception as e:
        logger.error(f"Product search error: {e}")
        return {
            "success": False,
            "error": f"Error searching products: {str(e)}"
        }

# --- 7. RUN INSTRUCTION ---
if __name__ == "__main__":
    import uvicorn
    # This block allows you to run `python main.py` directly for testing
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)