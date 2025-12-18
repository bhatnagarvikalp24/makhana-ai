# Smart Meal Swap Feature - Testing Guide

## 🎯 What This Feature Does

The Smart Meal Swap Engine allows users to instantly get macro-matched, context-aware meal alternatives that AI chatbots cannot provide. It considers:
- User's dietary preferences (veg/non-veg/vegan)
- Regional cuisine preferences
- Fitness goals (weight loss, muscle gain, balanced)
- Medical conditions
- Macro equivalence (protein, carbs, fats)

## 🚀 How to Test Locally

### Step 1: Start Both Servers

**Frontend (already running):**
```bash
cd frontend
npm run dev
# Running on: http://localhost:5174/
```

**Backend:**
```bash
cd backend
python main.py
# Or: uvicorn main:app --reload
# Running on: http://localhost:8000
```

### Step 2: Generate a Diet Plan

1. Go to http://localhost:5174/
2. Click "Get Started"
3. Fill in the form:
   - Name: Test User
   - Age: 30
   - Weight: 70kg
   - Height: 170cm
   - Goal: Weight Loss (or any goal)
   - Diet Preference: Vegetarian
   - Region: North Indian
4. Click "Generate Diet Plan"
5. Wait for the AI to generate your personalized plan

### Step 3: Test the Swap Feature

1. **Hover over any meal** in the 7-day plan
2. You'll see a small **green refresh icon (🔄)** appear on the right
3. **Click the refresh icon** to swap that meal
4. A modal will open showing "Finding smart alternatives..."
5. After 3-5 seconds, you'll see **3 alternative meals** with:
   - ✅ Name and description
   - 📊 Macro comparison
   - 💡 Why it's a good swap
   - 🏷️ Diet tag (veg/non-veg/vegan)

6. **Click on any alternative** to see the "Use This Alternative" button
7. Click the button to apply the swap (preview mode)

### Step 4: Test Different Scenarios

**Test Case 1: Vegetarian User + Lunch Swap**
- Original: "2 Rotis + Dal + Sabzi"
- Expected: Alternatives should all be vegetarian (paneer, tofu, chickpeas, etc.)
- ❌ Should NOT show chicken or fish

**Test Case 2: Non-Vegetarian User + Breakfast Swap**
- Original: "3 Egg Whites + Toast"
- Expected: Mix of veg and non-veg options (cottage cheese, chicken sausage, etc.)

**Test Case 3: Weight Loss Goal + Dinner Swap**
- Original: "Grilled Chicken + Salad"
- Expected: Lower calorie alternatives with high protein
- Why: "Better for calorie deficit"

**Test Case 4: Muscle Gain Goal + Snack Swap**
- Original: "Banana + Almonds"
- Expected: Higher protein options
- Why: "Good for muscle recovery"

**Test Case 5: Senior Citizen (Age 65+) + Any Meal**
- Expected: Easier to digest options
- Why: "Gentle on digestion"

## 🔍 What to Check

### Backend Validation
1. Open browser console (F12)
2. When you click swap, check Network tab
3. Look for POST request to `/swap-meal`
4. Status should be `200 OK`
5. Response should contain `alternatives` array with 3 items

### Frontend Validation
1. ✅ Swap icon appears on hover
2. ✅ Modal opens with loading state
3. ✅ 3 alternatives load within 5 seconds
4. ✅ Each alternative shows name, description, macros, why
5. ✅ Diet tags match user's preference (veg user = veg alternatives)
6. ✅ Clicking alternative shows "Use This Alternative" button
7. ✅ Toast notification appears: "Meal swapped! Note: This is a preview..."
8. ✅ Modal closes after selection

### Error Handling
1. Test with backend offline → Should show error toast
2. Test with invalid meal text → Should handle gracefully
3. Test rapid clicking → Should not break UI

## 📊 Expected Output Examples

### Example 1: Vegetarian User Swapping Lunch
**Original:** "2 Rotis + 1 cup Dal + Bhindi Sabzi"

**Alternative 1:**
- Name: Quinoa Bowl with Rajma
- Description: 1 cup quinoa + 1 cup rajma + cucumber salad
- Macros: Higher protein (28g), Similar carbs
- Why: More protein for muscle preservation during weight loss
- Diet Tag: vegetarian

**Alternative 2:**
- Name: Paneer Tikka Wrap
- Description: 2 whole wheat wraps + 150g grilled paneer + mint chutney
- Macros: Similar protein (25g), Lower carbs
- Why: Easier to prepare, good for busy days
- Diet Tag: vegetarian

**Alternative 3:**
- Name: South Indian Thali
- Description: 2 dosa + sambar + coconut chutney
- Macros: Same calories, more fiber
- Why: Regional variety, easier digestion
- Diet Tag: vegan

### Example 2: Non-Veg User Swapping Dinner
**Original:** "Grilled Chicken Breast (200g) + Steamed Broccoli"

**Alternative 1:**
- Name: Tandoori Fish
- Description: 200g pomfret + grilled vegetables + mint raita
- Macros: Higher omega-3, same protein (30g)
- Why: Heart-healthy fats, variety from chicken
- Diet Tag: non-vegetarian

**Alternative 2:**
- Name: Egg White Omelette Bowl
- Description: 6 egg whites + spinach + mushrooms + tomatoes
- Macros: Similar protein (28g), Lower calories
- Why: Budget-friendly, quick to make
- Diet Tag: eggetarian

**Alternative 3:**
- Name: Tofu Stir-Fry
- Description: 250g tofu + mixed vegetables + soy sauce
- Macros: Same protein (30g), plant-based
- Why: Meatless Monday option
- Diet Tag: vegan

## 🐛 Known Limitations (MVP)

1. **Swaps are preview-only** - Changes don't persist yet (we'd need to update the backend plan storage)
2. **No undo** - Once swapped, you can't easily revert (would need to refresh page)
3. **Client-side state only** - Swaps don't save to database
4. **No swap history** - Can't see what was originally there after swapping

## 🚀 Future Enhancements

1. **Persist swaps** - Save changes to database
2. **Swap entire day** - "Give me alternatives for Day 3"
3. **Allergy filtering** - "I'm allergic to nuts" → Auto-filter out nut-based swaps
4. **Favorite swaps** - Save commonly used alternatives
5. **Recipe videos** - Link each alternative to cooking video
6. **Cost comparison** - "This alternative costs ₹50 less per week"
7. **Calorie tracking** - Show running total after swaps

## ✅ Success Criteria

The feature is working correctly if:
- ✅ Users can swap any meal with 1 click
- ✅ Alternatives match dietary preferences
- ✅ Macros are reasonably similar
- ✅ Response time is under 5 seconds
- ✅ UI is intuitive (no explanation needed)
- ✅ Works on mobile (touch hover shows button)

## 📝 User Feedback to Collect

When users test this feature, ask:
1. How intuitive was the swap icon?
2. Were the alternatives relevant?
3. Did macros match your expectations?
4. Would you use this feature regularly?
5. What would make it better?

---

## 🎉 Differentiation from AI Chatbots

**What ChatGPT/Claude can do:**
- Give generic meal suggestions
- List alternative foods

**What our Swap Engine does better:**
- ✅ Context-aware (knows YOUR diet plan, goals, preferences)
- ✅ Macro-matched (similar protein/carbs/fats)
- ✅ Instant (1 click, no typing needed)
- ✅ Filtered (only shows veg options to veg users)
- ✅ Explained (shows WHY each alternative is good)
- ✅ Integrated (works within your existing plan)

This is the kind of feature that makes users think: "I could never get this from ChatGPT!"
