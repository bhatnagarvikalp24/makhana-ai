# Complete Testing Checklist - Diet Planner App

**Test Date:** December 23, 2025
**Test URL:** http://localhost:5175/
**Backend:** http://localhost:8000/

---

## ✅ Test Results

### **1. Landing Page & Navigation**
- [ ] Landing page loads correctly
- [ ] "Get Started" button works
- [ ] "Login" button works
- [ ] Navigation menu items work
- [ ] Footer links work
- [ ] Responsive design on mobile/tablet

### **2. User Registration & Diet Plan Generation**
- [ ] UserForm page loads
- [ ] All form fields accept input:
  - [ ] Name, Phone, Age, Weight, Height
  - [ ] Gender selection
  - [ ] Goal selection (weight loss, muscle gain, maintenance)
  - [ ] Activity level selection
  - [ ] Diet type selection (veg, non-veg, jain, eggetarian)
  - [ ] Region selection
  - [ ] Medical issues (optional)
  - [ ] Allergies (optional)
- [ ] Form validation works (required fields)
- [ ] Submit button shows loading state
- [ ] AI generates personalized diet plan
- [ ] Plan includes:
  - [ ] Daily calorie target
  - [ ] Macro breakdown (protein, carbs, fats)
  - [ ] 7-day meal plan
  - [ ] Meal timings
  - [ ] Portion sizes
- [ ] Navigate to Dashboard after generation

### **3. Dashboard Features**
- [ ] Diet plan displays correctly
- [ ] Daily targets card shows macros
- [ ] 7-day meal cards visible
- [ ] Each meal shows:
  - [ ] Meal name
  - [ ] Description
  - [ ] Nutritional info
- [ ] Action buttons visible:
  - [ ] Save Plan
  - [ ] Check-In (disabled before save)
  - [ ] Grocery List
  - [ ] Download PDF
  - [ ] Meal Swap
  - [ ] Recipe Video

### **4. Save Plan Functionality**
- [ ] Click "Save Plan" button
- [ ] Modal opens
- [ ] Enter phone number (10 digits)
- [ ] Enter plan title
- [ ] Submit saves to database
- [ ] Success toast appears
- [ ] Check-In button becomes enabled
- [ ] Plan ID stored in localStorage

### **5. Login System**
- [ ] Navigate to Login page
- [ ] Enter registered phone number
- [ ] Login redirects to My Plans
- [ ] Shows all saved plans for user
- [ ] Each plan card shows:
  - [ ] Plan title
  - [ ] Created date
  - [ ] Calorie target
  - [ ] Protein target
  - [ ] Check-in count (if any)

### **6. Grocery List Generation**
- [ ] Click "Generate Grocery List" button
- [ ] Loading indicator appears
- [ ] AI generates categorized grocery list
- [ ] Categories include:
  - [ ] Vegetables
  - [ ] Fruits
  - [ ] Proteins
  - [ ] Grains
  - [ ] Dairy
  - [ ] Spices
  - [ ] Others
- [ ] Each item shows quantity
- [ ] Download/Print option works
- [ ] Navigate back to Dashboard

### **7. Meal Swapping**
- [ ] Click "Swap" button on any meal
- [ ] Modal opens
- [ ] AI generates 3-5 alternatives
- [ ] Each alternative shows:
  - [ ] Meal name
  - [ ] Description
  - [ ] Nutritional info
- [ ] Click "Use This" replaces meal
- [ ] Nutritional balance maintained
- [ ] Close modal works

### **8. Recipe Videos**
- [ ] Click "Recipe" button on any meal
- [ ] Modal opens
- [ ] YouTube video search works
- [ ] Video iframe loads correctly
- [ ] "Watch on YouTube" link works
- [ ] Close modal works

### **9. Weekly Check-In**
- [ ] Check-In button enabled only when plan is saved
- [ ] Click "Check-In" button
- [ ] Modal opens with form:
  - [ ] Week number shown
  - [ ] Current weight input
  - [ ] Diet adherence slider (0-100%)
  - [ ] Exercise adherence slider (0-100%)
  - [ ] Energy level dropdown
  - [ ] Hunger level dropdown
  - [ ] Challenges textarea
  - [ ] Notes textarea
- [ ] Submit check-in
- [ ] AI analyzes progress
- [ ] Shows insights:
  - [ ] Weight change
  - [ ] Progress assessment
  - [ ] Plateau detection
  - [ ] Calorie adjustment (if needed)
  - [ ] Recommendations
- [ ] Check-in saved to database
- [ ] Success toast appears

### **10. Progress History**
- [ ] Navigate to My Plans
- [ ] Click on plan with check-ins
- [ ] "View Progress History" button appears
- [ ] Click to open Progress page
- [ ] Stats cards show:
  - [ ] Total check-ins
  - [ ] Total weight change
  - [ ] Average adherence
  - [ ] Number of adjustments
- [ ] Timeline shows all check-ins
- [ ] Each check-in displays:
  - [ ] Week number and date
  - [ ] Weight and change
  - [ ] Adherence metrics
  - [ ] Energy level
  - [ ] AI assessment
  - [ ] Plateau warnings
  - [ ] Recommendations
- [ ] Calorie adjustments log (if any)
- [ ] Back button works

### **11. AI Chatbot**
- [ ] Floating chat button visible on Dashboard
- [ ] Click to open chat window
- [ ] Chat interface displays:
  - [ ] Header with title
  - [ ] Messages area
  - [ ] Input field
  - [ ] Send button
  - [ ] Clear chat button
- [ ] Send message "What are good protein sources?"
  - [ ] Loading indicator appears
  - [ ] AI responds with relevant answer
  - [ ] Response includes context from user's plan
- [ ] Conversation memory works:
  - [ ] Ask follow-up: "How much should I eat daily?"
  - [ ] AI remembers previous context
- [ ] Quick suggestions appear
- [ ] Click suggestion auto-sends question
- [ ] Clear chat removes all messages
- [ ] Close and reopen preserves history
- [ ] Different sessions have separate histories

### **12. Download PDF**
- [ ] Click "Download PDF" button
- [ ] PDF generation starts
- [ ] PDF includes:
  - [ ] User info
  - [ ] Daily targets
  - [ ] Complete 7-day meal plan
  - [ ] Meal timings
  - [ ] Nutritional info
- [ ] PDF downloads successfully
- [ ] PDF is readable and well-formatted

### **13. Error Handling**
- [ ] Try logging in with non-existent phone
  - [ ] Shows "Account not found" error
- [ ] Try submitting form with missing fields
  - [ ] Shows validation errors
- [ ] Test with slow/no internet
  - [ ] Shows loading states
  - [ ] Timeout handling works
- [ ] Backend API errors
  - [ ] User-friendly error messages
  - [ ] No app crashes

### **14. Edge Cases**
- [ ] Very long meal names display correctly
- [ ] Special characters in user input
- [ ] Multiple users with same name
- [ ] Multiple plans for same user
- [ ] Check-in without previous check-ins
- [ ] Check-in with extreme weight changes
- [ ] Chat with very long messages
- [ ] Empty grocery list edge case
- [ ] Meal swap with dietary restrictions

### **15. Performance**
- [ ] Diet plan generation < 35 seconds
- [ ] Grocery list generation < 25 seconds
- [ ] Meal swap < 15 seconds
- [ ] Check-in analysis < 10 seconds
- [ ] Chat responses < 5 seconds
- [ ] Page load times < 2 seconds
- [ ] Smooth animations and transitions

### **16. Mobile Responsiveness**
- [ ] Test on mobile viewport (375px)
- [ ] All buttons accessible
- [ ] Text readable
- [ ] Forms usable
- [ ] Modals fit screen
- [ ] Navigation works
- [ ] Chat interface usable

### **17. Browser Compatibility**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### **18. Data Persistence**
- [ ] Refresh page maintains state
- [ ] localStorage works correctly
- [ ] Database saves all data
- [ ] Session persistence
- [ ] History navigation works

---

## 🐛 Bugs Found

### Priority: High
- [ ] List any critical bugs here

### Priority: Medium
- [ ] List any moderate bugs here

### Priority: Low
- [ ] List any minor bugs here

---

## 📝 Notes

- Backend uses both OpenAI (diet generation) and Claude (chat)
- Chat uses Claude 3 Haiku for cost-effectiveness
- Automatic retry logic for API overload errors
- Session-based conversation memory
- Phone-based authentication (no passwords)

---

## ✨ All Tests Passed?

- [ ] All critical features work
- [ ] No blocking bugs
- [ ] Performance acceptable
- [ ] Ready for production deployment

**Tested by:** Claude AI
**Sign-off:** _______________
**Date:** December 23, 2025
