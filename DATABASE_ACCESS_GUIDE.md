# Database Access Guide - Neon PostgreSQL

## 🎯 Quick Stats (No Setup Required)

The easiest way to check your database:

**Visit:** https://makhana-ai.onrender.com/admin/stats

This shows:
- Total users
- Total diet plans
- Total saved plans
- Last 10 users (with masked phone numbers)
- Last 10 plans

**Example output:**
```json
{
  "stats": {
    "total_users": 25,
    "total_plans": 42,
    "total_saved_plans": 18
  },
  "recent_users": [
    {
      "id": 25,
      "name": "Rahul Kumar",
      "phone": "9876****21",
      "created_at": "2025-12-18T10:30:00"
    }
  ]
}
```

---

## 🌐 Method 1: Neon Web Console (Easiest)

### Step 1: Access Neon Dashboard
1. Go to: https://console.neon.tech/
2. Log in with your account
3. Select your project (should see it in the dashboard)

### Step 2: Navigate to SQL Editor
1. Click **"SQL Editor"** in the left sidebar
2. You'll see a query editor

### Step 3: Run Queries

**View all users:**
```sql
SELECT id, name, phone, email, created_at
FROM users
ORDER BY created_at DESC
LIMIT 20;
```

**View all diet plans:**
```sql
SELECT id, user_id, created_at
FROM diet_plans
ORDER BY created_at DESC
LIMIT 20;
```

**View saved plans with user info:**
```sql
SELECT
  sp.id,
  sp.plan_name,
  u.name as user_name,
  u.phone,
  sp.created_at
FROM saved_plans sp
JOIN users u ON sp.user_id = u.id
ORDER BY sp.created_at DESC;
```

**Get statistics:**
```sql
SELECT
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM diet_plans) as total_plans,
  (SELECT COUNT(*) FROM saved_plans) as total_saved_plans;
```

### Step 4: Browse Tables Visually
1. Click **"Tables"** in the left sidebar
2. Click on any table name (users, diet_plans, saved_plans)
3. You can see the schema and data structure

---

## 💻 Method 2: TablePlus (Best GUI Tool)

### Why TablePlus?
- Beautiful, modern interface
- Fast and easy to use
- Free for basic use
- Better than pgAdmin/DBeaver

### Installation
**Mac:**
```bash
brew install --cask tableplus
```
**Or download:** https://tableplus.com/

**Windows/Linux:** Download from https://tableplus.com/

### Get Connection Details from Neon

1. Go to Neon Console: https://console.neon.tech/
2. Select your project
3. Click **"Dashboard"** or **"Connection Details"**
4. You'll see something like:

```
Host: ep-cool-mountain-123456.us-east-2.aws.neon.tech
Database: neondb
User: yourusername
Password: yourpassword
Port: 5432
```

**Or copy the connection string:**
```
postgresql://username:password@ep-xxx.neon.tech/dbname?sslmode=require
```

### Connect in TablePlus

**Option A: Use Connection String**
1. Open TablePlus
2. Click **"Create a new connection"**
3. Select **"Import from URL"**
4. Paste your connection string
5. Click **"Connect"**

**Option B: Manual Entry**
1. Open TablePlus
2. Click **"Create a new connection"** → **"PostgreSQL"**
3. Fill in:
   - **Name:** Ghar-Ka-Khana DB
   - **Host:** (from Neon)
   - **Port:** 5432
   - **User:** (from Neon)
   - **Password:** (from Neon)
   - **Database:** (from Neon, usually "neondb")
   - **SSL Mode:** Require
4. Click **"Test"** then **"Connect"**

### Browse Your Data
- Left sidebar shows all tables
- Click any table to view data
- Double-click cells to edit
- Use SQL tab for custom queries
- Export to CSV/JSON easily

---

## 🔐 Method 3: Using psql (Terminal)

If you prefer command line:

### Install psql
**Mac:**
```bash
brew install postgresql
```

**Ubuntu/Debian:**
```bash
sudo apt-get install postgresql-client
```

### Connect to Neon
```bash
psql "postgresql://username:password@ep-xxx.neon.tech/dbname?sslmode=require"
```

### Common psql Commands
```sql
-- List all tables
\dt

-- Describe table structure
\d users

-- View data
SELECT * FROM users LIMIT 10;

-- Exit
\q
```

---

## 📊 Method 4: Using Python Script

If you want to run queries programmatically:

```python
# install: pip install psycopg2-binary
import psycopg2
import os

# Use your DATABASE_URL from .env
DATABASE_URL = os.getenv("DATABASE_URL")

# Connect
conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# Query
cur.execute("SELECT COUNT(*) FROM users")
total_users = cur.fetchone()[0]
print(f"Total users: {total_users}")

# Close
cur.close()
conn.close()
```

---

## 🛠️ Useful SQL Queries

### Get User Count by Day
```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as new_users
FROM users
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 30;
```

### Find Most Active Users
```sql
SELECT
  u.name,
  u.phone,
  COUNT(dp.id) as total_plans
FROM users u
LEFT JOIN diet_plans dp ON u.id = dp.user_id
GROUP BY u.id, u.name, u.phone
ORDER BY total_plans DESC
LIMIT 10;
```

### Get Plans Created Today
```sql
SELECT COUNT(*) as plans_today
FROM diet_plans
WHERE DATE(created_at) = CURRENT_DATE;
```

### View User's Complete Data
```sql
SELECT
  u.name,
  u.phone,
  u.email,
  COUNT(DISTINCT dp.id) as total_plans,
  COUNT(DISTINCT sp.id) as saved_plans,
  u.created_at
FROM users u
LEFT JOIN diet_plans dp ON u.id = dp.user_id
LEFT JOIN saved_plans sp ON u.id = sp.user_id
WHERE u.phone = '9876543210'  -- Replace with actual phone
GROUP BY u.id;
```

### Delete Test Data (Careful!)
```sql
-- Delete guest users only
DELETE FROM users WHERE phone LIKE 'guest_%';

-- Delete specific user and their plans (cascades)
DELETE FROM users WHERE id = 123;
```

---

## 🔍 Neon Dashboard Features

### Tables View
- Shows all tables with row counts
- Click any table to see schema
- Can add/remove columns

### Query History
- See all queries you've run
- Re-run previous queries
- Export results

### Monitoring
- Connection count
- Query performance
- Storage usage

### Backups
- Free tier: 7 days of backups
- Can restore to any point in time
- Go to "Branches" → "Create branch from backup"

---

## 📈 Monitoring Tips

### Check Database Size
```sql
SELECT
  pg_size_pretty(pg_database_size('neondb')) as db_size;
```

### Check Table Sizes
```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Check Active Connections
```sql
SELECT
  COUNT(*) as active_connections,
  MAX(backend_start) as last_connection
FROM pg_stat_activity
WHERE datname = 'neondb';
```

---

## 🚨 Common Issues

### "SSL connection required"
- Make sure `sslmode=require` is in your connection string
- In TablePlus, set SSL Mode to "Require"

### "Connection timeout"
- Check if your IP is allowed (Neon allows all by default)
- Verify DATABASE_URL is correct
- Check Neon dashboard for service status

### "Too many connections"
- Free tier limit: 100 connections
- Check active connections in Neon dashboard
- Our pool_size=5 should be fine

---

## 🎯 Recommended Workflow

**For Quick Checks:**
- Use `/admin/stats` endpoint

**For Data Browsing:**
- Use Neon Web Console SQL Editor

**For Heavy Analysis:**
- Use TablePlus

**For Automation:**
- Use Python scripts

---

## 📝 Quick Reference

| Task | Best Method |
|------|-------------|
| Quick stats | `/admin/stats` endpoint |
| Browse data | Neon Web Console |
| Edit data | TablePlus |
| Run complex queries | TablePlus or Neon Console |
| Export data | TablePlus (CSV/JSON) |
| Backup database | Neon Console → Branches |

---

## 🔗 Important Links

- **Neon Console:** https://console.neon.tech/
- **TablePlus:** https://tableplus.com/
- **Stats Endpoint:** https://makhana-ai.onrender.com/admin/stats
- **Health Check:** https://makhana-ai.onrender.com/health

---

## 💡 Pro Tips

1. **Bookmark `/admin/stats`** - Fastest way to check data
2. **Use TablePlus themes** - Makes viewing data nicer
3. **Save common queries** - Both Neon and TablePlus support query snippets
4. **Enable query history** - In Neon settings
5. **Set up alerts** - Neon can alert on high connection count

---

Need to run a specific query? Let me know and I'll write it for you! 🚀
