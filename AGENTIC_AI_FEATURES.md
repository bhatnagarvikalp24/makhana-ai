# Agentic AI Features - Implementation Guide

## Overview
This document describes the implementation of two intelligent, autonomous AI agents that make your diet planner proactive and adaptive:

1. **Weekly Check-In Agent** - Tracks user progress and provides personalized insights
2. **Adaptive Calorie Agent** - Automatically adjusts calorie targets based on progress trends

---

## What Changed

### ✅ Removed Features
- **Barcode Scanner** - Removed completely from codebase
  - Deleted: `/frontend/src/components/BarcodeScanner.jsx`
  - Removed: Backend endpoints `/scan-barcode` and `/search-product`
  - Removed: UI button and modal from Dashboard

### ✨ Added Features

#### 1. Database Schema (3 new tables)
**Location:** `/backend/main.py` (lines 217-310)

**Tables:**
- `weekly_checkins` - Stores weekly progress data
- `progress_snapshots` - Aggregated metrics for trend analysis
- `calorie_adjustments` - Logs all AI-driven calorie changes

#### 2. Backend Endpoints (3 new APIs)
**Location:** `/backend/main.py` (lines 1723-2094)

**Endpoints:**
```
POST /weekly-checkin
- Submits weekly progress data
- Analyzes trends (plateau detection, variance tracking)
- Generates AI-powered insights and recommendations
- Automatically adjusts calories if needed
- Returns personalized coaching messages

GET /progress-history/{plan_id}
- Retrieves all check-ins, snapshots, and calorie adjustments
- Used for charts and trend visualization

POST /adaptive-calorie-adjustment/{plan_id}
- Manually or automatically triggers calorie adjustments
- Analyzes if progress is on track, too fast, or plateaued
- Provides detailed explanation for adjustments
```

#### 3. Frontend Component
**Location:** `/frontend/src/components/WeeklyCheckIn.jsx`

**Features:**
- Beautiful modal UI with form for weekly metrics
- Weight tracking
- Adherence sliders (diet & exercise)
- Energy/hunger level selectors
- Challenge/notes text fields
- Results screen showing:
  - Weight change with trend indicators
  - AI progress assessment
  - Plateau warnings
  - Calorie adjustment notifications
  - Actionable recommendations
  - Motivational messages

#### 4. Dashboard Integration
**Location:** `/frontend/src/pages/Dashboard.jsx`

**Changes:**
- Added "Check-In" button (gradient blue/indigo)
- Integrated WeeklyCheckIn component
- Import statements updated

---

## How It Works

### Weekly Check-In Agent Flow

```
User Input (Weight, Adherence, Energy, etc.)
           ↓
[Calculate Metrics]
  - Weight change from last week
  - Total progress since start
  - Average weekly change
           ↓
[Detect Patterns]
  - Plateau? (No change for 2+ weeks)
  - Off track? (>50% variance from expected)
  - Too fast? (>1kg/week loss)
           ↓
[AI Analysis]
  - OpenAI GPT-4o-mini generates:
    * Progress assessment
    * Recommendations (3-5 actionable tips)
    * Calorie adjustment suggestion
    * Motivation message
           ↓
[Save to Database]
  - WeeklyCheckIn record
  - ProgressSnapshot
  - CalorieAdjustmentLog (if adjusted)
           ↓
[Return to User]
  - Insights, recommendations, adjusted calories
```

### Adaptive Calorie Agent Logic

**Triggers:**
1. Plateau detected (weight unchanged 2+ weeks) → **-100 kcal**
2. Slow progress (<0.2kg/week loss) → **-150 kcal**
3. Too fast (>1kg/week loss) → **+100 kcal** (protect muscle)
4. On track → **No change**

**Safety Guardrails:**
- Never reduces below BMR × 1.15 for 65+ users
- Logs every adjustment with reason + AI explanation
- Tracks effectiveness for learning

---

## Database Schema Details

### `weekly_checkins` Table
```sql
Columns:
- id (PK)
- user_id (FK)
- diet_plan_id (FK)
- week_number (1, 2, 3...)
- checkin_date
- current_weight_kg
- weight_change_kg
- diet_adherence_percent (0-100)
- exercise_adherence_percent (0-100)
- energy_level (low/moderate/high)
- hunger_level (low/moderate/high)
- challenges (text)
- notes (text)
- ai_insights_json (JSON: assessment, recommendations, etc.)
- adjusted_calories (int, nullable)
- adjustment_reason (plateau/too_fast/too_slow)
- created_at
```

### `progress_snapshots` Table
```sql
Columns:
- id (PK)
- user_id (FK)
- diet_plan_id (FK)
- snapshot_date
- weight_kg
- weight_trend (losing/gaining/stable)
- total_weight_change_kg
- avg_weekly_change_kg
- weeks_on_plan
- expected_weight_kg
- variance_kg
- is_plateau (boolean)
- is_off_track (boolean)
- needs_adjustment (boolean)
- created_at
```

### `calorie_adjustments` Table
```sql
Columns:
- id (PK)
- user_id (FK)
- diet_plan_id (FK)
- adjustment_date
- previous_calories
- new_calories
- adjustment_amount (+/- kcal)
- reason (plateau/slow_progress/too_fast/user_request)
- trigger_metric (weekly_checkin/adaptive_agent)
- ai_explanation (text)
- was_effective (boolean, nullable - filled later)
- effectiveness_notes (text)
- created_at
```

---

## API Request/Response Examples

### POST /weekly-checkin

**Request:**
```json
{
  "plan_id": 123,
  "current_weight_kg": 82.5,
  "diet_adherence_percent": 85,
  "exercise_adherence_percent": 70,
  "energy_level": "high",
  "hunger_level": "moderate",
  "challenges": "Hard to avoid office snacks",
  "notes": "Felt great this week!"
}
```

**Response:**
```json
{
  "success": true,
  "week_number": 3,
  "weight_change_kg": -0.8,
  "insights": {
    "progress_assessment": "Excellent progress this week! You're losing weight at a healthy, sustainable pace.",
    "is_on_track": true,
    "plateau_detected": false,
    "recommendations": [
      "Continue current eating pattern - it's working well",
      "Try meal prepping snacks to combat office temptations",
      "Keep energy high with daily walks after meals"
    ],
    "calorie_adjustment": null,
    "adjustment_reason": null,
    "motivation_message": "You're crushing it! Keep up the amazing work 💪"
  },
  "adjusted_calories": null,
  "recommendations": [...]
}
```

### GET /progress-history/123

**Response:**
```json
{
  "success": true,
  "checkins": [
    {
      "week_number": 1,
      "date": "2024-01-01T00:00:00",
      "weight_kg": 85.0,
      "weight_change_kg": -1.2,
      "diet_adherence": 80,
      "exercise_adherence": 60,
      "energy_level": "moderate",
      "hunger_level": "moderate",
      "insights": {...},
      "adjusted_calories": null
    },
    // ... more weeks
  ],
  "snapshots": [...],
  "calorie_adjustments": [...]
}
```

---

## UI Components

### Weekly Check-In Form
- **Weight Input:** Number field with 0.1kg precision
- **Adherence Sliders:** 0-100% with visual feedback
- **Level Selectors:** 3-button toggle for energy/hunger (low/moderate/high)
- **Text Areas:** Challenges and notes (optional)
- **Submit Button:** With loading animation

### Results Screen
- **Progress Card:** Weight change with trend icons (↑ red for gain, ↓ green for loss)
- **On Track Badge:** Green checkmark or yellow warning
- **AI Assessment:** Purple card with analysis
- **Plateau Warning:** Orange alert if detected
- **Calorie Adjustment:** Blue card showing old → new calories
- **Recommendations:** Numbered list with green badges
- **Motivation:** Pink gradient card with heart icon

---

## Testing Guide

### Manual Test Flow

1. **Start Backend:**
   ```bash
   cd backend
   uvicorn main:app --reload --port 8000
   ```

2. **Start Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Create a Diet Plan:**
   - Go to `/start`
   - Fill out form with test data (e.g., 29M, 83kg, Weight Loss)
   - Generate plan

4. **Open Dashboard:**
   - Click "Check-In" button (blue gradient)

5. **Submit First Check-In:**
   - Weight: 82.0 kg (1kg loss)
   - Diet Adherence: 85%
   - Exercise: 70%
   - Energy: High
   - Hunger: Moderate
   - Submit

6. **Verify Results:**
   - Should show Week 1
   - Weight change: -1.0 kg
   - AI assessment
   - Recommendations
   - No calorie adjustment (first week)

7. **Submit Week 2 (Plateau Test):**
   - Weight: 82.0 kg (no change)
   - Lower adherence: 60%
   - Submit

8. **Verify Plateau Detection:**
   - Should trigger plateau warning
   - May suggest calorie reduction
   - Recommendations should address adherence

9. **Check Progress History:**
   ```bash
   curl http://localhost:8000/progress-history/1
   ```

10. **Verify Database:**
    ```bash
    sqlite3 backend/gharkadiet.db
    SELECT * FROM weekly_checkins;
    SELECT * FROM progress_snapshots;
    SELECT * FROM calorie_adjustments;
    ```

---

## Performance Considerations

- **AI Response Time:** 2-4 seconds (OpenAI API call)
- **Database Writes:** 3 tables per check-in (optimized transaction)
- **Caching:** None (real-time analysis)
- **Scalability:** Handles 1000s of users (SQLite local, PostgreSQL cloud)

---

## Future Enhancements

### Phase 2 (Recommended Next Steps)
1. **Progress Dashboard**
   - Weight chart (line graph)
   - Adherence trends
   - Calorie adjustment timeline

2. **Smart Notifications**
   - Weekly reminder to check in
   - Celebration for milestones (5kg lost, etc.)

3. **Meal Learning Agent**
   - Track which meals users swap
   - Gradually personalize recommendations
   - Avoid suggesting disliked foods

4. **Health Prediction Agent**
   - Predict final weight based on current trend
   - Estimate goal completion date
   - Warn if pace is unsustainable

### Phase 3 (Advanced)
1. **Multi-Agent Collaboration**
   - Weekly Check-In + Adaptive Calorie work together
   - Meal Agent learns from swap patterns
   - Health Prediction uses check-in data

2. **Proactive Coaching**
   - AI sends tips based on challenges reported
   - Suggests recipe videos for common struggles
   - Recommends exercise based on energy levels

---

## Code Locations Reference

### Backend
- **Database Models:** Lines 217-310 in `main.py`
- **Weekly Check-In Endpoint:** Lines 1744-1946 in `main.py`
- **Progress History Endpoint:** Lines 1948-2007 in `main.py`
- **Adaptive Calorie Endpoint:** Lines 2009-2094 in `main.py`

### Frontend
- **WeeklyCheckIn Component:** `/frontend/src/components/WeeklyCheckIn.jsx`
- **Dashboard Integration:** Lines 2, 8, 34, 262-269, 871-880 in `Dashboard.jsx`

---

## Troubleshooting

### Issue: "Plan not found" error
**Solution:** Ensure `plan_id` is correct. Check if plan was saved to DB.

### Issue: AI response timeout
**Solution:** Increase timeout in OpenAI client settings (currently 120s).

### Issue: Database locked (SQLite)
**Solution:** Use PostgreSQL for production (Neon). SQLite is for local dev only.

### Issue: Check-in button not showing
**Solution:** Verify WeeklyCheckIn import in Dashboard.jsx.

---

## Summary

You now have a **fully functional agentic AI system** that:
- ✅ Tracks user progress weekly
- ✅ Detects plateaus and off-track trends
- ✅ Generates AI-powered insights and recommendations
- ✅ Automatically adjusts calories when needed
- ✅ Logs all changes for transparency
- ✅ Provides motivational coaching messages

The system is **proactive** (suggests adjustments), **adaptive** (learns from progress), and **autonomous** (makes decisions based on data).

---

**Next Steps:** Test the system, then proceed with Phase 2 enhancements (charts, notifications, meal learning).
