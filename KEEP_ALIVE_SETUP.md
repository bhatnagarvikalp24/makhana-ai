# Keep Backend Alive - Setup Guide

## Problem
Render free tier sleeps your backend after 15 minutes of inactivity, causing 30-60 second cold starts for the first user.

## ✅ Solutions Implemented

### 1. **GitHub Actions Keep-Alive** (Automatic)
**File:** `.github/workflows/keep-alive.yml`

**What it does:**
- Pings your backend every 10 minutes automatically
- Runs in GitHub's infrastructure (free)
- Keeps backend warm 24/7

**Status:** ✅ Already deployed and running

**How to verify:**
1. Go to your GitHub repo: https://github.com/bhatnagarvikalp24/makhana-ai
2. Click "Actions" tab
3. You should see "Keep Backend Alive" workflow running every 10 minutes

**Manual trigger:**
- Go to Actions → Keep Backend Alive → "Run workflow"

---

### 2. **Frontend Wake-Up Call** (Automatic)
**File:** `frontend/src/pages/Landing.jsx`

**What it does:**
- When a user visits your landing page, it immediately pings `/health`
- Backend wakes up in the background
- By the time user clicks "Get Started", backend is ready!

**Status:** ✅ Already deployed on Netlify

---

### 3. **External Monitoring (Optional - Recommended)**

For extra reliability, add one of these services:

#### **Option A: UptimeRobot** (Most Popular)
1. Go to https://uptimerobot.com/
2. Sign up (free)
3. Add New Monitor:
   - **Type:** HTTP(s)
   - **URL:** `https://makhana-ai.onrender.com/health`
   - **Interval:** 5 minutes
4. Click "Create Monitor"

**Benefits:**
- Pings every 5 minutes (more frequent than GitHub Actions)
- Sends you alerts if backend goes down
- Nice dashboard to monitor uptime

#### **Option B: Cron-Job.org**
1. Go to https://cron-job.org/en/
2. Sign up (free)
3. Create cronjob:
   - **URL:** `https://makhana-ai.onrender.com/health`
   - **Schedule:** Every 5 minutes
   - **Method:** GET

#### **Option C: BetterUptime**
1. Go to https://betterstack.com/better-uptime
2. Free tier includes uptime monitoring
3. Set up monitor for your backend
4. Bonus: Creates a public status page

---

## 📊 Current Setup Status

| Method | Status | Frequency | Cost |
|--------|--------|-----------|------|
| GitHub Actions | ✅ Active | Every 10 min | Free |
| Frontend Wake-Up | ✅ Active | On page load | Free |
| UptimeRobot | ⚪ Optional | Every 5 min | Free |

---

## 🎯 Recommendation

**For Best Results:**
1. ✅ Keep GitHub Actions running (already set up)
2. ✅ Keep Frontend wake-up (already deployed)
3. ➕ **Add UptimeRobot** for extra reliability (takes 2 minutes)

**Why add UptimeRobot?**
- Pings more frequently (5 min vs 10 min)
- Alerts you if backend goes down
- Works even if GitHub Actions fails
- **Total cost: Still $0!**

---

## 🧪 Testing

### Test if backend is staying awake:

```bash
# Check health endpoint
curl https://makhana-ai.onrender.com/health

# Should respond in < 1 second if awake
# Will take 30-60 seconds if sleeping
```

### Check GitHub Actions:
1. Go to: https://github.com/bhatnagarvikalp24/makhana-ai/actions
2. Look for "Keep Backend Alive" workflow
3. Should show green checkmarks every 10 minutes

### Check frontend wake-up:
1. Visit: https://makhana-ai.netlify.app
2. Open browser console (F12)
3. Should see: "✅ Backend is awake"

---

## 🚀 Impact

**Before:**
- First user: 30-60 second wait
- Backend sleeps every 15 minutes
- Poor user experience

**After:**
- First user: < 2 second response
- Backend stays awake 24/7
- Professional experience

---

## 💡 Future Upgrade Path

When you're ready to eliminate this complexity:

**Render Starter Plan: $7/month**
- No sleep, ever
- Faster CPU
- 512 MB RAM
- Worth it when you have 50+ daily users

But for now, **free tier + keep-alive = excellent!** ✅

---

## 📝 Maintenance

**Nothing required!** All systems are automatic.

**Optional monitoring:**
- Check GitHub Actions weekly
- Set up UptimeRobot alerts to email/SMS

---

## ❓ Troubleshooting

**Backend still sleeping?**
1. Check GitHub Actions is running
2. Verify workflow has permissions (Settings → Actions → General → Read/Write)
3. Add UptimeRobot as backup

**GitHub Actions not running?**
1. Go to repo Settings → Actions → General
2. Enable "Allow all actions"
3. Manually trigger workflow to test

**Want to check uptime?**
```bash
# See when backend last responded
curl -I https://makhana-ai.onrender.com/health
```

---

## 🎉 Summary

You now have **3 layers of protection** against backend sleep:

1. ✅ GitHub Actions (every 10 min)
2. ✅ Frontend wake-up (on user visit)
3. ⚪ UptimeRobot (optional, every 5 min)

**Result:** Near-zero cold starts, professional user experience, all for free! 🚀
