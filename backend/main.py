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

#### STEP 2: Calculate TDEE (Total Daily Energy Expenditure)
BMR × Activity multiplier:
- Sedentary (office job): BMR × 1.2
- Light activity: BMR × 1.375
- Moderate (3-5 days exercise): BMR × 1.55
- Active (6-7 days): BMR × 1.725

**Assume moderate activity unless user is 60+ (then use sedentary).**

#### STEP 3: Adjust Calories Based on Goal
Goal: {profile.goal}

**Weight Loss:**
- Calories = TDEE - 500 (for 0.5kg/week loss)
- Aggressive: TDEE - 750 (for 0.75kg/week)
- Never go below 1200 for women, 1500 for men

**Muscle Gain:**
- Calories = TDEE + 300-500 (surplus for muscle)

**Balanced Diet / Maintenance:**
- Calories = TDEE (maintenance)

**Diabetes / Medical:**
- Calories = TDEE - 300 (mild deficit for health)

**Provide a 100-150 calorie range, NOT "1800-2000"!**
Example: If TDEE = 2100, weight loss = "1550-1650 kcal"

#### STEP 4: Calculate Protein
**DO NOT use 80-100g for everyone!**

Goal-based protein:
- **Weight Loss:** 1.6-2.0g per kg bodyweight (preserve muscle)
- **Muscle Gain:** 1.8-2.2g per kg bodyweight
- **Balanced Diet (Age < 60):** 1.0-1.2g per kg
- **Balanced Diet (Age 60+):** 0.8-1.0g per kg (lower kidney stress)
- **Diabetes:** 1.2-1.5g per kg

For this user ({profile.weight_kg}kg, {profile.age}y, Goal: {profile.goal}):
**Calculate exact protein in grams.**

Example: 68-year-old woman, 60kg, balanced diet → 48-60g protein (NOT 80-100g!)

---

### 🔸 OUTPUT REQUIREMENTS (VERY IMPORTANT)

Your output must be **structured, refined, and complete**, not just a 7-day food list.

#### 1️⃣ Goal Summary (Top Section)
Briefly restate:
- User's goal and why this plan supports it
- Current body stats and nutritional focus (calorie deficit/surplus, protein optimization, sugar control, etc.)
- Any medical adjustments made

#### 2️⃣ Daily Nutrition Targets
**CRITICAL:** Use the EXACT calculated values above. NO templates!
- Target daily calories (narrow 100-150 kcal range based on calculations)
- Daily protein intake (exact grams based on formula)
- Carbohydrates and fats (high-level guidance, adapt to goal)
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

**Example 1: 68-year-old Woman, 60kg, 160cm, Balanced Diet**
- BMR = (10 × 60) + (6.25 × 160) - (5 × 68) - 161 = 1139 kcal
- TDEE (sedentary) = 1139 × 1.2 = 1367 kcal
- Goal: Balanced → Calories = TDEE = **"1300-1400 kcal"** (NOT 1800-2000!)
- Protein (age 60+, balanced) = 0.8-1.0g/kg = **"48-60g"** (NOT 80-100g!)
- Activity: "Light walking, stretching, chair exercises" (NOT "strength training + cardio"!)

**Example 2: 25-year-old Man, 75kg, 175cm, Muscle Gain**
- BMR = (10 × 75) + (6.25 × 175) - (5 × 25) + 5 = 1719 kcal
- TDEE (moderate) = 1719 × 1.55 = 2664 kcal
- Goal: Muscle Gain → Calories = TDEE + 400 = **"2950-3100 kcal"**
- Protein = 1.8-2.2g/kg = **"135-165g"**
- Activity: "Strength training with progressive overload, 4-5 days/week"

**Example 3: 40-year-old Woman, 70kg, 165cm, Weight Loss**
- BMR = (10 × 70) + (6.25 × 165) - (5 × 40) - 161 = 1370 kcal
- TDEE (moderate) = 1370 × 1.55 = 2124 kcal
- Goal: Weight Loss → Calories = TDEE - 500 = **"1550-1650 kcal"**
- Protein = 1.6-2.0g/kg = **"112-140g"**
- Activity: "Cardio (walking/jogging) + light strength, 5-6 days/week"

**→ FOLLOW THIS PATTERN! Calculate for {profile.name}: {profile.age}y, {profile.gender}, {profile.weight_kg}kg, {profile.height_cm}cm, {profile.goal}**

---

### 🔸 REQUIRED JSON OUTPUT FORMAT

**CRITICAL:** Replace ALL template values with CALCULATED values!

{{
  "summary": "Personalized 2-3 sentence summary with actual stats and adjustments",
  "daily_targets": {{
    "calories": "[CALCULATED VALUE from above, e.g., 1550-1650 kcal]",
    "protein": "[CALCULATED VALUE, e.g., 112-140g]",
    "carbs_guidance": "Moderate, focus on whole grains" OR "Low GI carbs" if diabetic,
    "fats_guidance": "Healthy fats from nuts, ghee",
    "medical_adjustments": "[Specific to user's conditions, or 'None' if healthy]"
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

# --- 7. RUN INSTRUCTION ---
if __name__ == "__main__":
    import uvicorn
    # This block allows you to run `python main.py` directly for testing
    uvicorn.run(app, host="0.0.0.0", port=8000)