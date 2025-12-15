# Authentication Module for Rental Management System

from datetime import datetime
import uuid
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User

def signup_user(email, username, password, account_type, contact_no):
    """
    Create a new user account with unique_id generation.
    
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
        # Check if user already exists
        if User.query.filter_by(email=email).first():
            return {"status": "fail", "message": "User with this email already exists"}, 409
        
        if User.query.filter_by(username=username).first():
            return {"status": "fail", "message": "Username already taken"}, 409

        # Validate account type
        if account_type not in ['Owner', 'Tenant']:
            return {"status": "fail", "message": "Account type must be 'Owner' or 'Tenant'"}, 400

        # Generate unique_id with format: prefix-username-randomhex
        prefix = '0' if account_type == 'Owner' else '1'
        unique_id = f"{prefix}-{username}-{uuid.uuid4().hex[:8]}"
        
        # Ensure unique_id is truly unique (unlikely collision, but safety first)
        while User.query.filter_by(unique_id=unique_id).first():
            unique_id = f"{prefix}-{username}-{uuid.uuid4().hex[:8]}"

        # Create new user
        user = User(
            unique_id=unique_id,
            email=email.lower().strip(),
            username=username.strip(),
            account_type=account_type,
            password_hash=generate_password_hash(password),
            contact_no=contact_no.strip(),
            created_at=datetime.utcnow()
        )
        
        db.session.add(user)
        db.session.commit()

        return {
            "status": "success", 
            "message": f"{account_type} account created successfully",
            "user_id": unique_id,
            "username": username,
            "account_type": account_type
        }, 201

    except Exception as e:
        db.session.rollback()
        return {"status": "fail", "message": f"Registration failed: {str(e)}"}, 500

def login_user(email, password):
    """
    Authenticate user with email and password.
    
    Args:
        email (str): User's email address
        password (str): Plain text password
    
    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        # Find user by email
        user = User.query.filter_by(email=email.lower().strip()).first()
        
        if not user:
            return {"status": "fail", "message": "Invalid email or password"}, 401
        
        # Check password
        if not check_password_hash(user.password_hash, password):
            return {"status": "fail", "message": "Invalid email or password"}, 401

        return {
            "status": "success",
            "message": "Login successful",
            "unique_id": user.unique_id,
            "user_id": user.unique_id,
            "username": user.username,
            "account_type": user.account_type,
            "currently_rented": user.currently_rented
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
            "unique_id": user.unique_id,
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
                "unique_id": user.unique_id,
                "username": user.username,
                "email": user.email,
                "contact_no": user.contact_no
            }
        }, 200

    except Exception as e:
        db.session.rollback()
        return {"status": "fail", "message": f"Failed to update profile: {str(e)}"}, 500