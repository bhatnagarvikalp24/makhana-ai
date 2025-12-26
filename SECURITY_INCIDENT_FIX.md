# Security Incident Fix - Database Credentials Exposed

## ⚠️ CRITICAL: Database Password Exposed on GitHub

GitGuardian detected your Neon PostgreSQL credentials were committed to GitHub.

**Exposed**: `postgresql://neondb_owner:npg_TPih7am8ZULD@...`

**Risk**: Anyone with access to your GitHub repository can now access your database.

---

## 🚨 IMMEDIATE ACTIONS REQUIRED

### Step 1: Reset Neon Database Password (URGENT)

1. **Go to Neon Console**: https://console.neon.tech
2. **Select your project**: `neondb`
3. **Go to Settings** → **Reset password** or **Roles**
4. **Reset the password** for `neondb_owner` user
5. **Copy the new connection string**

### Step 2: Update Local Environment

Replace the DATABASE_URL in `backend/.env` with the NEW connection string from Neon.

**DO NOT commit this file to git!**

### Step 3: Update Render Environment Variables

1. Go to Render Dashboard → Your backend service
2. **Environment** tab
3. Find `DATABASE_URL`
4. **Edit** and replace with NEW connection string
5. **Save**
6. **Redeploy** your backend

### Step 4: Update Netlify Environment Variables

1. Go to Netlify Dashboard → Your frontend site
2. **Site configuration** → **Environment variables**
3. Update `VITE_API_URL` if needed
4. **Redeploy** frontend

---

## 🛡️ Prevent Future Incidents

### 1. Never Commit Secrets to Git

**Files to NEVER commit**:
- `backend/.env` ❌
- Any file with API keys, passwords, tokens ❌

**Always use**:
- `.gitignore` to exclude `.env` files
- Environment variables in deployment platforms

### 2. Check .gitignore

Let's verify `.env` is in `.gitignore`:

```bash
cat .gitignore | grep "\.env"
```

Should show:
```
.env
*.env
.env.*
```

### 3. Remove Secrets from Git History

**Option A: Using git filter-repo (Recommended)**

```bash
# Install git-filter-repo
brew install git-filter-repo  # Mac
# or
pip install git-filter-repo

# Remove all .env files from history
git filter-repo --path backend/.env --invert-paths

# Force push (DANGEROUS - only do this if you're sure)
git push origin --force --all
```

**Option B: Using BFG Repo-Cleaner**

```bash
# Download BFG
# https://rtyley.github.io/bfg-repo-cleaner/

# Remove passwords from history
bfg --replace-text passwords.txt

# Force push
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push origin --force --all
```

**Option C: Delete and Recreate Repository (Easiest)**

If the repository is new and you don't care about history:

1. **Delete GitHub repository**
2. **Create new repository**
3. **Remove .env from local repo**:
   ```bash
   git rm --cached backend/.env
   ```
4. **Commit and push to new repo**

---

## 📋 Security Checklist

After rotating credentials:

- [ ] Changed Neon database password
- [ ] Updated `backend/.env` with new DATABASE_URL (NOT committed)
- [ ] Updated Render environment variables with new DATABASE_URL
- [ ] Redeployed backend on Render
- [ ] Verified backend is working with new credentials
- [ ] Removed `.env` from git history (optional but recommended)
- [ ] Verified `.env` is in `.gitignore`
- [ ] Reviewed all committed files for other secrets

---

## 🔐 Best Practices Going Forward

### 1. Use Environment Variables

**Local Development** (`backend/.env`):
```env
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
# Never commit this file!
```

**Production** (Render/Netlify):
- Add via dashboard
- Never in code

### 2. Use .env.example

Create a template file that CAN be committed:

**`backend/.env.example`**:
```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
OPENAI_API_KEY=sk-your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here
# ... etc
```

This shows what variables are needed without exposing actual secrets.

### 3. Check Before Committing

Before `git push`, always check:

```bash
git diff --cached  # Review what's being committed
```

Look for:
- Passwords
- API keys
- Connection strings
- Tokens

### 4. Use Git Hooks (Optional)

Prevent accidental commits:

```bash
# Create pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
if git diff --cached --name-only | grep -q "\.env$"; then
    echo "ERROR: Attempting to commit .env file!"
    exit 1
fi
EOF

chmod +x .git/hooks/pre-commit
```

---

## 🚨 What If Credentials Are Already Used Maliciously?

Signs of compromise:
- Unexpected database queries
- New users in your database
- Changed data
- High database usage

**If compromised**:
1. **Immediately reset password**
2. **Check database logs** in Neon console
3. **Review database for unauthorized changes**
4. **Consider creating new database** and migrating data
5. **Enable 2FA** on Neon account
6. **Review access logs** on GitHub

---

## 📝 Summary

**What Happened**: Database credentials committed to GitHub

**Risk Level**: 🔴 HIGH - Anyone can access your database

**Immediate Actions**:
1. ✅ Reset Neon database password
2. ✅ Update Render with new DATABASE_URL
3. ✅ Never commit `.env` again

**Long-term**:
- Always use `.gitignore` for secrets
- Use environment variables on deployment platforms
- Create `.env.example` templates instead

---

## 🆘 Need Help?

If you're unsure about any step or need assistance:

1. **Neon Support**: https://neon.tech/docs
2. **GitHub Secret Scanning**: https://docs.github.com/code-security/secret-scanning
3. **GitGuardian**: https://www.gitguardian.com

**Priority**: Do Step 1 (Reset Password) IMMEDIATELY. Other steps can follow.
