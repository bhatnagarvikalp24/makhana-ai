"""
Database Migration: Add password authentication columns
Run this script to update existing database schema to support password authentication
"""

import os
from sqlalchemy import create_engine, text, inspect
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def migrate_database():
    """Add password_hash and security_key columns to users table if they don't exist"""

    # Get database URL from environment
    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        print("❌ ERROR: DATABASE_URL not found in environment variables")
        print("Please set DATABASE_URL in your .env file or environment")
        return False

    print(f"🔗 Connecting to database...")
    print(f"   URL: {database_url[:20]}...{database_url[-20:]}")

    try:
        # Create engine
        engine = create_engine(database_url)

        # Check current schema
        inspector = inspect(engine)

        if 'users' not in inspector.get_table_names():
            print("❌ ERROR: 'users' table does not exist!")
            print("Please run the main application first to create tables")
            return False

        # Get current columns
        current_columns = [col['name'] for col in inspector.get_columns('users')]
        print(f"\n📋 Current columns in 'users' table:")
        for col in current_columns:
            print(f"   - {col}")

        # Check what needs to be added
        missing_columns = []

        if 'password_hash' not in current_columns:
            missing_columns.append('password_hash')

        if 'security_key' not in current_columns:
            missing_columns.append('security_key')

        if not missing_columns:
            print("\n✅ Database schema is already up to date!")
            print("   All required columns exist.")
            return True

        print(f"\n🔧 Missing columns detected: {', '.join(missing_columns)}")
        print("   Adding missing columns...")

        # Add missing columns
        with engine.connect() as conn:
            # Start transaction
            trans = conn.begin()

            try:
                if 'password_hash' not in current_columns:
                    print("   Adding 'password_hash' column...")
                    conn.execute(text("""
                        ALTER TABLE users
                        ADD COLUMN password_hash VARCHAR(255)
                    """))
                    print("   ✅ Added 'password_hash' column")

                if 'security_key' not in current_columns:
                    print("   Adding 'security_key' column...")
                    conn.execute(text("""
                        ALTER TABLE users
                        ADD COLUMN security_key VARCHAR(255)
                    """))
                    print("   ✅ Added 'security_key' column")

                # Commit transaction
                trans.commit()
                print("\n✅ Migration completed successfully!")

                # Verify changes
                inspector = inspect(engine)
                new_columns = [col['name'] for col in inspector.get_columns('users')]
                print(f"\n📋 Updated columns in 'users' table:")
                for col in new_columns:
                    print(f"   - {col}")

                return True

            except Exception as e:
                trans.rollback()
                print(f"\n❌ Migration failed: {e}")
                return False

    except Exception as e:
        print(f"\n❌ Database connection error: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("DATABASE MIGRATION: Add Password Authentication Columns")
    print("=" * 60)
    print()

    success = migrate_database()

    print()
    print("=" * 60)
    if success:
        print("✅ MIGRATION COMPLETED SUCCESSFULLY")
        print()
        print("Next steps:")
        print("1. Restart your backend server")
        print("2. Test signup with password authentication")
        print("3. Existing users can set passwords via forgot password flow")
    else:
        print("❌ MIGRATION FAILED")
        print()
        print("Please check the error messages above and:")
        print("1. Verify DATABASE_URL is correct")
        print("2. Ensure database is accessible")
        print("3. Check database permissions")
    print("=" * 60)
