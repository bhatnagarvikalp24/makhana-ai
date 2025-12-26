"""
Authentication utilities for OTP-based login system
Development mode - OTP printed in logs (no SMS provider)
"""

import os
import random
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def generate_otp() -> str:
    """Generate a 6-digit OTP"""
    return str(random.randint(100000, 999999))


def send_otp(phone: str, otp: str) -> bool:
    """
    Send OTP - Development mode
    OTP is printed in terminal logs for testing

    For production, integrate SMS provider like:
    - Twilio
    - Amazon SNS
    - Firebase SMS
    - Other alternatives

    Returns True always (development mode)
    """
    print(f"\n{'='*60}")
    print(f"📱 DEVELOPMENT MODE - OTP NOT SENT VIA SMS")
    print(f"Phone: {phone}")
    print(f"🔐 OTP Code: {otp}")
    print(f"Expires in: 5 minutes")
    print(f"{'='*60}\n")
    return True


def create_access_token(user_id: int, phone: str) -> str:
    """
    Create JWT access token for authenticated user

    Args:
        user_id: Database user ID
        phone: User's phone number

    Returns:
        JWT token string
    """
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)

    to_encode = {
        "user_id": user_id,
        "phone": phone,
        "exp": expire
    }

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[dict]:
    """
    Verify JWT token and return payload

    Args:
        token: JWT token string

    Returns:
        Decoded payload dict or None if invalid
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def validate_phone_number(phone: str) -> bool:
    """
    Validate Indian phone number format

    Args:
        phone: Phone number string

    Returns:
        True if valid 10-digit Indian mobile number
    """
    # Remove any spaces or special characters
    phone_cleaned = ''.join(filter(str.isdigit, phone))

    # Check if 10 digits
    if len(phone_cleaned) != 10:
        return False

    # Check if starts with valid Indian mobile prefix (6-9)
    if phone_cleaned[0] not in ['6', '7', '8', '9']:
        return False

    return True


def format_phone_number(phone: str) -> str:
    """
    Format phone number to standard 10-digit format
    Removes spaces, dashes, and country codes
    """
    # Remove all non-digit characters
    phone_cleaned = ''.join(filter(str.isdigit, phone))

    # Remove country code if present (+91)
    if phone_cleaned.startswith('91') and len(phone_cleaned) == 12:
        phone_cleaned = phone_cleaned[2:]

    return phone_cleaned
