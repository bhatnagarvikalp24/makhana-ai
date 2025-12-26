# Netlify Environment Variable Setup - Production Fix

## Problem
Users accessing your deployed Netlify frontend are getting authentication errors because the frontend is trying to connect to `localhost:8000` instead of your Render backend.

---

## Solution: Set Environment Variable in Netlify

### Step 1: Go to Netlify Dashboard

1. Visit [https://app.netlify.com](https://app.netlify.com)
2. Login to your account
3. Click on your site (the frontend deployment)

### Step 2: Navigate to Environment Variables

1. Click **Site configuration** (or **Site settings**)
2. In the left sidebar, click **Environment variables**
3. Click **Add a variable** (or **Add environment variables**)

### Step 3: Add the API URL Variable

**Variable name**:
```
VITE_API_URL
```

**Variable value**:
```
https://makhana-ai.onrender.com
```

Click **Save** or **Create variable**

### Step 4: Redeploy Your Site

After adding the environment variable, you need to trigger a new deployment:

**Option A: Manual Deploy**
1. Go to **Deploys** tab
2. Click **Trigger deploy** → **Clear cache and deploy site**

**Option B: Git Push** (if auto-deploy is enabled)
```bash
git commit --allow-empty -m "Trigger Netlify redeploy with env vars"
git push origin main
```

### Step 5: Verify Deployment

1. Wait for deployment to complete (usually 1-2 minutes)
2. Visit your deployed site URL
3. Open browser console (F12) → Network tab
4. Try signing up or logging in
5. Check that API requests go to `https://makhana-ai.onrender.com` (not localhost)

---

## Visual Guide

```
┌─────────────────────────────────────────────┐
│  Netlify Dashboard                          │
│  ├── Your Site Name                         │
│  │   ├── Site configuration                 │
│  │   │   ├── Environment variables         │
│  │   │   │   ├── VITE_API_URL ←── ADD THIS │
│  │   │   │   │   Value: https://makhana... │
│  │   │   │   └── Save                       │
│  │   ├── Deploys                            │
│  │   │   └── Trigger deploy ←── CLICK THIS │
└─────────────────────────────────────────────┘
```

---

## How It Works

### Before (Production Issue):
```
User Browser
    ↓
Netlify Frontend (deployed)
    ↓
Tries: localhost:8000 ❌ (doesn't exist for users)
    ↓
Error: Network Error / Authentication Failed
```

### After (Fixed):
```
User Browser
    ↓
Netlify Frontend (deployed)
    ↓
Uses: VITE_API_URL from Netlify env vars
    ↓
Connects to: https://makhana-ai.onrender.com ✅
    ↓
Success: API calls work for all users
```

---

## Important Notes

### 1. Build vs Runtime Variables

**Vite** (your frontend framework) uses **build-time** environment variables:
- Variables are embedded during the build process
- Must start with `VITE_` prefix
- Requires rebuild/redeploy when changed
- Not accessible in browser after build (compiled into the code)

**Why redeploy is needed**: Netlify needs to rebuild your app with the new `VITE_API_URL` value.

### 2. Development vs Production

**Local Development** (`.env` file):
```env
VITE_API_URL=https://makhana-ai.onrender.com
```

**Production** (Netlify dashboard):
```
Name: VITE_API_URL
Value: https://makhana-ai.onrender.com
```

Both use the same variable name and value!

### 3. Multiple Environments

If you want different backends for different environments:

**Development** (`.env.development`):
```env
VITE_API_URL=http://localhost:8000
```

**Production** (`.env.production` or Netlify):
```env
VITE_API_URL=https://makhana-ai.onrender.com
```

---

## Troubleshooting

### Issue 1: Still Connecting to localhost After Redeploy

**Cause**: Browser cache or build cache

**Fix**:
1. Clear Netlify build cache: **Trigger deploy** → **Clear cache and deploy site**
2. Clear browser cache: Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. Open in incognito/private window

### Issue 2: Environment Variable Not Working

**Check**:
1. Variable name is exactly `VITE_API_URL` (case-sensitive)
2. Variable name starts with `VITE_` (required by Vite)
3. Site was redeployed after adding variable
4. No typos in the backend URL

**Verify in Netlify**:
1. Go to **Deploys** → Latest deploy
2. Click **Deploy log**
3. Look for environment variables section
4. Should show `VITE_API_URL` is set

### Issue 3: CORS Errors After Fixing

**Cause**: Render backend doesn't allow Netlify frontend origin

**Fix**: Your backend already allows all origins (`allow_origin_regex=r".*"`), so this shouldn't happen. If it does, check Render backend logs.

---

## Verification Checklist

After deploying, verify these work:

- [ ] Visit deployed Netlify site
- [ ] Open browser DevTools (F12) → Network tab
- [ ] Try to sign up with new account
- [ ] Check API request goes to `makhana-ai.onrender.com` (not localhost)
- [ ] Sign up completes successfully
- [ ] Try to login
- [ ] Login works
- [ ] Generate a diet plan
- [ ] All API calls use Render backend

---

## Quick Reference

| Environment | API URL Configuration |
|-------------|----------------------|
| **Local Dev** | Create `frontend/.env` with `VITE_API_URL=https://makhana-ai.onrender.com` |
| **Netlify Production** | Add `VITE_API_URL` in Netlify dashboard → Redeploy |
| **Mobile Testing** | Same as Local Dev (uses laptop's frontend server) |

---

## Common Mistakes to Avoid

❌ **Wrong**: Adding variable without redeploying
✅ **Correct**: Add variable → Trigger new deploy

❌ **Wrong**: Variable name `API_URL` (missing VITE_ prefix)
✅ **Correct**: Variable name `VITE_API_URL`

❌ **Wrong**: Testing immediately (cached build)
✅ **Correct**: Wait for deploy to finish, hard refresh browser

❌ **Wrong**: Using `process.env.VITE_API_URL` in code
✅ **Correct**: Using `import.meta.env.VITE_API_URL` (Vite syntax)

---

## Summary

**For Production Users (Netlify)**:

1. **Add** environment variable in Netlify dashboard:
   - Name: `VITE_API_URL`
   - Value: `https://makhana-ai.onrender.com`

2. **Redeploy** site (Trigger deploy → Clear cache and deploy)

3. **Test** on deployed URL

**That's it!** All users will now connect to your Render backend instead of localhost. 🚀

---

## Additional Resources

- [Netlify Environment Variables Docs](https://docs.netlify.com/environment-variables/overview/)
- [Vite Environment Variables Guide](https://vitejs.dev/guide/env-and-mode.html)
- Your Render Backend: [https://makhana-ai.onrender.com](https://makhana-ai.onrender.com)
- Your Netlify Dashboard: [https://app.netlify.com](https://app.netlify.com)
