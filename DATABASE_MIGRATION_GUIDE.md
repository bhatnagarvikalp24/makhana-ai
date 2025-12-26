# Database Migration Guide - Add Password Authentication

## Problem

Backend showing error:
```
psycopg2.errors.UndefinedColumn: column users.password_hash does not exist
```

**Root Cause**: Your PostgreSQL database on Render was created before password authentication was added. The `users` table is missing `password_hash` and `security_key` columns.

---

## Solution: Run Database Migration

### Option 1: Run Migration Script Locally (Recommended)

**Step 1: Set DATABASE_URL**

Create or update `backend/.env` with your Render PostgreSQL URL:
```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

Get this from:
1. Render Dashboard → Your PostgreSQL database
2. Copy the "External Database URL" or "Internal Database URL"

**Step 2: Run Migration Script**

```bash
cd backend
python migrate_db_add_password.py
```

**Expected Output**:
```
============================================================
DATABASE MIGRATION: Add Password Authentication Columns
============================================================

🔗 Connecting to database...
   URL: postgresql://...

📋 Current columns in 'users' table:
   - id
   - name
   - phone
   - email
   - profile_data
   - medical_issues
   - created_at

🔧 Missing columns detected: password_hash, security_key
   Adding missing columns...
   Adding 'password_hash' column...
   ✅ Added 'password_hash' column
   Adding 'security_key' column...
   ✅ Added 'security_key' column

✅ Migration completed successfully!

📋 Updated columns in 'users' table:
   - id
   - name
   - phone
   - email
   - password_hash
   - security_key
   - profile_data
   - medical_issues
   - created_at

============================================================
✅ MIGRATION COMPLETED SUCCESSFULLY

Next steps:
1. Restart your backend server
2. Test signup with password authentication
3. Existing users can set passwords via forgot password flow
============================================================
```

**Step 3: Verify on Render**

Your Render backend should automatically redeploy and start working!

---

### Option 2: Run Migration via Render Shell

If you can't connect to the database locally:

**Step 1: Open Render Shell**

1. Go to Render Dashboard → Your Backend Service
2. Click **Shell** tab (top right)
3. Wait for shell to connect

**Step 2: Run Migration**

```bash
cd backend
python migrate_db_add_password.py
```

**Step 3: Restart Service**

1. Go to **Manual Deploy**
2. Click **Clear build cache & deploy**

---

### Option 3: Manual SQL Migration

If scripts don't work, run SQL directly:

**Step 1: Connect to Database**

1. Render Dashboard → Your PostgreSQL Database
2. Click **Connect** → Copy connection string
3. Use a PostgreSQL client (pgAdmin, DBeaver, or psql)

**Step 2: Run SQL Commands**

```sql
-- Add password_hash column
ALTER TABLE users
ADD COLUMN password_hash VARCHAR(255);

-- Add security_key column
ALTER TABLE users
ADD COLUMN security_key VARCHAR(255);

-- Verify columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users';
```

**Step 3: Restart Render Service**

---

## Verification

After migration, test these endpoints:

### 1. Health Check
```bash
curl https://makhana-ai.onrender.com/health
```

Expected: `{"status": "healthy", "message": "Ghar-Ka-Diet backend is running!"}`

### 2. Signup
```bash
curl -X POST https://makhana-ai.onrender.com/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9999999999",
    "password": "test123",
    "name": "Test User",
    "security_key": "mykey123"
  }'
```

Expected: Success response with token

### 3. Login
```bash
curl -X POST https://makhana-ai.onrender.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9999999999",
    "password": "test123"
  }'
```

Expected: Success response with token

---

## Existing Users

If you have existing users in the database:

### They Can't Login Yet
- Existing users don't have `password_hash` set (it's NULL)
- They need to use "Forgot Password" flow to set a password

### Migration for Existing Users

**Option A: Users Set Passwords Themselves**
1. User goes to "Forgot Password"
2. Enters phone, security key (if they remember it), and new password
3. Now they can login

**Option B: Reset All Existing Users**

If existing users don't have security keys, you might need to:

1. **Contact them** to create new accounts, OR
2. **Manually set passwords** for them via database update

```sql
-- Update specific user's password (hashed with bcrypt)
UPDATE users
SET password_hash = '$2b$12$...',  -- bcrypt hash of password
    security_key = 'temp_key_123'
WHERE phone = '9876543210';
```

⚠️ **Not recommended**: Better to have users create new accounts or use forgot password flow.

---

## Troubleshooting

### Error: "DATABASE_URL not found"

**Fix**: Add `DATABASE_URL` to `backend/.env`:
```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

### Error: "users table does not exist"

**Cause**: Database is completely empty

**Fix**:
1. Let the main application run once to create tables
2. Or run `python main.py` locally with DATABASE_URL set

### Error: "Permission denied"

**Cause**: Database user doesn't have ALTER TABLE permissions

**Fix**: Use database admin user or run migration as superuser

### Migration Already Ran

If you see:
```
✅ Database schema is already up to date!
   All required columns exist.
```

This means the migration already completed. No action needed!

---

## Files Added

1. **backend/migrate_db_add_password.py** - Migration script
2. **DATABASE_MIGRATION_GUIDE.md** - This guide

---

## Summary

**Problem**: Database missing `password_hash` and `security_key` columns

**Solution**:
1. Run `python backend/migrate_db_add_password.py` with `DATABASE_URL` set
2. Or manually add columns via SQL
3. Restart Render backend

**Result**: Password authentication will work on production! 🚀

---

## Quick Commands

```bash
# Local migration
cd backend
export DATABASE_URL="postgresql://..."  # Your Render DB URL
python migrate_db_add_password.py

# Verify
curl https://makhana-ai.onrender.com/health

# Test signup
curl -X POST https://makhana-ai.onrender.com/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"phone": "9999999999", "password": "test123", "security_key": "key123"}'
```
