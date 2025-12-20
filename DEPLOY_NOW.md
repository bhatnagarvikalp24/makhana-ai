# 🚀 Production Deployment - Quick Guide

## ✅ Pre-Deployment Checklist

- [x] Frontend build completed successfully
- [x] Build output in `frontend/dist/` is ready
- [x] Backend code is committed to git
- [x] API configuration points to production backend

---

## 📦 Frontend Deployment (Netlify)

### Option 1: Deploy via Netlify UI (Recommended - Easiest)

1. **Open Netlify Dashboard:**
   - Go to: https://app.netlify.com/
   - Log in to your account

2. **Navigate to Your Site:**
   - Click on your diet planner site
   - Go to the **"Deploys"** tab

3. **Deploy the Build:**
   - **Method A - Drag & Drop:**
     - Drag the `frontend/dist` folder from your computer
     - Drop it into the Netlify deploy area
     - Wait for upload and deployment (~1-2 minutes)
   
   - **Method B - Trigger Deploy:**
     - Click **"Trigger deploy"** button
     - Select **"Deploy site"**
     - Netlify will build from your git repository

4. **Verify Deployment:**
   - Wait for "Published" status
   - Visit your site URL to confirm it's live

### Option 2: Deploy via Git Push (If Auto-Deploy Enabled)

If you have auto-deploy enabled on Netlify:

```bash
# Make sure you're on main branch
git checkout main

# Push to trigger deployment
git push origin main
```

Netlify will automatically build and deploy in ~2-3 minutes.

---

## 🔄 Backend Deployment (Render)

**Backend auto-deploys automatically** when you push to main branch.

### Verify Backend Deployment:

1. **Check if changes are pushed:**
   ```bash
   git status  # Should show "working tree clean"
   git log --oneline -1  # Check latest commit
   ```

2. **If you have uncommitted backend changes:**
   ```bash
   git add backend/
   git commit -m "Deploy backend updates"
   git push origin main
   ```

3. **Monitor Render Deployment:**
   - Go to: https://dashboard.render.com/
   - Check your backend service status
   - Deployment takes ~3-5 minutes

4. **Test Backend:**
   - Visit: https://makhana-ai.onrender.com/health
   - Should return: `{"status": "healthy"}`

---

## 🧪 Post-Deployment Testing

### Test Frontend:
- [ ] Visit your Netlify site URL
- [ ] Landing page loads correctly
- [ ] Can submit user form
- [ ] Diet plan generates successfully
- [ ] All features work (meal swap, grocery list, etc.)

### Test Backend:
- [ ] Health check: `https://makhana-ai.onrender.com/health`
- [ ] API docs: `https://makhana-ai.onrender.com/docs`
- [ ] Test diet generation endpoint

### Test Integration:
- [ ] Frontend can communicate with backend
- [ ] No CORS errors in browser console
- [ ] All API calls succeed

---

## 📍 Current Configuration

**Backend URL:** `https://makhana-ai.onrender.com`  
**Frontend API Config:** Automatically switches to production URL when deployed  
**Build Output:** `frontend/dist/` (ready for deployment)

---

## 🆘 Troubleshooting

### Frontend Not Deploying?
- Check Netlify build logs for errors
- Verify `netlify.toml` configuration
- Ensure `frontend/dist` folder exists

### Backend Not Updating?
- Check Render dashboard for deployment status
- Verify environment variables are set
- Check Render logs for errors

### API Connection Issues?
- Verify backend is running: `https://makhana-ai.onrender.com/health`
- Check CORS configuration in backend
- Verify API_BASE_URL in frontend build

---

## ✅ Deployment Complete!

Once both frontend and backend are deployed:
1. Test all features on production
2. Monitor for any errors
3. Share the live URL with users

**Last Updated:** $(date)

