# Authentication Module for Rental Management System
import random
from datetime import datetime, timedelta
from flask import session
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User, OTPVerification
from utilities import send_email
from datetime import datetime
import uuid
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User
import logging
def signup_user(email, username, password, account_type, contact_no):
    """
    Create a new user account with unique_id generation.
    Handles existing unverified accounts by resending OTP.
    
    Args:
        email (str): User's email address
        username (str): User's chosen username
        password (str): Plain text password (will be hashed)
        account_type (str): 'Owner' or 'Tenant'
        contact_no (str): User's contact number
    
    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        # Normalize email
        email = email.lower().strip()
        
        # Check if user already exists
        existing_user = User.query.filter_by(email=email).first()
        
        if existing_user:
            if not existing_user.is_verified:
                # Option 1: Resend OTP for unverified account
                _create_and_email_otp(email, purpose="email_signup")
                return {
                    "status": "success",
                    "message": f"Account exists but unverified. We've sent a new verification code to {email}.",
                    "user_id": str(existing_user.unique_id),
                    "username": existing_user.username,
                    "account_type": existing_user.account_type
                }, 200
            else:
                # Account exists and is verified
                return {"status": "fail", "message": "User with this email already exists"}, 409

        # Check username availability
        if User.query.filter_by(username=username).first():
            return {"status": "fail", "message": "Username already taken"}, 409

        # Validate account type
        if account_type not in ['Owner', 'Tenant']:
            return {"status": "fail", "message": "Account type must be 'Owner' or 'Tenant'"}, 400

        # Generate unique_id with format: prefix-username-randomhex
        prefix = '0' if account_type == 'Owner' else '1'
        unique_id = f"{prefix}-{username}-{uuid.uuid4().hex[:8]}"
        
        # Ensure unique_id is truly unique
        while User.query.filter_by(unique_id=unique_id).first():
            unique_id = f"{prefix}-{username}-{uuid.uuid4().hex[:8]}"

        # Create new user
        user = User(
            unique_id=unique_id,
            email=email,
            username=username.strip(),
            account_type=account_type,
            password_hash=generate_password_hash(password),
            contact_no=contact_no.strip(),
            created_at=datetime.utcnow()
        )
        
        db.session.add(user)
        db.session.commit()
        _create_and_email_otp(email, purpose="email_signup")
        
        return {
            "status": "success",
            "message": f"{account_type} account created. "
                        "We've e-mailed a 6-digit code—verify before logging in.",
            "user_id": unique_id,
            "username": username,
            "account_type": account_type
        }, 201
        
    except Exception as e:
        db.session.rollback()
        return {"status": "fail", "message": f"Registration failed: {str(e)}"}, 500


def login_user(email, password):
    try:
        user = User.query.filter_by(email=email.lower().strip()).first()

        if not user:
            return {"status": "fail", "message": "Invalid email or password"}, 401

        if not check_password_hash(user.password_hash, password):
            return {"status": "fail", "message": "Invalid email or password"}, 401

        if not user.is_verified:
            return {"status": "fail", "message": "Account not verified"}, 403

        # 🔐 IMPORTANT: SET SESSION
        session.clear()
        session["user_unique_id"] = user.unique_id
        session["role"] = user.account_type
        session["email"] = user.email

        flats_owned_count = user.flats_owned.count() if user.account_type == 'Owner' else 0
        active_rental = user.flats_rented.first() if user.account_type == 'Tenant' else None

        return {
            "status": "success",
            "message": "Login successful",
            "user": {
                "unique_id": str(user.unique_id),
                "username": user.username,
                "email": user.email,
                "account_type": user.account_type,
                "contact_no": user.contact_no,
                "currently_rented": user.currently_rented,
                "created_at": user.created_at.isoformat(),
                "stats": {
                    "flats_owned": flats_owned_count,
                    "active_rental": active_rental.flat_unique_id if active_rental else None
                }
            }
        }, 200

    except Exception as e:
        return {"status": "fail", "message": f"Login failed: {str(e)}"}, 500


def get_user_profile(unique_id):
    """
    Get user profile information by unique_id.
    
    Args:
        unique_id (str): User's unique identifier
    
    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        user = User.query.filter_by(unique_id=unique_id).first()
        
        if not user:
            return {"status": "fail", "message": "User not found"}, 404

        # Count user's properties and active rentals
        flats_owned_count = user.flats_owned.count() if user.account_type == 'Owner' else 0
        active_rental = user.flats_rented.first() if user.account_type == 'Tenant' else None
        
        profile_data = {
            "unique_id": str(user.unique_id),  # Ensure UUID is string
            "username": user.username,
            "email": user.email,
            "account_type": user.account_type,
            "contact_no": user.contact_no,
            "currently_rented": user.currently_rented,
            "created_at": user.created_at.isoformat(),
            "stats": {
                "flats_owned": flats_owned_count,
                "active_rental": active_rental.flat_unique_id if active_rental else None
            }
        }

        return {"status": "success", "profile": profile_data}, 200

    except Exception as e:
        return {"status": "fail", "message": f"Failed to get profile: {str(e)}"}, 500

def change_password(unique_id, current_password, new_password):
    """
    Change user's password.
    
    Args:
        unique_id (str): User's unique identifier
        current_password (str): Current password for verification
        new_password (str): New password to set
    
    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        user = User.query.filter_by(unique_id=unique_id).first()
        
        if not user:
            return {"status": "fail", "message": "User not found"}, 404
        
        # Verify current password
        if not check_password_hash(user.password_hash, current_password):
            return {"status": "fail", "message": "Current password is incorrect"}, 401
        
        # Validate new password
        if len(new_password) < 6:
            return {"status": "fail", "message": "New password must be at least 6 characters long"}, 400
        
        # Update password
        user.password_hash = generate_password_hash(new_password)
        db.session.commit()

        return {"status": "success", "message": "Password changed successfully"}, 200

    except Exception as e:
        db.session.rollback()
        return {"status": "fail", "message": f"Failed to change password: {str(e)}"}, 500

def update_profile(unique_id, username=None, contact_no=None):
    """
    Update user profile information.
    
    Args:
        unique_id (str): User's unique identifier
        username (str, optional): New username
        contact_no (str, optional): New contact number
    
    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        user = User.query.filter_by(unique_id=unique_id).first()
        
        if not user:
            return {"status": "fail", "message": "User not found"}, 404
        
        updated_fields = []
        
        # Update username if provided
        if username and username.strip() != user.username:
            # Check if username is already taken
            if User.query.filter_by(username=username.strip()).first():
                return {"status": "fail", "message": "Username already taken"}, 409
            user.username = username.strip()
            updated_fields.append("username")
        
        # Update contact number if provided
        if contact_no and contact_no.strip() != user.contact_no:
            user.contact_no = contact_no.strip()
            updated_fields.append("contact number")
        
        if not updated_fields:
            return {"status": "success", "message": "No changes made"}, 200
        
        db.session.commit()
        
        return {
            "status": "success", 
            "message": f"Updated {', '.join(updated_fields)} successfully",
            "profile": {
                "unique_id": str(user.unique_id),  # Ensure UUID is string
                "username": user.username,
                "email": user.email,
                "contact_no": user.contact_no
            }
        }, 200

    except Exception as e:
        db.session.rollback()
        return {"status": "fail", "message": f"Failed to update profile: {str(e)}"}, 500
import random
from datetime import datetime, timedelta
from models import db, OTPVerification
from utilities import send_email

def _create_and_email_otp(email: str, purpose: str = "email_signup", extra_message: str = "") -> None:
    """
    Create and email a 6-digit OTP with customized messages based on the purpose.

    Args:
        email (str): Recipient email address.
        purpose (str): OTP purpose context (e.g., 'email_signup', 'rent_approval', 'password_reset').
        extra_message (str): Additional context to include in the email body (optional).
    """
    otp_code = f"{random.randint(0, 999999):06d}"

    otp = OTPVerification(
        email=email.lower().strip(),
        otp_code=otp_code,
        purpose=purpose,
        expires_at=datetime.utcnow() + timedelta(minutes=10),
        is_used=False
    )
    db.session.add(otp)
    db.session.commit()

    expiration_text = "This code will expire in 10 minutes and can be used only once."

    if purpose == "rent_approval":
        subject = "Your Rental Approval Code"
        body = (
            f"Dear user,\n\n"
            f"Your one-time code to approve renting a flat {extra_message} is:\n\n"
            f"{otp_code}\n\n"
            "Please share this code only with the flat owner to confirm your approval.\n"
            f"{expiration_text}\n\n"
            "If you did not request this code, please contact support immediately.\n\n"
            "Thank you,\n"
            "Rental Management Team"
        )
    elif purpose == "password_reset":
        subject = "Your Password Reset Verification Code"
        body = (
            f"Dear user,\n\n"
            f"We received a request to reset your password.\n"
            f"Your password reset code is:\n\n"
            f"{otp_code}\n\n"
            f"{expiration_text}\n\n"
            "If you did not request this, please ignore this email or contact support.\n\n"
            "Thank you,\n"
            "Rental Management Team"
        )
    elif purpose == "email_signup":
        subject = "Your Account Verification Code"
        body = (
            f"Dear user,\n\n"
            f"Thank you for signing up with Rental Management.\n"
            f"Your verification code is:\n\n"
            f"{otp_code}\n\n"
            f"Please enter this code in the app to verify your email address.\n"
            f"{expiration_text}\n\n"
            "If you did not sign up for an account, please ignore this email.\n\n"
            "Best regards,\n"
            "Rental Management Team"
        )
    else:
        # Generic fallback message
        subject = "Your Verification Code"
        body = (
            f"Dear user,\n\n"
            f"Your verification code is:\n\n"
            f"{otp_code}\n\n"
            f"{expiration_text}\n\n"
            "If you did not request this code, please ignore this email.\n\n"
            "Best regards,\n"
            "Rental Management Team"
        )

    send_email(
        to=email,
        subject=subject,
        body=body
    )


def request_otp(email, purpose="email_signup"):
    """Resend code (rate-limit on frontend)."""
    try:
        _create_and_email_otp(email, purpose)
        return {"status": "success", "message": "OTP sent"}, 200
    except Exception as e:
        db.session.rollback()
        return {"status": "fail", "message": f"OTP error: {e}"}, 500

def verify_otp(email, otp_code, purpose="email_signup"):
    """
    Validate a six-digit OTP code for the specified email and purpose.

    Args:
        email (str): User's email address.
        otp_code (str or int): The OTP code sent to user's email.
        purpose (str): Purpose of OTP, default is "email_signup".

    Returns:
        tuple: (response_dict, HTTP status code)
    """
    try:
        email = email.lower().strip()
        otp_code_str = str(otp_code).zfill(6)
        row = OTPVerification.query.filter_by(
            email=email,
            otp_code=otp_code_str,
            purpose=purpose,
            is_used=False
        ).first()
        if not row or row.expires_at < datetime.utcnow():
            return {"status": "fail", "message": "Invalid or expired code"}, 400
        row.mark_used()
        user = User.query.filter_by(email=email).first()
        if user:
            user.is_verified = True
            db.session.commit()
        else:
            logging.warning(f"OTP verified but no user found with email: {email}")
        # Always convert UUID to string before returning!
        return {
            "status": "success",
            "message": "Verified!",
            "otp_id": str(row.unique_id) if row.unique_id else None
        }, 200
    except Exception as e:
        db.session.rollback()
        logging.error(f"OTP verify error: {str(e)}")
        return {"status": "fail", "message": f"Verification failed: {str(e)}"}, 500

def safe_serialize(obj):
    """Recursively convert UUIDs in dicts/lists to strings."""
    if isinstance(obj, dict):
        return {k: safe_serialize(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [safe_serialize(i) for i in obj]
    elif isinstance(obj, uuid.UUID):
        return str(obj)
    else:
        return obj
def cleanup_unverified_accounts(hours_old=24):
    """
    Delete unverified user accounts older than specified hours.
    Also cleans up expired OTP records.
    
    Args:
        hours_old (int): Age in hours after which unverified accounts are deleted
        
    Returns:
        dict: Cleanup results
    """
    try:
        cutoff_time = datetime.utcnow() - timedelta(hours=hours_old)
        
        # Find unverified users older than cutoff time
        old_unverified_users = User.query.filter(
            User.is_verified == False,
            User.created_at < cutoff_time
        ).all()
        
        # Find expired OTP records
        expired_otps = OTPVerification.query.filter(
            OTPVerification.expires_at < datetime.utcnow()
        ).all()
        
        users_deleted = 0
        otps_deleted = 0
        
        # Delete old unverified users
        for user in old_unverified_users:
            db.session.delete(user)
            users_deleted += 1
            
        # Delete expired OTP records
        for otp in expired_otps:
            db.session.delete(otp)
            otps_deleted += 1
            
        db.session.commit()
        
        return {
            "status": "success",
            "users_deleted": users_deleted,
            "otps_deleted": otps_deleted,
            "cutoff_time": cutoff_time.isoformat()
        }
        
    except Exception as e:
        db.session.rollback()
        return {
            "status": "error",
            "message": f"Cleanup failed: {str(e)}"
        }

def cleanup_expired_otps_only():
    """Clean up only expired OTP records (safe to run frequently)."""
    try:
        expired_otps = OTPVerification.query.filter(
            OTPVerification.expires_at < datetime.utcnow()
        ).all()
        
        otps_deleted = len(expired_otps)
        for otp in expired_otps:
            db.session.delete(otp)
            
        db.session.commit()
        
        return {
            "status": "success",
            "otps_deleted": otps_deleted
        }
        
    except Exception as e:
        db.session.rollback()
        return {
            "status": "error", 
            "message": f"OTP cleanup failed: {str(e)}"
        }
