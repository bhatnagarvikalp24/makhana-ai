# YouTube API Key Setup Guide

## Overview
The recipe video feature requires a YouTube Data API v3 key to fetch cooking tutorial videos for meals.

## Getting a YouTube API Key

### Step 1: Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable billing (YouTube API has a free quota)

### Step 2: Enable YouTube Data API v3
1. Navigate to **APIs & Services** → **Library**
2. Search for "YouTube Data API v3"
3. Click **Enable**

### Step 3: Create API Key
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **API Key**
3. Copy your API key
4. (Optional) Restrict the API key to YouTube Data API v3 for security

## Setting Up Locally

### Option 1: Environment Variable (Recommended)
```bash
export YOUTUBE_API_KEY="your-api-key-here"
```

### Option 2: .env File
Create a `.env` file in the `backend/` directory:
```
YOUTUBE_API_KEY=your-api-key-here
```

The backend automatically loads from `.env` using `python-dotenv`.

## Setting Up on Render (Production)

### Step 1: Get Your API Key
Follow steps above to get your YouTube API key.

### Step 2: Add to Render Environment Variables
1. Go to your Render dashboard: https://dashboard.render.com/
2. Select your backend service
3. Go to **Environment** tab
4. Click **Add Environment Variable**
5. Add:
   - **Key:** `YOUTUBE_API_KEY`
   - **Value:** Your API key (paste it here)
6. Click **Save Changes**
7. Render will automatically redeploy with the new environment variable

### Step 3: Verify
After deployment, test the recipe video feature:
- Generate a diet plan
- Click "Watch Recipe" on any meal
- Video should load (not show fallback search link)

## API Quota Limits

**Free Tier:**
- 10,000 units per day
- Each search request = 100 units
- ~100 video searches per day

**If you exceed quota:**
- The app will automatically fallback to YouTube search links
- Users can still access videos, just not embedded

## Troubleshooting

### Issue: "API key not configured" message
**Solution:** Make sure `YOUTUBE_API_KEY` is set in Render environment variables

### Issue: "403 Forbidden" error
**Possible causes:**
- API key is invalid
- API key restrictions are too strict
- Quota exceeded

**Solution:**
- Verify API key in Google Cloud Console
- Check API key restrictions
- Check quota usage in Google Cloud Console

### Issue: Videos not loading
**Solution:**
- Check backend logs for YouTube API errors
- Verify API key is correctly set
- Test API key directly: `https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&key=YOUR_KEY`

## Testing Locally

1. Set your API key:
   ```bash
   export YOUTUBE_API_KEY="your-key-here"
   ```

2. Start backend:
   ```bash
   cd backend
   uvicorn main:app --reload
   ```

3. Test endpoint:
   ```bash
   curl -X POST http://localhost:8000/get-recipe-video \
     -H "Content-Type: application/json" \
     -d '{"meal_name": "Palak Paneer", "language": "any"}'
   ```

4. Should return video data with `video_id` and `embed_url`

## Security Notes

- **Never commit API keys to git**
- Use environment variables for all API keys
- Consider restricting API key to specific IPs/domains in production
- Monitor API usage in Google Cloud Console


