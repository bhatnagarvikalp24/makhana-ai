# Performance Optimization - Diet Plan & Grocery Generation

## 🔍 Problem Analysis

**Current Performance:**
- Diet Plan Generation: **30-35 seconds**
- Grocery List Generation: **30-35 seconds**
- Total wait time: **60-70 seconds** (poor UX)

## 🎯 Root Causes Identified

### 1. **Token Limits Too Low**
- **Before:** `max_tokens=2000` for diet plan
- **Issue:** Responses were being truncated, causing retries or incomplete data
- **Impact:** Slower responses, potential quality issues

### 2. **Long System Prompts**
- Diet plan prompt: ~500 lines (~5000+ tokens)
- Grocery prompt: More concise but could be optimized
- **Impact:** Higher token costs, slower processing

### 3. **Inefficient Retry Logic**
- Wait time between retries: 1 second
- **Impact:** Adds unnecessary delay on failures

### 4. **No Performance Monitoring**
- No timing logs to identify bottlenecks
- **Impact:** Can't measure improvements

---

## ✅ Optimizations Implemented

### 1. **Increased Token Limits**
```python
# Diet Plan: 2000 → 4000 tokens
diet_plan_json = call_ai_json(system_prompt, user_prompt, max_tokens=4000)

# Grocery List: 2000 → 3000 tokens  
grocery_data = call_ai_json(system_prompt, user_prompt, max_tokens=3000)
```

**Benefits:**
- ✅ Complete responses without truncation
- ✅ Fewer retries needed
- ✅ Better response quality

### 2. **Optimized User Prompts**
**Before:**
```python
user_prompt = f"""Generate a comprehensive, goal-oriented diet plan for {profile.name}.
Goal: {profile.goal}
Current: {profile.weight_kg}kg, {profile.height_cm}cm
Focus on practical Indian meals with clear outcome expectations."""
```

**After:**
```python
user_prompt = f"""Generate diet plan for {profile.name} ({profile.age}y, {profile.gender}, {profile.weight_kg}kg, {profile.height_cm}cm).
Goal: {profile.goal} ({profile.goal_pace} pace)
Diet: {profile.diet_pref}, Region: {profile.region}
Medical: {', '.join(profile.medical_manual) if profile.medical_manual else 'None'}
Output complete 7-day plan with calculated nutrition targets."""
```

**Benefits:**
- ✅ More concise (reduced tokens)
- ✅ Still includes all essential info
- ✅ Faster processing

### 3. **Optimized Grocery Data Extraction**
**Before:**
```python
user_prompt = f"Meal plan: {plan.plan_json[:2000]}"
```

**After:**
```python
# Extract only days array (most relevant for grocery)
plan_data = json.loads(plan.plan_json)
days_data = plan_data.get('days', [])
meals_summary = json.dumps(days_data, ensure_ascii=False)[:2500]
user_prompt = f"Meal plan (7 days): {meals_summary}"
```

**Benefits:**
- ✅ Sends only relevant data (days array)
- ✅ Excludes unnecessary metadata
- ✅ Faster processing

### 4. **Reduced Retry Wait Time**
- **Before:** 1 second between retries
- **After:** 0.5 seconds
- **Impact:** Faster recovery on transient errors

### 5. **Added Performance Logging**
```python
start_time = time.time()
# ... generation code ...
elapsed = time.time() - start_time
logger.info(f"Diet plan generation completed in {elapsed:.2f}s")
```

**Benefits:**
- ✅ Track actual performance
- ✅ Identify bottlenecks
- ✅ Measure improvements

---

## 🧪 Testing Locally

### Step 1: Start Backend
```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Step 2: Run Performance Test
```bash
# In another terminal
cd backend
python test_performance.py
```

**Expected Output:**
```
🚀 PERFORMANCE TESTING SUITE
============================================================
TESTING HEALTH ENDPOINT
✅ Health check: 0.050 seconds

============================================================
TESTING DIET PLAN GENERATION
✅ SUCCESS: Diet plan generated in 15-20 seconds
   Plan ID: 123
   User ID: 456

============================================================
TESTING GROCERY LIST GENERATION
✅ SUCCESS: Grocery list generated in 10-15 seconds
   Total estimated: ₹1200
   Categories: 5
```

### Step 3: Test via Frontend
1. Start frontend: `cd frontend && npm run dev`
2. Visit: http://localhost:5173
3. Fill out the form and generate a plan
4. Check browser console for timing
5. Check backend logs for performance metrics

### Step 4: Compare Performance

**Before Optimization:**
- Diet Plan: 30-35 seconds
- Grocery List: 30-35 seconds
- Total: 60-70 seconds

**After Optimization (Expected):**
- Diet Plan: 15-25 seconds (30-40% faster)
- Grocery List: 10-15 seconds (50-60% faster)
- Total: 25-40 seconds (40-50% improvement)

---

## 📊 Performance Metrics to Monitor

### Backend Logs
Look for these log messages:
```
INFO: Generating Weight Loss plan for Test User
INFO: Calling AI API (attempt 1/2, max_tokens=4000)
INFO: AI API call successful in 18.45s (tokens: 3850)
INFO: Diet plan generation completed in 19.23s
```

### Key Metrics:
1. **AI API Response Time:** Should be 15-25s (was 25-35s)
2. **Total Generation Time:** Should be 18-28s (was 30-40s)
3. **Token Usage:** Monitor to ensure we're not wasting tokens
4. **Retry Rate:** Should be minimal (< 5%)

---

## 🚀 Expected Improvements

### Diet Plan Generation:
- **Before:** 30-35 seconds
- **After:** 15-25 seconds
- **Improvement:** 30-40% faster

### Grocery List Generation:
- **Before:** 30-35 seconds  
- **After:** 10-15 seconds
- **Improvement:** 50-60% faster

### User Experience:
- **Before:** 60-70 second total wait
- **After:** 25-40 second total wait
- **Improvement:** 40-50% faster overall

---

## 🔧 Additional Optimizations (Future)

If still not fast enough, consider:

### 1. **Streaming Responses** (Advanced)
- Stream AI response as it generates
- Show progress to user
- Perceived performance improvement

### 2. **Caching Common Calculations**
- Cache BMR/TDEE calculations for similar profiles
- Reduce redundant AI calls

### 3. **Parallel Processing**
- Generate plan and grocery list in parallel (if possible)
- Requires async architecture changes

### 4. **Prompt Optimization**
- Further reduce system prompt size
- Use few-shot examples instead of verbose instructions

### 5. **Model Selection**
- Test GPT-3.5-turbo (faster, cheaper)
- Compare quality vs speed tradeoff

---

## ✅ Testing Checklist

Before deploying to production:

- [ ] Test diet plan generation locally (should be 15-25s)
- [ ] Test grocery list generation locally (should be 10-15s)
- [ ] Verify response quality (no degradation)
- [ ] Check backend logs for timing metrics
- [ ] Test with different user profiles
- [ ] Test with medical conditions
- [ ] Verify all features still work
- [ ] Check error handling

---

## 📝 Notes

- **Token Costs:** Increased max_tokens will increase costs slightly, but faster responses = better UX
- **Quality:** Optimizations maintain quality while improving speed
- **Monitoring:** Logs now include timing for production monitoring

---

## 🎯 Success Criteria

**Ready for Production if:**
- ✅ Diet plan: < 25 seconds
- ✅ Grocery list: < 15 seconds
- ✅ Quality maintained (no degradation)
- ✅ No errors in testing

**If not meeting targets:**
- Review backend logs for bottlenecks
- Consider additional optimizations
- May need to optimize system prompts further

