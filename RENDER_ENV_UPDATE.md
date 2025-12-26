# Render Environment Variables - Update Required

## ✅ Database Migration Completed!

The database migration ran successfully and added the missing columns:
- `password_hash` - For storing encrypted passwords
- `security_key` - For password reset functionality

---

## ⚠️ Action Required: Update Render Environment Variables

Your Render backend needs the DATABASE_URL to connect to Neon database.

### Step 1: Go to Render Dashboard

1. Visit [https://dashboard.render.com](https://dashboard.render.com)
2. Click on your **backend service** (makhana-ai)
3. Click **Environment** tab

### Step 2: Add/Update DATABASE_URL

**Variable name**:
```
DATABASE_URL
```

**Variable value**:
```
postgresql://neondb_owner:npg_TPih7am8ZULD@ep-round-field-a4vg233u-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
```

**Steps**:
1. If `DATABASE_URL` exists, click **Edit** and update the value
2. If it doesn't exist, click **Add Environment Variable**
3. Paste the name and value
4. Click **Save**

### Step 3: Verify All Environment Variables

Make sure these are all set in Render (use your actual values from backend/.env):

```
DATABASE_URL=postgresql://neondb_owner:***@ep-round-field-a4vg233u-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
JWT_SECRET_KEY=your-jwt-secret-key-here
OPENAI_API_KEY=sk-proj-***your-openai-key***
ANTHROPIC_API_KEY=sk-ant-***your-anthropic-key***
RAZORPAY_KEY_ID=rzp_test_your_id
RAZORPAY_KEY_SECRET=your_secret
YOUTUBE_API_KEY=***your-youtube-api-key***
```

**Note**: Copy the actual values from your `backend/.env` file, not the placeholders above.

### Step 4: Redeploy

After adding/updating environment variables:

1. Go to **Manual Deploy** tab
2. Click **Deploy latest commit** or **Clear cache and deploy site**
3. Wait for deployment to complete (2-3 minutes)

---

## Testing After Deployment

### 1. Health Check
```bash
curl https://makhana-ai.onrender.com/health
```

Expected:
```json
{"status": "healthy", "message": "Ghar-Ka-Diet backend is running!"}
```

### 2. Test Signup
```bash
curl -X POST https://makhana-ai.onrender.com/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "8888888888",
    "password": "test123456",
    "name": "Test User",
    "security_key": "mykey123"
  }'
```

Expected: Success response with token

### 3. Test Login
```bash
curl -X POST https://makhana-ai.onrender.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "8888888888",
    "password": "test123456"
  }'
```

Expected: Success response with token

---

## What Changed

### Database Schema Update
Added two new columns to `users` table:
- `password_hash VARCHAR(255)` - Stores bcrypt-hashed passwords
- `security_key VARCHAR(255)` - For password recovery

### Backend Code
Already supports password authentication:
- `/auth/signup` - Create account with password
- `/auth/login` - Login with phone + password
- `/auth/reset-password` - Reset password with security key
- `/auth/change-password` - Change password when logged in

---

## Summary

**Migration Status**: ✅ Completed
**Database**: ✅ Updated with new columns
**Local Backend**: ✅ Ready to use

**Remaining Task**: Update Render environment variables and redeploy

**After Render Update**: Production backend will work with password authentication! 🚀
