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
from pydantic import BaseModel, Field

# Chat Agent
from chat_agent import get_chat_agent

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

# Initialize AI Client with timeout settings for better performance
client = OpenAI(
    api_key=OPENAI_API_KEY,
    timeout=120.0,  # 2 minute timeout (prevent hanging)
    max_retries=2   # Retry on transient errors
)

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
    age: int = Field(..., ge=5, le=120, description="Age must be between 5 and 120 years")
    weight: float = Field(..., ge=20.0, le=300.0, description="Weight must be between 20 and 300 kg")
    height: float = Field(..., ge=50.0, le=250.0, description="Height must be between 50 and 250 cm")
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

class ChatRequest(BaseModel):
    session_id: str  # user_id or plan_id for conversation tracking
    message: str
    context: Optional[dict] = None  # Optional user context (diet plan, goals, etc.)

class ChatResponse(BaseModel):
    success: bool
    response: str
    suggestions: Optional[List[str]] = None

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

# --- AGENTIC AI MODELS ---

class WeeklyCheckIn(Base):
    """Stores weekly user progress for tracking and adaptive recommendations"""
    __tablename__ = "weekly_checkins"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    diet_plan_id = Column(Integer, ForeignKey("diet_plans.id"), nullable=False)

    # Week tracking
    week_number = Column(Integer, nullable=False)  # Week 1, 2, 3, etc.
    checkin_date = Column(DateTime, default=datetime.utcnow)

    # Progress metrics
    current_weight_kg = Column(Float, nullable=False)
    weight_change_kg = Column(Float, nullable=True)  # From previous week

    # Adherence tracking (0-100%)
    diet_adherence_percent = Column(Integer, default=70)  # How well they followed the plan
    exercise_adherence_percent = Column(Integer, default=50)  # Exercise consistency

    # User feedback
    energy_level = Column(String, nullable=True)  # low, moderate, high
    hunger_level = Column(String, nullable=True)  # low, moderate, high
    challenges = Column(Text, nullable=True)  # Free text: what was difficult
    notes = Column(Text, nullable=True)  # Additional user notes

    # AI-generated insights (stored after analysis)
    ai_insights_json = Column(Text, nullable=True)  # JSON: {plateau, recommendations, adjustments}

    # Calorie adjustments (for adaptive agent)
    adjusted_calories = Column(Integer, nullable=True)  # New calorie target if adjusted
    adjustment_reason = Column(String, nullable=True)  # plateau, too_fast, too_slow

    created_at = Column(DateTime, default=datetime.utcnow)

class ProgressSnapshot(Base):
    """Daily/weekly aggregated metrics for trend analysis"""
    __tablename__ = "progress_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    diet_plan_id = Column(Integer, ForeignKey("diet_plans.id"), nullable=False)

    snapshot_date = Column(DateTime, default=datetime.utcnow)

    # Weight tracking
    weight_kg = Column(Float, nullable=False)
    weight_trend = Column(String, nullable=True)  # losing, gaining, stable

    # Calculated metrics
    total_weight_change_kg = Column(Float, nullable=True)  # Since plan start
    avg_weekly_change_kg = Column(Float, nullable=True)  # Average per week
    weeks_on_plan = Column(Integer, default=1)

    # Expected vs actual (for adaptive agent)
    expected_weight_kg = Column(Float, nullable=True)  # Based on original plan
    variance_kg = Column(Float, nullable=True)  # actual - expected

    # Flags for agent triggers
    is_plateau = Column(Boolean, default=False)  # No change for 2+ weeks
    is_off_track = Column(Boolean, default=False)  # >15% variance from expected
    needs_adjustment = Column(Boolean, default=False)  # Agent should intervene

    created_at = Column(DateTime, default=datetime.utcnow)

class CalorieAdjustmentLog(Base):
    """Tracks all calorie adjustments made by the adaptive agent"""
    __tablename__ = "calorie_adjustments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    diet_plan_id = Column(Integer, ForeignKey("diet_plans.id"), nullable=False)

    adjustment_date = Column(DateTime, default=datetime.utcnow)

    # Adjustment details
    previous_calories = Column(Integer, nullable=False)
    new_calories = Column(Integer, nullable=False)
    adjustment_amount = Column(Integer, nullable=False)  # +/- kcal

    # Reason and context
    reason = Column(String, nullable=False)  # plateau, slow_progress, too_fast, user_request
    trigger_metric = Column(String, nullable=True)  # weight_change, adherence, energy_level

    # AI explanation
    ai_explanation = Column(Text, nullable=True)  # Human-readable reason

    # Effectiveness tracking (filled after 1-2 weeks)
    was_effective = Column(Boolean, nullable=True)  # Did it work?
    effectiveness_notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

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
    target_weight_kg: float  # Target Weight Goal - MANDATORY
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

def call_ai_json(system_prompt: str, user_prompt: str, max_retries: int = 2, max_tokens: int = 4000):
    """
    Helper to call OpenAI with JSON mode enforcement and retry logic.
    Optimized for performance with configurable max_tokens.
    """
    start_time = time.time()
    for attempt in range(max_retries):
        try:
            logger.info(f"Calling AI API (attempt {attempt + 1}/{max_retries}, max_tokens={max_tokens})")
            api_start = time.time()
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.7,
                max_tokens=max_tokens  # Increased for complete responses
            )
            api_elapsed = time.time() - api_start
            logger.info(f"OpenAI API response received in {api_elapsed:.2f}s")
            content = response.choices[0].message.content
            result = json.loads(content)
            elapsed = time.time() - start_time
            total_tokens = response.usage.total_tokens if hasattr(response, 'usage') and response.usage else 'N/A'
            logger.info(f"AI API call successful in {elapsed:.2f}s (tokens: {total_tokens}, API time: {api_elapsed:.2f}s)")
            return result
        except Exception as e:
            logger.error(f"AI Error (attempt {attempt + 1}): {e}")
            if attempt == max_retries - 1:
                # Fallback JSON if all retries fail
                return {"error": "AI generation failed", "details": str(e)}
            time.sleep(0.5)  # Reduced wait time
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
- **Target Weight:** {profile.target_weight_kg}kg (Weight Change: {profile.target_weight_kg - profile.weight_kg:+.1f}kg)
- **Goal:** {profile.goal}
- **Goal Pace:** {profile.goal_pace} (conservative/balanced/rapid)
- **Diet Preference:** {profile.diet_pref}
- **Region:** {profile.region}
- **Medical Conditions:** {profile.medical_manual if profile.medical_manual else "None"}

---

### 🔸 TARGET WEIGHT GOAL SYSTEM (MANDATORY - NEW CORE FEATURE)

**CRITICAL:** The user has specified a TARGET WEIGHT of **{profile.target_weight_kg}kg** (current: {profile.weight_kg}kg).

**Weight Change Required:** {abs(profile.target_weight_kg - profile.weight_kg):.1f}kg {"loss" if profile.target_weight_kg < profile.weight_kg else "gain"}

**This target weight is a HARD CONSTRAINT and PRIMARY CONTROL VARIABLE. ALL calculations must:**
1. ✅ Be designed to reach this target weight safely
2. ✅ Calculate realistic timeline based on age and goal_pace
3. ✅ Adjust weekly rate if target is too aggressive
4. ✅ Maintain nutrition quality (calories, protein, macros) while reaching target
5. ✅ Clearly explain timeline and expectations in Goal Summary

**TIMELINE CALCULATION (INTERNAL - DO NOT EXPOSE FORMULAS):**

Calculate safe weekly rate:
- **Age < 60:**
  - Weight Loss: conservative=0.25-0.4kg/week, balanced=0.5-0.75kg/week, rapid=0.75-1kg/week
  - Weight Gain: conservative=0.2-0.3kg/week, balanced=0.25-0.5kg/week, rapid=0.4-0.6kg/week
- **Age 60-64:**
  - Weight Loss: conservative=0.25-0.4kg/week, balanced=0.4-0.6kg/week (no rapid)
  - Weight Gain: conservative=0.2-0.3kg/week, balanced=0.3-0.5kg/week (no rapid)
- **Age 65+:**
  - Weight Loss: conservative ONLY=0.2-0.4kg/week
  - Weight Gain: conservative ONLY=0.15-0.3kg/week

Calculate: `estimated_weeks = weight_change / weekly_rate`

**If estimated timeline is unrealistic (>52 weeks), automatically:**
- Adjust to a sustainable longer timeframe
- Use conservative weekly rate
- Explain in Goal Summary: "Your target is achievable over X months with a safe, sustainable approach"

**VALIDATION BEFORE PROCEEDING:**
- Is target weight medically safe? (BMI 16-35 range)
- Is weekly rate appropriate for age?
- Have I calculated a realistic timeline?
- Does calorie deficit/surplus align with weekly rate?

---

### 🔸 CRITICAL: CALCULATE PERSONALIZED METRICS (DO NOT USE TEMPLATES!)

You MUST calculate the following based on the user's **actual stats, age, gender, target weight, and goal**. NO generic ranges!

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
- **Age 60-64:** Use BMR × 1.25-1.35 (reduced activity assumption)
- **Age 65+:** Use BMR × 1.2-1.25 (sedentary for safety)

**IMPORTANT FOR EXPLANATIONS:**
- DO NOT state a precise TDEE number (e.g., "your TDEE is 2100 kcal")
- Instead use: "estimated maintenance calories" or "maintenance range of X-Y kcal"
- This accounts for individual variation in daily movement

#### STEP 3: Adjust Calories Based on Goal, Goal Pace, AND AGE
Goal: {profile.goal}
Goal Pace: {profile.goal_pace}
Age: {profile.age}

**CRITICAL AGE-BASED SAFETY GUARDRAILS:**

**For users AGE 65+ (MANDATORY RULES):**
- DISABLE "rapid" pace for weight loss - force conservative approach
- Minimum calories = BMR × 1.15 (NEVER at or below BMR)
- Maximum deficit = 10-15% (gentle, stress-aware)
- Prioritize muscle preservation, energy, and recovery over speed
- Explanation MUST emphasize safety: "At this age, maintaining strength and energy is prioritized over rapid fat loss"

**For users AGE 60-64:**
- Allow conservative and balanced paces only
- Minimum calories = BMR × 1.10
- Maximum deficit = 15-20%
- Gentle messaging about sustainable progress

**For users AGE < 60:**
- All paces available
- Minimum calories = 1200 kcal (women) or 1500 kcal (men)
- Follow standard deficit/surplus rules below

---

**DEFICIT/SURPLUS RULES BY AGE GROUP:**

**For Weight Loss (Age < 60):**
- **Conservative:** ~15-20% deficit from estimated maintenance = ~0.25-0.5kg/week loss
- **Balanced:** ~20-25% deficit from estimated maintenance = ~0.5-0.75kg/week loss
- **Rapid:** ~30-35% deficit from estimated maintenance = ~0.75-1kg/week loss (max)

**For Weight Loss (Age 60-64):**
- **Conservative:** ~10-15% deficit = ~0.25-0.4kg/week loss
- **Balanced:** ~15-20% deficit = ~0.4-0.6kg/week loss
- **Rapid:** NOT ALLOWED - default to balanced

**For Weight Loss (Age 65+):**
- **Conservative ONLY:** ~10-15% deficit = ~0.2-0.4kg/week loss
- **Balanced/Rapid:** NOT ALLOWED - default to conservative
- Minimum = BMR × 1.15 (non-negotiable safety floor)

**For Muscle Gain (All Ages):**
- **Conservative:** +250-300 kcal surplus (lean gains)
- **Balanced:** +300-400 kcal surplus (steady progress)
- **Rapid:** +400-500 kcal surplus (age < 60 only)

**For Weight Gain (All Ages):**
- **Conservative:** +300-400 kcal
- **Balanced:** +400-500 kcal
- **Rapid:** +500-600 kcal (age < 60 only)

**For Balanced Diet / Maintenance (All Ages):**
- Calories = estimated maintenance (ignore goal_pace)

**For Medical Conditions (All Ages):**
- Calories = estimated maintenance - 10-15% (mild deficit, conservative)
- Never below BMR × 1.10

**CALCULATION VALIDATION (CRITICAL - MUST FOLLOW):**
1. Calculate BMR using Mifflin-St Jeor
2. Apply AGE-BASED safety check FIRST
3. Estimate TDEE range based on age multiplier
4. Take the MIDPOINT of TDEE range for calculations
5. Apply deficit/surplus based on goal_pace AND age restrictions
6. Ensure final calories ≥ BMR × (1.15 for 65+, 1.10 for 60-64, or standard floor)
7. Round to nearest 50 kcal
8. Create a 50-80 kcal range around the target

**Example (29M, 83kg, 177cm, Weight Loss, Balanced):**
BMR = 1836 kcal → Age < 60 → TDEE range = 2387-2570 kcal → Midpoint 2479 → Balanced deficit (22.5%) = 1922 → Final: **1900-1950 kcal**

**Example (68F, 60kg, 160cm, Weight Loss, Balanced):**
BMR = 1139 kcal → Age 65+ → FORCED conservative → TDEE range = 1367-1424 kcal → Midpoint 1396 → Conservative deficit (12.5%) = 1221 → Safety floor check: BMR × 1.15 = 1310 → Final: **1300-1350 kcal**
**Explanation:** "At your age, we've set a gentle calorie level that prioritizes maintaining strength and energy while supporting gradual fat loss. This conservative approach helps with recovery and adherence."

#### STEP 4: Calculate Protein Based on Age, Goal, Goal Pace, and Body Weight
**CRITICAL: Use AGE-APPROPRIATE, EVIDENCE-BASED protein ranges!**

User Stats: {profile.weight_kg}kg, {profile.age}y, Goal: {profile.goal}, Pace: {profile.goal_pace}

**AGE-BASED PROTEIN GUIDELINES (evidence-based, medically sound):**

**FOR ADULTS AGE < 65:**

**Weight Loss:**
- **Conservative:** 1.4-1.6g per kg bodyweight (muscle preservation during deficit)
- **Balanced:** 1.6-1.8g per kg bodyweight (optimal muscle retention)
- **Rapid:** 1.8-2.0g per kg bodyweight (only if training 3+ times/week)

**Muscle Gain:**
- **Conservative:** 1.6-1.8g per kg bodyweight (sustainable lean gains)
- **Balanced:** 1.7-1.9g per kg bodyweight (good for regular training)
- **Rapid:** 1.8-2.0g per kg bodyweight (active training 5-6x/week)

**Weight Gain (general):**
- **Conservative:** 1.2-1.4g per kg bodyweight
- **Balanced:** 1.4-1.6g per kg bodyweight
- **Rapid:** 1.6-1.8g per kg bodyweight

**Maintenance / Balanced Diet:**
- 1.2-1.5g per kg bodyweight (health-focused)

**Medical Conditions:**
- 1.0-1.3g per kg (unless kidney issues, then 0.8-1.0g per kg)

---

**FOR ADULTS AGE 65+ (CRITICAL - DIFFERENT RULES):**

**Weight Loss (conservative only):**
- 0.9-1.1g per kg bodyweight
- Prioritize digestibility and muscle preservation over aggression
- NEVER exceed 1.2g/kg unless under medical supervision

**Maintenance / Balanced Diet:**
- 0.9-1.1g per kg bodyweight
- Adequate for muscle maintenance and sarcopenia prevention
- Higher end if regularly active

**Weight Gain / Muscle Gain:**
- 1.0-1.2g per kg bodyweight (max)
- Focus on high-quality, easily digestible protein sources

**Medical Conditions:**
- 0.8-1.0g per kg (kidney-friendly, gentle)
- Conservative to reduce metabolic stress

**EXPLANATION REQUIREMENTS FOR AGE 65+:**
- Must emphasize digestibility and achievability
- Use phrases like: "This moderate protein level supports muscle maintenance without overwhelming digestion"
- Avoid aggressive language like "maximize protein" or "high protein"

---

**FOR ADULTS AGE 60-64 (TRANSITION GROUP):**

Use intermediate ranges between <60 and 65+ groups:
- Weight loss: 1.2-1.4g per kg
- Maintenance: 1.0-1.3g per kg
- Muscle gain: 1.4-1.6g per kg

---

**CALCULATION RULES:**
1. CHECK AGE FIRST - apply appropriate age bracket
2. Calculate: weight × lower_multiplier and weight × higher_multiplier
3. Round to nearest 5g
4. Keep range tight: 10-20g difference max
5. Final output example: "120-135g" NOT "120-160g"

**EXPLANATION STYLE BY AGE:**
- **Age < 60:** "This protein level (X-Yg/kg) supports [goal] while remaining achievable with normal meals. Higher end if training regularly."
- **Age 60-64:** "This moderate protein level supports [goal] while being gentle on digestion and sustainable long-term."
- **Age 65+:** "This protein level supports muscle maintenance and strength without overwhelming digestion. Quality over quantity at this stage."

**Example (83kg, age 29, weight loss, balanced):**
Age < 65 → 83 × 1.6 = 133g, 83 × 1.8 = 149g → Round to **130-145g protein**

**Example (60kg, age 68, weight loss, conservative):**
Age 65+ → 60 × 0.9 = 54g, 60 × 1.1 = 66g → Round to **55-65g protein**
**Explanation:** "This moderate protein level (0.9-1.1g/kg) supports muscle maintenance during gradual fat loss without overwhelming digestion. Focus on high-quality sources like dal, yogurt, and lean proteins."

**For this user ({profile.weight_kg}kg, {profile.age}y, {profile.goal}, {profile.goal_pace}):** Apply appropriate age-based multiplier range above.

---

### 🔸 STEP 5: MEDICAL CONDITIONS & DIETARY ADJUSTMENTS

**User's Medical Conditions:** {profile.medical_manual if profile.medical_manual else "None"}

**CRITICAL: If user has medical conditions, you MUST adapt the diet plan accordingly!**

**Condition-Specific Dietary Adjustments:**

**1. Diabetes/Pre-diabetes/High HbA1c:** Low GI carbs (whole grains, millets, oats, brown rice). High fiber, protein with every meal. AVOID: White rice, maida, refined sugar, juices. LIMIT: Potatoes, white bread. Meal timing: Every 3-4 hours.

**2. Thyroid Issues:** Hypothyroid: Iodine (salt, fish, dairy), Selenium (Brazil nuts, eggs), Zinc. LIMIT raw cruciferous, AVOID excess soy. Hyperthyroid: Calcium-rich, anti-inflammatory. LIMIT iodine, caffeine.

**3. PCOD/PCOS:** Low GI carbs, high fiber, anti-inflammatory. Increase omega-3, protein, cinnamon. AVOID refined carbs, sugar, trans fats. LIMIT dairy, red meat. Manage insulin resistance.

**4. High Cholesterol:** Soluble fiber (oats, barley, apples, beans), omega-3, nuts, olive oil, fatty fish, garlic. AVOID deep-fried, saturated/trans fats, processed meats. LIMIT red meat, full-fat dairy, egg yolks (max 2-3/week).

**5. Hypertension:** DASH principles - fruits, vegetables, whole grains, low-fat dairy. Increase potassium, magnesium, fiber. Include beetroot, garlic. CRITICAL: LOW SODIUM - avoid pickles, papad, packaged snacks. LIMIT salt <5g/day, alcohol, caffeine.

**6. Low Vitamin D:** Fatty fish, egg yolks, fortified milk, sun-exposed mushrooms. 15-20 min sunlight daily (before 10 AM or after 4 PM). Consider supplements if <20 ng/mL.

**7. Low Iron/Anemia:** Iron-rich foods (spinach, beetroot, dates, raisins, jaggery). Non-veg: Chicken liver, red meat (moderation). Include Vitamin C with meals (lemon, amla, tomatoes). AVOID tea/coffee with meals.

**8. High Triglycerides:** Increase omega-3, fiber, whole grains. AVOID refined carbs, sugar, alcohol, juices. LIMIT simple carbs, saturated fats.

**IMPLEMENTATION RULES:**
1. **Multiple Conditions:** If user has multiple conditions, prioritize adjustments that satisfy ALL conditions
   - Example: Diabetes + High Cholesterol → Low GI + Low saturated fat foods
2. **Meal Modifications:** Explicitly modify meal suggestions based on conditions
   - Example: If diabetic, replace white rice with brown rice/quinoa/millets
3. **Medical Adjustments Field:** Clearly state what was adjusted in the `medical_adjustments` field
4. **Safety:** If conditions conflict or are severe (e.g., kidney issues + high protein need), recommend conservative approach

**For this user's conditions:** {profile.medical_manual if profile.medical_manual else "None - proceed with standard recommendations"}

**CRITICAL IMPLEMENTATION CHECKLIST:**
If user has medical conditions, you MUST:
✓ Modify EVERY meal in all 7 days based on condition-specific rules above
✓ Replace problematic ingredients (e.g., white rice → brown rice for diabetes)
✓ Add condition-appropriate foods (e.g., oats for high cholesterol)
✓ Avoid trigger foods completely (e.g., no pickles for hypertension)
✓ Mention adjustments clearly in medical_adjustments field
✓ Ensure meals are still delicious and culturally appropriate

VERIFICATION: Before finalizing output, ask yourself:
- Did I check EVERY meal against medical conditions?
- Did I replace ALL problematic ingredients?
- Is medical_adjustments field specific and accurate?
- Would a nutritionist approve this for the user's condition?

---

### 🔸 OUTPUT REQUIREMENTS (VERY IMPORTANT)

Your output must be **structured, refined, and complete**, not just a 7-day food list.

#### 1️⃣ Goal Summary (MANDATORY - Include Target Weight Timeline!)
**CRITICAL:** ALWAYS start with the user's name: "{profile.name}, you're aiming to..."

**You MUST include:**
- Personalized greeting with user's name
- Current weight → Target weight (weight change required)
- Estimated timeline to reach target (in weeks/months based on safe weekly rate)
- Why this plan supports reaching the target
- Current body stats and nutritional focus (calorie deficit/surplus, protein optimization, sugar control, etc.)
- Any medical adjustments made

**Example formats:**
- "{profile.name}, you're aiming to move from 83kg to 75kg (8kg loss). Based on your age and balanced approach, this can be achieved safely over 12-16 weeks."
- "{profile.name}, your goal is to reach 65kg from 58kg (7kg gain). With a conservative approach suitable for your age, expect to reach this target in 20-25 weeks."
- "{profile.name}, targeting 52kg from 45kg (7kg gain). At age 68, we'll take a gentle approach over 24-28 weeks to ensure sustainable, healthy progress."

**DO NOT:**
- Start without the user's name
- Skip mentioning current → target weight
- Provide vague timelines ("eventually", "in time")
- Give unrealistic timelines (2kg loss in 1 week)

#### 2️⃣ Daily Nutrition Targets (WITH EXPLANATIONS)
**CRITICAL:** Use EXACT calculated values AND provide COACH-LIKE, CONFIDENCE-BUILDING explanations!

**EXPLANATION TONE GUIDELINES (AGE-SENSITIVE):**
- Keep explanations SHORT (2-4 lines max)
- Use encouraging, coach-like language
- Avoid overly technical jargon
- Use conditional language ("higher end if training regularly")
- Emphasize sustainability and adherence over perfection
- Build trust by showing logic WITHOUT exposing contradictory math
- **FOR AGE 65+:** Emphasize safety, strength maintenance, energy, and recovery. Use gentle, reassuring language. NEVER use aggressive terms.

**You MUST include:**

**Calories:** Narrow 50-80 kcal range (e.g., "1900-1950 kcal")

**Calories Reasoning (AGE-ADAPTIVE):**
- **Age < 60:** "Based on your stats and typical daily activity, estimated maintenance is around X-Y kcal. This [pace] approach targets [expected loss/gain rate]."
- **Age 60-64:** "We've set a sustainable calorie level that supports your goal while maintaining energy. At this stage, gradual progress is optimal for long-term success."
- **Age 65+:** "At your age, we've calibrated calories to prioritize maintaining strength, energy, and recovery while supporting gradual [goal]. This gentle approach helps with adherence and overall well-being."
- NEVER state exact TDEE if it creates numerical contradictions
- Use ranges: "estimated maintenance around X-Y kcal" or "maintenance range of X-Y kcal"

**Protein:** Tight 10-20g range (e.g., "130-145g" or "55-65g")

**Protein Reasoning (AGE-ADAPTIVE):**
- **Age < 60:** "This protein level (X-Yg/kg) supports [muscle preservation/growth] during your [goal] while remaining achievable with normal meals. Higher end applies if you're training regularly."
- **Age 60-64:** "This moderate protein level (X-Yg/kg) supports your [goal] while being gentle on digestion and sustainable long-term. Focus on high-quality sources."
- **Age 65+:** "This protein level (X-Yg/kg) supports muscle maintenance and strength without overwhelming digestion. At this stage, we prioritize quality protein sources over quantity."
- Mention g/kg range for transparency
- Emphasize achievability and digestibility for elderly users
- NEVER use aggressive language like "maximize protein" for 65+

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

#### 5️⃣ Activity Guidance (CONDITIONAL - Age-Appropriate & Stress-Aware!)
**CRITICAL:** Adapt to user's age and goal. NO generic "strength + cardio" for everyone!

**For Muscle Gain (Age < 50):**
- Frequency: 4-5 days/week
- Type: "Strength training with progressive overload"
- Tips: "Focus on compound movements, increase weights gradually. Allow 48h recovery between sessions."

**For Muscle Gain (Age 50-64):**
- Frequency: 3-4 days/week
- Type: "Moderate strength training with emphasis on form"
- Tips: "Prioritize movement quality over heavy weights. Include longer warm-ups and recovery periods."

**For Muscle Gain (Age 65+):**
- Frequency: 2-3 days/week
- Type: "Light resistance training, bodyweight exercises, resistance bands"
- Tips: "Focus on maintaining muscle mass and functional strength. Avoid heavy loads. Prioritize balance and mobility."

**For Weight Loss (Age < 50):**
- Frequency: 5-6 days/week
- Type: "Cardio (walking/jogging) + light strength training"
- Tips: "Start with 30-min walks, gradually add intensity. Include 2-3 strength sessions weekly."

**For Weight Loss (Age 50-64):**
- Frequency: 4-5 days/week
- Type: "Moderate walking, light cardio, gentle strength work"
- Tips: "Focus on consistency over intensity. Include rest days for recovery. Listen to your body."

**For Weight Loss (Age 65+):**
- Frequency: 3-4 days/week
- Type: "Light walking, chair exercises, gentle stretching"
- Tips: "Prioritize daily movement over intense sessions. Walking after meals helps digestion and blood sugar. Avoid high-impact activities."

**For Balanced Diet / Maintenance (Age < 60):**
- Frequency: 3-4 days/week
- Type: "Walking, yoga, or light exercise"
- Tips: "Focus on consistency, not intensity. Build sustainable habits."

**For Balanced Diet / Maintenance (Age 60+):**
- Frequency: 3-4 days/week
- Type: "Light walking, stretching, balance exercises, yoga"
- Tips: "Prioritize joint health, flexibility, and balance. Daily gentle movement is better than occasional intense exercise."

**For Diabetes / Medical (Any Age):**
- Frequency: 5 days/week
- Type: "30-45 min walking after meals"
- Tips: "Monitor blood sugar before and after activity. Consistent timing helps blood sugar regulation."

**Current user:** Age {profile.age}, Goal: {profile.goal}
**→ Choose the appropriate guidance above based on BOTH age AND goal. DO NOT mix categories!**

#### 6️⃣ Expected Results (MANDATORY - Target Weight Focused!)
**CRITICAL:** All results must be tied to reaching the TARGET WEIGHT of {profile.target_weight_kg}kg.

**User's Target:**
- Current: {profile.weight_kg}kg
- Target: {profile.target_weight_kg}kg
- Change needed: {abs(profile.target_weight_kg - profile.weight_kg):.1f}kg {"loss" if profile.target_weight_kg < profile.weight_kg else "gain"}
- Age: {profile.age}
- Pace: {profile.goal_pace}

**Calculate weight change (AGE-SENSITIVE & TARGET-ALIGNED):**
- Calorie deficit of 500/day = ~0.5kg/week (younger adults)
- Calorie deficit of 300-400/day = ~0.3-0.4kg/week (60-64 age group)
- Calorie deficit of 200-300/day = ~0.2-0.3kg/week (65+ age group)
- Surplus of 300-500/day = 0.25-0.5kg muscle gain/month

**You MUST calculate:**
1. Weekly weight change rate (based on calorie deficit/surplus)
2. Estimated weeks to reach target = weight_change / weekly_rate
3. When they'll reach their target weight
4. Reassessment points along the journey

**If weight loss:**
- **Age < 60:** Calculate expected kg/week from actual calorie deficit
- **Age 60-64:** Expect slower but sustainable progress (~0.3-0.4kg/week max)
- **Age 65+:** Expect gentle progress (~0.2-0.3kg/week). Emphasize "This gradual pace prioritizes muscle preservation and energy levels."

**If muscle gain:**
- **Age < 60:** "0.25-0.5kg gain per month" (realistic muscle)
- **Age 60+:** "0.2-0.3kg gain per month with strength training" (slower but sustainable)

**If balanced diet:** "Maintenance - no significant weight change. Focus on energy, strength, and overall health."

**Visible changes (AGE-ADAPTED):**
- **Age < 40:** "Visible changes in 3-4 weeks"
- **Age 40-60:** "Visible changes in 4-6 weeks"
- **Age 60-64:** "Visible changes in 5-7 weeks"
- **Age 65+:** "Visible changes in 6-8 weeks. Progress may be gradual but sustainable."

**Milestones (CALCULATED, NOT GENERIC):**
- **30-day milestone:** Calculate based on weekly change × 4 weeks
- **60-day milestone:** Calculate based on weekly change × 8 weeks
- **90-day milestone:** Calculate based on weekly change × 12 weeks
- Example for younger adult: 0.5kg/week × 4 = 2kg in 30 days
- Example for 65+: 0.25kg/week × 4 = 1kg in 30 days

**Plateau Warning (AGE-SENSITIVE):**
- **Age < 60:** "Progress may slow after 8-12 weeks. Adjust calories by 100-150 kcal if needed."
- **Age 60+:** "If progress stalls, focus on strength, energy, and overall health rather than aggressive adjustments."

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

### 🔸 CALCULATION EXAMPLES (Reference Only)

**Example 1 (68F, 60kg, 160cm, Maintenance):** BMR=1139 → TDEE=1367 (1.2×) → Calories: **1350-1400 kcal**, Protein: **55-65g** (0.9-1.1g/kg, age 60+)

**Example 2 (25M, 75kg, 175cm, Muscle Gain, Balanced):** BMR=1719 → TDEE=2321 (midpoint) → Surplus +350 → Calories: **2650-2700 kcal**, Protein: **128-143g** (1.7-1.9g/kg)

**Example 3 (40F, 70kg, 165cm, Weight Loss, Balanced):** BMR=1370 → TDEE=1850 (midpoint) → Deficit 22.5% → Calories: **1400-1450 kcal**, Protein: **85-100g** (1.2-1.4g/kg)

**VALIDATION:** BMR correct? TDEE conservative (1.3-1.4× or 1.2 for 60+)? Deficit/surplus matches goal_pace? Calories 50-80 kcal range? Protein 10-20g range, sustainable multipliers? Reasoning coach-like? Medical adjustments specific? No contradictions?

**→ NOW Calculate for {profile.name}: {profile.age}y, {profile.gender}, {profile.weight_kg}kg, {profile.height_cm}cm, {profile.goal}, {profile.goal_pace}**

---

### 🔸 REQUIRED JSON OUTPUT FORMAT

**CRITICAL:** Replace ALL template values with CALCULATED values!

{{
  "summary": "MUST start with personalized greeting: '{profile.name}, you're aiming to...' Then include: Current weight → Target weight. Estimated timeline (X weeks/months). Why plan supports this. Stats. Adjustments. Example: 'John, you're aiming to move from 83kg to 75kg (8kg loss). Based on your age and balanced approach, this can be achieved safely over 12-16 weeks. This plan uses a calibrated calorie deficit with optimized protein to preserve muscle while burning fat.'",
  "target_weight_goal": {{
    "current_weight": {profile.weight_kg},
    "target_weight": {profile.target_weight_kg},
    "weight_change_needed": "[CALCULATED: target - current, with +/- sign]",
    "estimated_weeks": "[CALCULATED: Based on safe weekly rate for age and pace]",
    "estimated_timeline": "[Human readable: '12-16 weeks' or '4-5 months']",
    "target_bmi": "[CALCULATED: BMI at target weight]",
    "safety_note": "[If timeline >6 months or age 65+, add reassuring note about sustainable approach]"
  }},
  "daily_targets": {{
    "calories": "[CALCULATED narrow 50-80 kcal range, e.g., 1900-1950 kcal]",
    "calories_reasoning": "[MANDATORY: Coach-like explanation, 2-4 lines. Choose GOOD examples from guidelines above. AVOID stating exact TDEE if it creates math contradictions. Example: 'Based on your age, stats, and typical activity, your estimated maintenance is around 2400-2550 kcal. For balanced weight loss, we've designed a calibrated deficit to support steady fat loss of 0.5-0.75kg per week.']",
    "protein": "[CALCULATED tight 10-20g range using SUSTAINABLE multipliers, e.g., 130-150g]",
    "protein_reasoning": "[MANDATORY: Coach-like, 2-3 lines. Use GOOD examples from guidelines. AVOID athlete-level justifications. Example: 'This protein level (1.2-1.4g per kg) supports muscle preservation during your deficit while staying achievable with normal meals. Higher end if you're training regularly.']",
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
    "weekly_weight_change": "[CALCULATED from calorie deficit/surplus, e.g., '0.5-0.75kg per week']",
    "target_achievement": "[When will they reach target weight? e.g., 'Expected to reach 75kg target in 12-16 weeks']",
    "visible_changes": "[ADAPT to user's age from guidelines]",
    "30_day_milestone": "[CALCULATED: weekly_change × 4, e.g., '2-3kg lighter, approximately 80-81kg']",
    "60_day_milestone": "[CALCULATED: weekly_change × 8, e.g., '4-6kg lighter, approximately 77-79kg']",
    "90_day_milestone": "[CALCULATED: weekly_change × 12, e.g., '6-9kg lighter, close to or at 75kg target']",
    "reassessment_note": "[When to adjust plan based on progress toward target]",
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

    # Optimized user prompt - concise but complete
    user_prompt = f"""Generate diet plan for {profile.name} ({profile.age}y, {profile.gender}, {profile.weight_kg}kg, {profile.height_cm}cm).
Goal: {profile.goal} ({profile.goal_pace} pace)
Diet: {profile.diet_pref}, Region: {profile.region}
Medical: {', '.join(profile.medical_manual) if profile.medical_manual else 'None'}
Output complete 7-day plan with calculated nutrition targets."""

    try:
        start_time = time.time()
        logger.info(f"Generating {profile.goal} plan for {profile.name}")
        # Use higher max_tokens for diet plan (needs complete 7-day plan with all details)
        diet_plan_json = call_ai_json(system_prompt, user_prompt, max_tokens=4000)
        elapsed = time.time() - start_time
        logger.info(f"Diet plan generation completed in {elapsed:.2f}s")

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

    # 3. SMART DYNAMIC Grocery Intelligence - Analyze diet plan specifics
    system_prompt = """
You are a grocery list generation AI for Indian households. Generate a SMART, BUDGET-CONSCIOUS shopping list from the meal plan.

CRITICAL: Output MUST be valid JSON. Keep all text simple with no special chars.

TASK: Analyze the 7-day meal plan and:
1. Extract ALL unique ingredients mentioned
2. Calculate REALISTIC weekly quantities based on actual meals (not generic estimates)
3. Price items based on Indian market rates and actual quantities needed
4. Identify budget optimization opportunities

PRICING GUIDELINES (Indian Market Rates - Adjust based on calculated quantities):

VEGETABLES & FRUITS:
- Leafy Greens (Spinach, Methi, etc.): Rs 20-30 per bunch/250g
- Common Veggies (Tomato, Onion, Potato, Capsicum): Rs 30-60 per kg
- Premium Veggies (Broccoli, Zucchini, Mushroom): Rs 80-150 per kg
- Seasonal Fruits (Banana, Apple, Papaya): Rs 40-80 per kg
- Premium Fruits (Berries, Avocado, Pomegranate): Rs 150-300 per kg

DAIRY & PROTEINS:
- Milk (1L): Rs 55-70
- Paneer (200-250g): Rs 80-100
- Curd/Yogurt (500g): Rs 40-60
- Eggs (1 dozen): Rs 70-90
- Chicken (1kg): Rs 180-220
- Fish (1kg): Rs 250-400 (varies by type)
- Tofu (200g): Rs 50-70

GRAINS & PULSES:
- Rice (1kg): Rs 50-80 (normal), Rs 100-150 (basmati)
- Wheat Flour/Atta (1kg): Rs 40-50
- Oats (500g): Rs 120-160
- Dal/Lentils (1kg): Rs 100-150
- Quinoa (500g): Rs 250-350

SPICES, OILS & CONDIMENTS:
- Cooking Oil (1L): Rs 150-200
- Ghee (500g): Rs 300-400
- Basic Spices (100g each): Rs 30-50
- Premium Spices (Saffron, Cardamom): Rs 100-500

OTHER:
- Nuts (100g): Rs 100-200
- Dry Fruits (100g): Rs 150-300
- Bread (1 loaf): Rs 40-50
- Protein Powder (1kg): Rs 1500-3000

SMART CALCULATION LOGIC:
1. Parse each meal and extract ingredients with context
2. Estimate realistic weekly quantities:
   - If "2 Rotis" appears 7 times → ~1.5kg atta needed
   - If "1 cup Dal" appears 5 times → ~500g dal needed
   - If "Paneer Sabzi" appears 2 times → ~300g paneer needed
3. Calculate prices: quantity × unit_price
4. Sum ALL individual item prices for total
5. Budget level: "low" if total < 800, "moderate" if 800-1500, "high" if > 1500
6. Find savings: suggest cheaper alternatives for expensive items

EXAMPLE ANALYSIS:
Meal: "2 Rotis + 1 cup Dal + Sabzi (Aloo Gobi)"
→ Extract: Wheat flour (for rotis), Dal, Potato, Cauliflower, Spices
→ Weekly quantity: If this meal repeats 3 times, you need portions accordingly

OUTPUT FORMAT (JSON):
{
  "categories": [
    {"name": "Vegetables", "items": [
      {"name": "Tomato", "quantity": "2kg", "display": "2kg Tomato", "estimated_price": 100, "price_range": "Rs 90-120", "seasonal_status": "available", "seasonal_warning": null, "alternative": null, "used_in_meals": ["Day 1 Lunch", "Day 3 Dinner", "Day 5 Lunch"]}
    ]},
    {"name": "Dairy and Proteins", "items": [
      {"name": "Milk", "quantity": "7L", "display": "7L Milk", "estimated_price": 420, "price_range": "Rs 385-490", "seasonal_status": "available", "seasonal_warning": null, "alternative": null, "used_in_meals": ["Daily breakfast"]}
    ]},
    {"name": "Grains and Pulses", "items": [
      {"name": "Wheat Flour", "quantity": "2kg", "display": "2kg Atta", "estimated_price": 90, "price_range": "Rs 80-100", "seasonal_status": "available", "seasonal_warning": null, "alternative": null, "used_in_meals": ["Rotis - Multiple days"]}
    ]},
    {"name": "Spices and Oils", "items": [
      {"name": "Cooking Oil", "quantity": "1L", "display": "1L Oil", "estimated_price": 180, "price_range": "Rs 150-200", "seasonal_status": "available", "seasonal_warning": null, "alternative": null, "used_in_meals": ["All cooking"]}
    ]}
  ],
  "budget_analysis": {
    "total_estimated": [MUST CALCULATE: exact sum of ALL item estimated_price values],
    "breakdown": {
      "vegetables": [CALCULATE: sum of vegetable category items],
      "dairy_proteins": [CALCULATE: sum of dairy and protein items],
      "grains_pulses": [CALCULATE: sum of grains and pulses],
      "spices": [CALCULATE: sum of spices/oils],
      "other": [CALCULATE: sum of other items]
    },
    "budget_level": "[CALCULATE: low if total < 800, moderate if 800-1500, high if > 1500]",
    "savings_potential": [CALCULATE: realistic savings amount if cheaper swaps exist, 0 otherwise],
    "smart_swaps": [{"original": "Basmati Rice", "alternative": "Regular Rice", "savings": 60, "reason": "Similar nutrition lower cost"}]
  },
  "seasonal_summary": {"out_of_season_count": 0, "warnings": [], "message": "All items in season"},
  "shopping_tips": ["Buy vegetables from local market for 20 percent savings", "Buy staples in bulk for 15 percent discount"]
}

CRITICAL RULES:
- Analyze ACTUAL meals in the plan, don't use generic templates
- Calculate quantities based on REAL consumption (e.g., if "2 Rotis" appear 14 times across week, estimate atta needed)
- Price each item realistically based on quantity
- Total MUST be exact sum of all items
- Keep text simple, no special characters
- Use null not empty string
- Smart swaps should be practical and culturally appropriate
"""

    # Optimize: Extract only meal data, not full plan structure
    try:
        plan_data = json.loads(plan.plan_json) if isinstance(plan.plan_json, str) else plan.plan_json
        # Extract only days array for grocery generation (most relevant)
        days_data = plan_data.get('days', [])
        meals_summary = json.dumps(days_data, ensure_ascii=False)[:2500]  # Increased but still limited
    except:
        meals_summary = plan.plan_json[:2000] if isinstance(plan.plan_json, str) else str(plan.plan_json)[:2000]
    
    user_prompt = f"Meal plan (7 days): {meals_summary}"

    try:
        start_time = time.time()
        logger.info(f"Generating enhanced grocery list for plan {plan_id}")
        # Grocery list needs fewer tokens (simpler structure)
        grocery_data = call_ai_json(system_prompt, user_prompt, max_tokens=3000)
        elapsed = time.time() - start_time
        logger.info(f"Grocery list generation completed in {elapsed:.2f}s")

        # Validate response structure
        if "error" in grocery_data:
            logger.error(f"AI grocery generation failed: {grocery_data}")
            raise HTTPException(status_code=500, detail="Failed to generate grocery list")

        # 4. POST-PROCESSING: Calculate totals dynamically from items
        # This ensures the total is always correct even if AI doesn't calculate it properly
        categories = grocery_data.get("categories", [])
        total_calculated = 0
        breakdown_calculated = {
            "vegetables": 0,
            "dairy_proteins": 0,
            "grains_pulses": 0,
            "spices": 0,
            "other": 0
        }

        # Calculate totals from actual items
        for category in categories:
            category_name = category.get("name", "").lower()
            items = category.get("items", [])
            
            category_total = 0
            for item in items:
                item_price = item.get("estimated_price", 0)
                if isinstance(item_price, (int, float)) and item_price > 0:
                    category_total += item_price
                    total_calculated += item_price
            
            # Map category to breakdown
            if "vegetable" in category_name:
                breakdown_calculated["vegetables"] += category_total
            elif any(keyword in category_name for keyword in ["dairy", "protein", "meat", "chicken", "fish", "egg", "paneer", "milk", "yogurt", "curd"]):
                breakdown_calculated["dairy_proteins"] += category_total
            elif any(keyword in category_name for keyword in ["grain", "pulse", "dal", "rice", "wheat", "atta", "flour"]):
                breakdown_calculated["grains_pulses"] += category_total
            elif any(keyword in category_name for keyword in ["spice", "oil", "masala"]):
                breakdown_calculated["spices"] += category_total
            else:
                breakdown_calculated["other"] += category_total

        # Update budget_analysis with calculated values
        if "budget_analysis" not in grocery_data:
            grocery_data["budget_analysis"] = {}
        
        # Only update if calculated total is valid and different from AI's total
        if total_calculated > 0:
            grocery_data["budget_analysis"]["total_estimated"] = int(round(total_calculated))
            grocery_data["budget_analysis"]["breakdown"] = {
                k: int(round(v)) for k, v in breakdown_calculated.items()
            }
            
            # Update budget_level based on calculated total
            if total_calculated < 800:
                grocery_data["budget_analysis"]["budget_level"] = "low"
            elif total_calculated <= 1500:
                grocery_data["budget_analysis"]["budget_level"] = "moderate"
            else:
                grocery_data["budget_analysis"]["budget_level"] = "high"
            
            logger.info(f"Recalculated totals: Total=₹{total_calculated}, Breakdown={breakdown_calculated}")

        # 5. Save Update
        plan.grocery_json = json.dumps(grocery_data)
        db.commit()

        final_total = grocery_data.get("budget_analysis", {}).get("total_estimated", 0)
        logger.info(f"Enhanced grocery list generated successfully. Total: ₹{final_total}")
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


# --- AGENTIC AI ENDPOINTS ---

# Pydantic models for requests
class WeeklyCheckInRequest(BaseModel):
    plan_id: int
    current_weight_kg: float
    diet_adherence_percent: int = 70
    exercise_adherence_percent: int = 50
    energy_level: Optional[str] = None  # low, moderate, high
    hunger_level: Optional[str] = None
    challenges: Optional[str] = None
    notes: Optional[str] = None

class CheckInAnalysisResponse(BaseModel):
    success: bool
    week_number: int
    weight_change_kg: float
    insights: dict
    adjusted_calories: Optional[int] = None
    recommendations: List[str]

@app.post("/weekly-checkin", response_model=CheckInAnalysisResponse)
async def submit_weekly_checkin(
    request: WeeklyCheckInRequest,
    db: Session = Depends(get_db)
):
    """
    Weekly Check-In Agent: Analyzes user progress and provides AI-driven insights.

    Flow:
    1. Record current week's metrics
    2. Compare with previous week(s)
    3. Detect plateaus, off-track progress
    4. Generate AI insights and recommendations
    5. Trigger adaptive calorie adjustments if needed
    """
    try:
        # 1. Get diet plan and user info
        plan = db.query(DietPlan).filter(DietPlan.id == request.plan_id).first()
        if not plan:
            raise HTTPException(status_code=404, detail="Diet plan not found")

        user = db.query(User).filter(User.id == plan.user_id).first()

        # Parse user profile data
        profile_data = json.loads(user.profile_data) if isinstance(user.profile_data, str) else user.profile_data
        starting_weight = profile_data.get('weight_kg', request.current_weight_kg)
        user_goal = profile_data.get('goal', 'Not specified')
        user_age = profile_data.get('age', 30)

        # 2. Get previous check-ins to calculate week number and trends
        previous_checkins = db.query(WeeklyCheckIn).filter(
            WeeklyCheckIn.diet_plan_id == request.plan_id
        ).order_by(WeeklyCheckIn.week_number.desc()).all()

        week_number = len(previous_checkins) + 1

        # Calculate weight change from previous week
        weight_change_kg = 0
        if previous_checkins:
            last_checkin = previous_checkins[0]
            weight_change_kg = request.current_weight_kg - last_checkin.current_weight_kg
        else:
            # First check-in: compare with starting weight
            weight_change_kg = request.current_weight_kg - starting_weight

        # 3. Detect plateau (no significant change for 2+ weeks)
        is_plateau = False
        if len(previous_checkins) >= 2:
            recent_changes = [
                abs(previous_checkins[i].weight_change_kg or 0)
                for i in range(min(2, len(previous_checkins)))
            ]
            # Plateau if all recent changes < 0.2kg
            is_plateau = all(change < 0.2 for change in recent_changes) and abs(weight_change_kg) < 0.2

        # 4. Calculate expected vs actual progress
        plan_json = json.loads(plan.plan_json) if isinstance(plan.plan_json, str) else plan.plan_json
        expected_results = plan_json.get('expected_results', {})
        expected_weekly_change = expected_results.get('weekly_change_kg', 0.5) if user_goal == 'Weight Loss' else 0.25

        variance_kg = abs(weight_change_kg) - expected_weekly_change
        is_off_track = abs(variance_kg) > (expected_weekly_change * 0.5)  # >50% variance

        # 5. Build AI prompt for insights
        ai_prompt = f"""
You are a nutrition AI analyzing a user's weekly progress. Provide personalized insights.

USER PROFILE:
- Goal: {user_goal}
- Age: {user_age}
- Starting Weight: {starting_weight}kg
- Current Weight: {request.current_weight_kg}kg
- Week: {week_number}

THIS WEEK'S DATA:
- Weight Change: {weight_change_kg:+.2f}kg
- Diet Adherence: {request.diet_adherence_percent}%
- Exercise Adherence: {request.exercise_adherence_percent}%
- Energy Level: {request.energy_level or 'Not reported'}
- Hunger Level: {request.hunger_level or 'Not reported'}
- Challenges: {request.challenges or 'None reported'}

TREND ANALYSIS:
- Expected Weekly Change: {expected_weekly_change:+.2f}kg
- Variance from Expected: {variance_kg:+.2f}kg
- Plateau Detected: {is_plateau}
- Off Track: {is_off_track}

TASK:
1. Analyze progress (is it good, too fast, too slow, plateau?)
2. Provide 3-5 SHORT, ACTIONABLE recommendations (bullet points)
3. Suggest calorie adjustment if needed (return number or null)
4. Keep tone SUPPORTIVE and MOTIVATING

OUTPUT FORMAT (JSON):
{{
  "progress_assessment": "1-2 sentences analyzing progress",
  "is_on_track": true/false,
  "plateau_detected": true/false,
  "recommendations": [
    "Recommendation 1",
    "Recommendation 2",
    "Recommendation 3"
  ],
  "calorie_adjustment": -100 or null (suggest adjustment amount, or null if no change needed),
  "adjustment_reason": "plateau" or "too_fast" or "too_slow" or null,
  "motivation_message": "Short encouraging message"
}}
"""

        # 6. Call OpenAI for AI insights
        ai_response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": ai_prompt}],
            temperature=0.7,
            max_tokens=500,
            response_format={"type": "json_object"}
        )

        insights_json = json.loads(ai_response.choices[0].message.content.strip())

        # 7. Determine calorie adjustment
        adjusted_calories = None
        adjustment_reason = None

        if insights_json.get('calorie_adjustment'):
            # Get current calorie target from plan
            current_calories = plan_json.get('nutrition_targets', {}).get('calories_range', '1800-1900')
            current_calories_mid = int(current_calories.split('-')[0]) + 50  # Approximate midpoint

            adjustment_amount = insights_json['calorie_adjustment']
            adjusted_calories = current_calories_mid + adjustment_amount
            adjustment_reason = insights_json.get('adjustment_reason', 'ai_suggested')

            # Log the adjustment
            adjustment_log = CalorieAdjustmentLog(
                user_id=user.id,
                diet_plan_id=request.plan_id,
                previous_calories=current_calories_mid,
                new_calories=adjusted_calories,
                adjustment_amount=adjustment_amount,
                reason=adjustment_reason,
                trigger_metric='weekly_checkin',
                ai_explanation=insights_json.get('motivation_message', '')
            )
            db.add(adjustment_log)

        # 8. Save check-in to database
        checkin = WeeklyCheckIn(
            user_id=user.id,
            diet_plan_id=request.plan_id,
            week_number=week_number,
            current_weight_kg=request.current_weight_kg,
            weight_change_kg=weight_change_kg,
            diet_adherence_percent=request.diet_adherence_percent,
            exercise_adherence_percent=request.exercise_adherence_percent,
            energy_level=request.energy_level,
            hunger_level=request.hunger_level,
            challenges=request.challenges,
            notes=request.notes,
            ai_insights_json=json.dumps(insights_json),
            adjusted_calories=adjusted_calories,
            adjustment_reason=adjustment_reason
        )
        db.add(checkin)

        # 9. Create progress snapshot
        total_weight_change = request.current_weight_kg - starting_weight
        avg_weekly_change = total_weight_change / week_number if week_number > 0 else 0

        snapshot = ProgressSnapshot(
            user_id=user.id,
            diet_plan_id=request.plan_id,
            weight_kg=request.current_weight_kg,
            weight_trend='losing' if total_weight_change < 0 else 'gaining' if total_weight_change > 0 else 'stable',
            total_weight_change_kg=total_weight_change,
            avg_weekly_change_kg=avg_weekly_change,
            weeks_on_plan=week_number,
            is_plateau=is_plateau,
            is_off_track=is_off_track,
            needs_adjustment=adjusted_calories is not None
        )
        db.add(snapshot)

        db.commit()

        logger.info(f"Weekly check-in completed for user {user.id}, week {week_number}")

        # 10. Return response
        return CheckInAnalysisResponse(
            success=True,
            week_number=week_number,
            weight_change_kg=weight_change_kg,
            insights=insights_json,
            adjusted_calories=adjusted_calories,
            recommendations=insights_json.get('recommendations', [])
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Weekly check-in error: {e}")
        raise HTTPException(status_code=500, detail=f"Check-in failed: {str(e)}")

@app.get("/progress-history/{plan_id}")
async def get_progress_history(plan_id: int, db: Session = Depends(get_db)):
    """Get all check-ins and progress snapshots for a diet plan"""
    try:
        checkins = db.query(WeeklyCheckIn).filter(
            WeeklyCheckIn.diet_plan_id == plan_id
        ).order_by(WeeklyCheckIn.week_number.asc()).all()

        snapshots = db.query(ProgressSnapshot).filter(
            ProgressSnapshot.diet_plan_id == plan_id
        ).order_by(ProgressSnapshot.snapshot_date.asc()).all()

        calorie_adjustments = db.query(CalorieAdjustmentLog).filter(
            CalorieAdjustmentLog.diet_plan_id == plan_id
        ).order_by(CalorieAdjustmentLog.adjustment_date.desc()).all()

        return {
            "success": True,
            "checkins": [
                {
                    "week_number": c.week_number,
                    "date": c.checkin_date.isoformat(),
                    "weight_kg": c.current_weight_kg,
                    "weight_change_kg": c.weight_change_kg,
                    "diet_adherence": c.diet_adherence_percent,
                    "exercise_adherence": c.exercise_adherence_percent,
                    "energy_level": c.energy_level,
                    "hunger_level": c.hunger_level,
                    "insights": json.loads(c.ai_insights_json) if c.ai_insights_json else {},
                    "adjusted_calories": c.adjusted_calories
                }
                for c in checkins
            ],
            "snapshots": [
                {
                    "date": s.snapshot_date.isoformat(),
                    "weight_kg": s.weight_kg,
                    "total_change_kg": s.total_weight_change_kg,
                    "avg_weekly_change_kg": s.avg_weekly_change_kg,
                    "weeks_on_plan": s.weeks_on_plan,
                    "trend": s.weight_trend,
                    "is_plateau": s.is_plateau
                }
                for s in snapshots
            ],
            "calorie_adjustments": [
                {
                    "date": a.adjustment_date.isoformat(),
                    "previous_calories": a.previous_calories,
                    "new_calories": a.new_calories,
                    "adjustment_amount": a.adjustment_amount,
                    "reason": a.reason,
                    "explanation": a.ai_explanation
                }
                for a in calorie_adjustments
            ]
        }
    except Exception as e:
        logger.error(f"Progress history error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch progress: {str(e)}")

@app.post("/adaptive-calorie-adjustment/{plan_id}")
async def trigger_adaptive_adjustment(
    plan_id: int,
    manual_adjustment: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Adaptive Calorie Agent: Analyzes progress data and suggests calorie adjustments.
    Can be triggered manually or automatically by weekly check-in.
    """
    try:
        plan = db.query(DietPlan).filter(DietPlan.id == plan_id).first()
        if not plan:
            raise HTTPException(status_code=404, detail="Diet plan not found")

        # Get latest progress snapshot
        latest_snapshot = db.query(ProgressSnapshot).filter(
            ProgressSnapshot.diet_plan_id == plan_id
        ).order_by(ProgressSnapshot.snapshot_date.desc()).first()

        if not latest_snapshot:
            raise HTTPException(status_code=404, detail="No progress data found. Complete a check-in first.")

        # Get current calorie target
        plan_json = json.loads(plan.plan_json) if isinstance(plan.plan_json, str) else plan.plan_json
        current_calories = plan_json.get('nutrition_targets', {}).get('calories_range', '1800-1900')
        current_calories_mid = int(current_calories.split('-')[0]) + 50

        # Determine adjustment
        if manual_adjustment:
            adjusted_calories = current_calories_mid + manual_adjustment
            reason = 'user_request'
            explanation = f"Manual adjustment of {manual_adjustment:+d} kcal requested by user."
        else:
            # AI-driven adjustment based on trend analysis
            if latest_snapshot.is_plateau:
                adjustment = -100  # Reduce by 100 kcal
                reason = 'plateau'
                explanation = "Progress has plateaued. Reducing calories slightly to restart fat loss."
            elif latest_snapshot.is_off_track and latest_snapshot.avg_weekly_change_kg < 0.2:
                adjustment = -150
                reason = 'slow_progress'
                explanation = "Progress is slower than expected. Increasing calorie deficit moderately."
            elif latest_snapshot.avg_weekly_change_kg > 1.0:
                adjustment = +100
                reason = 'too_fast'
                explanation = "Weight loss is too rapid. Increasing calories to protect muscle mass."
            else:
                return {
                    "success": True,
                    "message": "No adjustment needed. Progress is on track!",
                    "current_calories": current_calories_mid
                }

            adjusted_calories = current_calories_mid + adjustment

        # Log adjustment
        adjustment_log = CalorieAdjustmentLog(
            user_id=plan.user_id,
            diet_plan_id=plan_id,
            previous_calories=current_calories_mid,
            new_calories=adjusted_calories,
            adjustment_amount=adjusted_calories - current_calories_mid,
            reason=reason,
            trigger_metric='adaptive_agent',
            ai_explanation=explanation
        )
        db.add(adjustment_log)
        db.commit()

        logger.info(f"Adaptive calorie adjustment: {current_calories_mid} → {adjusted_calories} ({reason})")

        return {
            "success": True,
            "previous_calories": current_calories_mid,
            "new_calories": adjusted_calories,
            "adjustment_amount": adjusted_calories - current_calories_mid,
            "reason": reason,
            "explanation": explanation
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Adaptive calorie adjustment error: {e}")
        raise HTTPException(status_code=500, detail=f"Adjustment failed: {str(e)}")

# --- CONVERSATIONAL AI CHAT ENDPOINTS ---

@app.post("/chat", response_model=ChatResponse)
async def chat_with_ai(request: ChatRequest):
    """
    Conversational AI endpoint for diet-related questions

    Args:
        request: ChatRequest with session_id, message, and optional context

    Returns:
        AI response with suggestions
    """
    try:
        # Get or initialize chat agent
        agent = get_chat_agent()

        # Get AI response
        ai_response = agent.chat(
            session_id=request.session_id,
            user_message=request.message,
            context=request.context
        )

        # Get smart suggestions based on context
        suggestions = agent.get_quick_suggestions(request.context)

        logger.info(f"Chat session {request.session_id}: {len(request.message)} chars in, {len(ai_response)} chars out")

        return ChatResponse(
            success=True,
            response=ai_response,
            suggestions=suggestions
        )

    except Exception as e:
        logger.error(f"Chat error: {e}")
        return ChatResponse(
            success=False,
            response="Sorry, I'm having trouble responding right now. Please try again in a moment.",
            suggestions=[]
        )

@app.get("/chat/history/{session_id}")
async def get_chat_history(session_id: str):
    """
    Get conversation history for a session

    Args:
        session_id: Session identifier (user_id or plan_id)

    Returns:
        List of messages in the conversation
    """
    try:
        agent = get_chat_agent()
        history = agent.get_conversation_history(session_id)

        return {
            "success": True,
            "session_id": session_id,
            "messages": history
        }

    except Exception as e:
        logger.error(f"Error fetching chat history: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch chat history")

@app.delete("/chat/history/{session_id}")
async def clear_chat_history(session_id: str):
    """
    Clear conversation history for a session

    Args:
        session_id: Session identifier to clear

    Returns:
        Success confirmation
    """
    try:
        agent = get_chat_agent()
        cleared = agent.clear_session(session_id)

        if cleared:
            return {
                "success": True,
                "message": f"Chat history cleared for session {session_id}"
            }
        else:
            return {
                "success": False,
                "message": f"No chat history found for session {session_id}"
            }

    except Exception as e:
        logger.error(f"Error clearing chat history: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear chat history")

# --- 7. RUN INSTRUCTION ---
if __name__ == "__main__":
    import uvicorn
    # This block allows you to run `python main.py` directly for testing
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)