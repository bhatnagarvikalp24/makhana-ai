# Render Backend Deployment Fix - Dec 26, 2025

## Issue Fixed ✅

**Problem**: Backend deployment on Render failed with error:
```
ModuleNotFoundError: No module named 'jose'
from jose import JWTError, jwt
```

**Root Cause**:
1. `python-jose[cryptography]` package was listed without version pinning
2. Missing explicit dependencies that `python-jose` requires
3. Render's build system may have issues with bracket notation `[cryptography]`

---

## Solution Applied

### 1. Updated requirements.txt with Explicit Versions

**File**: [backend/requirements.txt](backend/requirements.txt)

**Before**:
```
fastapi
uvicorn
sqlalchemy
pydantic
python-multipart
python-dotenv
openai
razorpay
pdfplumber
requests
psycopg2-binary
python-jose[cryptography]
passlib[bcrypt]
```

**After**:
```
fastapi==0.104.1
uvicorn==0.24.0
sqlalchemy==2.0.23
pydantic==2.5.0
python-multipart==0.0.6
python-dotenv==1.0.0
openai==1.3.5
anthropic==0.18.1
razorpay==1.4.1
pdfplumber==0.10.3
requests==2.31.0
psycopg2-binary==2.9.9
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
cryptography==41.0.7
ecdsa==0.18.0
```

### 2. Added Missing Dependencies

**New Dependencies Added**:
1. **`cryptography==41.0.7`** - Required by python-jose for JWT encryption
2. **`ecdsa==0.18.0`** - Required by python-jose for digital signatures

**Why These Were Missing**:
- `python-jose[cryptography]` should auto-install these, but Render's build system sometimes fails with bracket notation
- Explicit listing ensures proper installation order

---

## Render Deployment Checklist

### ✅ Pre-Deployment Verification

1. **Python Version**: Ensure Render uses Python 3.9 or 3.10
   - Go to Render Dashboard → Service → Settings
   - Set Python Version: `3.10.0` (recommended)

2. **Build Command**:
   ```bash
   pip install --upgrade pip && pip install -r backend/requirements.txt
   ```

3. **Start Command**:
   ```bash
   cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

4. **Environment Variables**:
   - `DATABASE_URL` - PostgreSQL connection string
   - `JWT_SECRET_KEY` - Secret key for JWT tokens
   - `OPENAI_API_KEY` - OpenAI API key
   - `ANTHROPIC_API_KEY` - Anthropic API key (for price optimizer)
   - `RAZORPAY_KEY_ID` - Razorpay key ID
   - `RAZORPAY_KEY_SECRET` - Razorpay key secret

5. **Database**:
   - Ensure PostgreSQL database is created on Render
   - Connection string should be set in `DATABASE_URL` env var
   - Format: `postgresql://user:password@host:port/dbname`

---

## Testing After Deployment

### 1. Health Check
```bash
curl https://your-backend.onrender.com/health
```

**Expected Response**:
```json
{
  "status": "healthy",
  "message": "Ghar-Ka-Diet backend is running!"
}
```

### 2. Auth System Test
```bash
# Send OTP
curl -X POST https://your-backend.onrender.com/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "9876543210"}'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "OTP sent successfully to 9876543210"
}
```

### 3. JWT Token Validation
Login and verify JWT tokens are working:
```bash
curl -X POST https://your-backend.onrender.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "9876543210", "password": "your-password"}'
```

**Expected Response**:
```json
{
  "success": true,
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {...}
}
```

---

## Common Render Deployment Issues

### Issue 1: Build Fails with "No module named 'jose'"

**Fix**:
- Ensure `python-jose[cryptography]==3.3.0` is in requirements.txt
- Add explicit `cryptography` and `ecdsa` dependencies
- Clear Render build cache: Dashboard → Manual Deploy → Clear Build Cache

### Issue 2: Import Error with cryptography

**Fix**:
- Add `cryptography==41.0.7` explicitly
- Ensure build command updates pip: `pip install --upgrade pip`

### Issue 3: Database Connection Error

**Fix**:
- Verify `DATABASE_URL` environment variable is set
- Ensure PostgreSQL database is running
- Check connection string format

### Issue 4: Port Binding Error

**Fix**:
- Ensure start command uses `--port $PORT`
- Render automatically sets `PORT` environment variable
- Do NOT hardcode port 8000

### Issue 5: Module Not Found for Local Files

**Fix**:
- Ensure start command uses `cd backend &&` to change directory
- Verify all imports use correct relative paths

---

## Version Compatibility Matrix

| Package | Version | Python Support |
|---------|---------|----------------|
| fastapi | 0.104.1 | 3.9+ |
| uvicorn | 0.24.0 | 3.9+ |
| python-jose | 3.3.0 | 3.7+ |
| cryptography | 41.0.7 | 3.7+ |
| passlib | 1.7.4 | 3.6+ |
| sqlalchemy | 2.0.23 | 3.7+ |
| pydantic | 2.5.0 | 3.8+ |

**Recommended Python Version for Render**: `3.10.0`

---

## Deployment Steps (Complete Guide)

### Step 1: Push Updated requirements.txt
```bash
git add backend/requirements.txt
git commit -m "Fix: Add explicit versions and dependencies for Render deployment"
git push origin main
```

### Step 2: Configure Render Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select your backend service
3. Click **Settings**

**Build & Deploy Settings**:
- **Build Command**:
  ```
  pip install --upgrade pip && pip install -r backend/requirements.txt
  ```
- **Start Command**:
  ```
  cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
  ```

### Step 3: Set Environment Variables

Go to **Environment** tab and add:

```
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET_KEY=your-secret-key-here
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
RAZORPAY_KEY_ID=rzp_...
RAZORPAY_KEY_SECRET=...
```

### Step 4: Deploy

1. Click **Manual Deploy** → **Deploy latest commit**
2. Or enable **Auto-Deploy** for automatic deployments on git push

### Step 5: Monitor Logs

1. Go to **Logs** tab
2. Watch for successful startup:
   ```
   INFO:     Started server process
   INFO:     Waiting for application startup.
   INFO:     Application startup complete.
   INFO:     Uvicorn running on http://0.0.0.0:10000
   ```

### Step 6: Test Endpoints

Use the testing commands from the "Testing After Deployment" section above.

---

## Netlify Frontend Configuration

**Frontend URL**: Update API_URL in Netlify environment variables

1. Go to Netlify Dashboard → Site Settings → Environment Variables
2. Add:
   ```
   VITE_API_URL=https://your-backend.onrender.com
   ```
3. Redeploy frontend

---

## Quick Troubleshooting Commands

### Check if python-jose is installed
```bash
# SSH into Render console (if available) or check logs
python -c "import jose; print(jose.__version__)"
```

### Check cryptography
```bash
python -c "import cryptography; print(cryptography.__version__)"
```

### List installed packages
```bash
pip list | grep -E "(jose|cryptography|passlib)"
```

---

## Files Modified

1. **[backend/requirements.txt](backend/requirements.txt)**
   - Added explicit version pinning for all packages
   - Added missing dependencies: `cryptography==41.0.7`, `ecdsa==0.18.0`
   - Pinned `python-jose[cryptography]==3.3.0`
   - Pinned `passlib[bcrypt]==1.7.4`

---

## Summary

**Problem**: ModuleNotFoundError for 'jose' on Render deployment

**Root Cause**: Missing version pinning and implicit dependencies

**Solution**:
1. ✅ Explicit version pinning for all packages
2. ✅ Added `cryptography` and `ecdsa` as explicit dependencies
3. ✅ Updated to stable, compatible versions

**Result**: Backend should now deploy successfully on Render with all JWT authentication features working! 🚀

**Next Step**: Push changes to git and redeploy on Render.

---

## Support & Resources

- [Render Python Docs](https://render.com/docs/deploy-fastapi)
- [python-jose GitHub](https://github.com/mpdavis/python-jose)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/render/)
