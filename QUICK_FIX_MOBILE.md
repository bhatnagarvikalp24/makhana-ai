# Quick Fix for Mobile Authentication Issue

## The Problem

- **Laptop**: Works but shows "network permission" popup
- **Mobile**: Shows "Authentication failed"

**Why**: Your frontend is using `localhost:8000` which only works on the device it's running on.

---

## The Solution (3 Simple Steps)

### Step 1: Create `.env` file

```bash
cd /Users/vikalp.bhatnagar/Desktop/diet-planner/frontend
touch .env
```

### Step 2: Add your Render backend URL

Open the `.env` file and add:

```env
VITE_API_URL=https://your-backend-name.onrender.com
```

**Replace** `your-backend-name` with your actual Render service name.

**Example**:
```env
VITE_API_URL=https://makhana-ai-backend.onrender.com
```

### Step 3: Restart frontend

```bash
# Stop the current dev server (Ctrl+C)
npm run dev
```

---

## Testing

### On Laptop:
1. Go to `http://localhost:5173`
2. Try signing up → Should work without network permission popup

### On Mobile (same WiFi):
1. Find your laptop's IP address:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
   Look for something like: `192.168.1.100`

2. On mobile browser, go to:
   ```
   http://192.168.1.100:5173
   ```

3. Try signing up → Should work now!

---

## Why This Works

Before:
```
Frontend → tries localhost:8000 → fails on mobile ❌
```

After:
```
Frontend → tries your-backend.onrender.com → works everywhere ✅
```

---

## Alternative: Find Your Render Backend URL

If you don't remember your Render backend URL:

1. Go to https://dashboard.render.com
2. Click on your backend service
3. Copy the URL shown at the top (looks like: `https://something.onrender.com`)
4. Use that in your `.env` file

---

## That's It!

After these 3 steps, both laptop and mobile should work perfectly. No more authentication errors! 🚀
