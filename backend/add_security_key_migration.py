"""
Migration script to add security_key column to users table
Run this once to enable password recovery feature
"""

import sqlite3
from pathlib import Path

def migrate_database():
    """Add security_key column to users table"""

    db_path = Path(__file__).parent / "gharkadiet.db"

    print(f"🔄 Migrating database: {db_path}")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Check if column already exists
        cursor.execute("PRAGMA table_info(users)")
        columns = [row[1] for row in cursor.fetchall()]

        if 'security_key' in columns:
            print("✅ security_key column already exists")
        else:
            # Add security_key column
            print("📝 Adding security_key column to users table...")
            cursor.execute("""
                ALTER TABLE users
                ADD COLUMN security_key VARCHAR
            """)
            conn.commit()
            print("✅ security_key column added successfully")

        # Verify the change
        cursor.execute("PRAGMA table_info(users)")
        columns = [row[1] for row in cursor.fetchall()]
        print(f"\n📊 Current users table columns:")
        for col in columns:
            print(f"  - {col}")

        print("\n✅ Migration complete!")

    except Exception as e:
        print(f"❌ Migration error: {e}")
        conn.rollback()

    finally:
        conn.close()

if __name__ == "__main__":
    migrate_database()
