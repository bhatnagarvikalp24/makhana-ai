# 🔐 Phone OTP Authentication System

## Overview

Your diet planner app uses phone OTP authentication for secure login. The system runs in **development mode** where OTP codes are printed in the backend terminal logs instead of being sent via SMS.

---

## ✅ Current Status

- ✅ **Backend:** Full OTP authentication implemented
- ✅ **Frontend:** Beautiful OTP login UI
- ✅ **Database:** User and OTP tables configured
- ✅ **JWT Tokens:** 30-day validity
- ✅ **Development Mode:** OTP in logs (no SMS needed)

---

## 🚀 How to Use

### Start the Application

```bash
# Terminal 1 - Backend
cd backend
uvicorn main:app --reload

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Test Login Flow

1. Visit: http://localhost:5173/login
2. Enter phone number: `9876543210`
3. Click "Send OTP"
4. **Check backend terminal** for OTP code:
   ```
   ============================================================
   📱 DEVELOPMENT MODE - OTP NOT SENT VIA SMS
   Phone: 9876543210
   🔐 OTP Code: 123456
   Expires in: 5 minutes
   ============================================================
   ```
5. Enter the OTP in the frontend
6. Login successful! 🎉

---

## 📱 Complete User Flow

```
User visits /login
    ↓
Enter phone number
    ↓
Click "Send OTP"
    ↓
Backend generates 6-digit OTP
    ↓
OTP printed in terminal logs (development mode)
    ↓
User copies OTP from logs
    ↓
Enter OTP in 6-digit input UI
    ↓
Backend verifies OTP
    ↓
JWT token created & stored in localStorage
    ↓
Redirect to:
  - /start (new user)
  - /my-plans (existing user)
```

---

## 🔐 Security Features

1. **OTP Expiry:** 5 minutes
2. **One-Time Use:** Each OTP can only be used once
3. **Rate Limiting:** 60 seconds between OTP requests per phone
4. **JWT Tokens:** 30-day validity with secure payload
5. **Phone Validation:** Indian format (10 digits, starts with 6-9)
6. **Protected Routes:** Requires authentication to access user data

---

## 📊 API Endpoints

### 1. Send OTP
```bash
POST http://localhost:8000/auth/send-otp

Request:
{
  "phone": "9876543210"
}

Response:
{
  "success": true,
  "message": "OTP sent successfully",
  "phone": "9876543210",
  "expires_in_minutes": 5
}
```

### 2. Verify OTP
```bash
POST http://localhost:8000/auth/verify-otp

Request:
{
  "phone": "9876543210",
  "otp_code": "123456"
}

Response:
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "phone": "9876543210",
    "is_new_user": false
  },
  "plans_count": 3
}
```

### 3. Get Current User
```bash
GET http://localhost:8000/auth/me?token=YOUR_JWT_TOKEN

Response:
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "phone": "9876543210",
    "created_at": "2025-12-25T10:00:00"
  },
  "plans_count": 3
}
```

---

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    name VARCHAR,
    phone VARCHAR UNIQUE,
    email VARCHAR,
    is_phone_verified BOOLEAN DEFAULT 0,
    profile_data TEXT,
    medical_issues TEXT,
    created_at DATETIME
);
```

### OTP Verifications Table
```sql
CREATE TABLE otp_verifications (
    id INTEGER PRIMARY KEY,
    phone VARCHAR,
    otp_code VARCHAR(6),
    expires_at DATETIME,
    is_used BOOLEAN DEFAULT 0,
    created_at DATETIME
);
```

---

## 🎨 Frontend Features

### Beautiful OTP Login UI
- Gradient design with animations
- Phone input with validation
- 6-digit OTP input with auto-focus
- Auto-advance to next input field
- Paste support for OTP codes
- Resend OTP with 60-second countdown
- Error handling with toast notifications
- Loading states and spinners
- Auto-redirect after successful login

### Protected Routes
- `/start` (UserForm) - Requires authentication
- Automatic redirect to `/login` if not authenticated
- Uses real phone number from auth token

---

## 🔧 Adding SMS Provider (Future)

Currently in development mode. To add real SMS in production:

### Option 1: Twilio (Global)
```python
# Install: pip install twilio
# Add to .env:
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890
```

### Option 2: Amazon SNS
```python
# Install: pip install boto3
# Configure AWS credentials
# Use SNS publish API
```

### Option 3: Firebase SMS
```python
# Use Firebase Phone Authentication
# Integrate with Firebase SDK
```

Update [auth_utils.py](backend/auth_utils.py) `send_otp()` function to integrate your chosen SMS provider.

---

## 🐛 Troubleshooting

### Issue: "Invalid or expired OTP"
**Solution:**
- OTP expires in 5 minutes
- Each OTP can only be used once
- Request a new OTP

### Issue: "Rate limit exceeded"
**Solution:**
- Wait 60 seconds before requesting new OTP
- Clear recent OTPs from database if testing:
  ```sql
  DELETE FROM otp_verifications WHERE phone='9876543210';
  ```

### Issue: "Please login first to create a diet plan"
**Solution:**
- Clear browser localStorage
- Login again at http://localhost:5173/login
- Check if JWT token is valid

---

## 📝 Environment Variables

### Backend (.env)
```bash
JWT_SECRET_KEY=makhana_ai_super_secret_key_2025_change_in_production
```

**⚠️ Important:** Change `JWT_SECRET_KEY` in production to a strong random value!

---

## 🚀 Deployment

### Backend (Render/Railway/etc.)
1. Add environment variable: `JWT_SECRET_KEY` (generate strong secret)
2. Deploy backend
3. Test health endpoint
4. Add SMS provider credentials if needed

### Frontend (Vercel/Netlify/etc.)
1. Update `API_URL` to production backend URL
2. Deploy frontend
3. Test complete login flow

---

## 🎯 Current Development Mode Benefits

✅ **Zero Cost:** No SMS provider fees
✅ **Instant Testing:** No wait for SMS delivery
✅ **No Configuration:** Works immediately
✅ **Full Functionality:** Complete auth system working
✅ **Easy Debugging:** OTP visible in logs

---

## 💡 Key Files

- [backend/auth_utils.py](backend/auth_utils.py) - Authentication logic
- [backend/main.py](backend/main.py) - Auth endpoints
- [frontend/src/pages/OTPLogin.jsx](frontend/src/pages/OTPLogin.jsx) - Login UI
- [frontend/src/pages/UserForm.jsx](frontend/src/pages/UserForm.jsx) - Protected route example
- [frontend/src/App.jsx](frontend/src/App.jsx) - Routing configuration

---

## ✨ Summary

**Your authentication system is:**
- ✅ Fully implemented and working
- ✅ Ready for local development and testing
- ✅ Production-ready architecture (just needs SMS provider)
- ✅ Secure with JWT tokens and OTP verification

**Test it now:**
```bash
# Terminal 1
cd backend && uvicorn main:app --reload

# Terminal 2
cd frontend && npm run dev

# Browser
http://localhost:5173/login
```

**Development mode OTP will appear in backend terminal logs!**

---

🎉 **Your phone OTP authentication system is complete and ready to use!**
