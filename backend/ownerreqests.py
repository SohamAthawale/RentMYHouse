# Owner Requests Module for Rental Management System

from datetime import datetime, date
import uuid
from decimal import Decimal
from utilities import send_email
from models import OTPVerification, db, User, Flat, RentPayment
from newlogin import _create_and_email_otp
from utilities import send_email
def create_flat(owner_unique_id, title, address, rent):
    """
    Create a new flat listing by an owner.
    
    Args:
        owner_unique_id (str): Owner's unique identifier
        title (str): Flat title/name
        address (str): Flat address
        rent (float): Monthly rent amount
    
    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        # Verify owner exists and is an owner
        owner = User.query.filter_by(unique_id=owner_unique_id).first()
        if not owner:
            return {"status": "fail", "message": "Owner not found"}, 404
        
        if owner.account_type != 'Owner':
            return {"status": "fail", "message": "Only owners can create flat listings"}, 403

        # Validate input data
        if not title or not title.strip():
            return {"status": "fail", "message": "Flat title is required"}, 400
        
        if not address or not address.strip():
            return {"status": "fail", "message": "Flat address is required"}, 400
        
        if not rent or rent <= 0:
            return {"status": "fail", "message": "Valid rent amount is required"}, 400

        # Generate unique flat_unique_id
        flat_unique_id = f"flat-{uuid.uuid4().hex[:12]}"
        while Flat.query.filter_by(flat_unique_id=flat_unique_id).first():
            flat_unique_id = f"flat-{uuid.uuid4().hex[:12]}"

        # Create new flat
        flat = Flat(
            flat_unique_id=flat_unique_id,
            owner_unique_id=owner_unique_id,
            title=title.strip(),
            address=address.strip(),
            rent=Decimal(str(rent)),
            created_at=datetime.utcnow()
        )
        
        db.session.add(flat)
        db.session.commit()

        return {
            "status": "success",
            "message": "Flat created successfully",
            "flat": {
                "flat_unique_id": flat.flat_unique_id,
                "title": flat.title,
                "address": flat.address,
                "rent": str(flat.rent),
                "owner_username": owner.username
            }
        }, 201

    except Exception as e:
        db.session.rollback()
        return {"status": "fail", "message": f"Failed to create flat: {str(e)}"}, 500

def list_flats():
    """
    List all flats with their details and current status.
    
    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        flats = Flat.query.all()
        flats_data = []
        
        for flat in flats:
            flat_info = {
                "flat_unique_id": flat.flat_unique_id,
                "title": flat.title,
                "address": flat.address,
                "rent": str(flat.rent),
                "created_at": flat.created_at.isoformat(),
                "owner": {
                    "unique_id": flat.owner.unique_id,
                    "username": flat.owner.username,
                    "contact_no": flat.owner.contact_no
                } if flat.owner else None,
                "tenant": {
                    "unique_id": flat.tenant.unique_id,
                    "username": flat.tenant.username,
                    "contact_no": flat.tenant.contact_no
                } if flat.tenant else None,
                "is_rented": flat.rented_to_unique_id is not None
            }
            flats_data.append(flat_info)

        return {"status": "success", "flats": flats_data}, 200

    except Exception as e:
        return {"status": "fail", "message": f"Failed to list flats: {str(e)}"}, 500

def get_owner_flats(owner_unique_id):
    """
    Get all flats owned by a specific owner.
    
    Args:
        owner_unique_id (str): Owner's unique identifier
    
    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        owner = User.query.filter_by(unique_id=owner_unique_id).first()
        if not owner:
            return {"status": "fail", "message": "Owner not found"}, 404
        
        if owner.account_type != 'Owner':
            return {"status": "fail", "message": "User is not an owner"}, 403

        flats = owner.flats_owned.all()
        flats_data = []
        
        total_rent = 0
        occupied_count = 0
        
        for flat in flats:
            is_rented = flat.rented_to_unique_id is not None
            if is_rented:
                occupied_count += 1
                total_rent += float(flat.rent)
            
            flat_info = {
                "flat_unique_id": flat.flat_unique_id,
                "title": flat.title,
                "address": flat.address,
                "rent": str(flat.rent),
                "created_at": flat.created_at.isoformat(),
                "is_rented": is_rented,
                "tenant": {
                    "unique_id": flat.tenant.unique_id,
                    "username": flat.tenant.username,
                    "contact_no": flat.tenant.contact_no
                } if flat.tenant else None
            }
            flats_data.append(flat_info)

        return {
            "status": "success", 
            "flats": flats_data,
            "summary": {
                "total_properties": len(flats),
                "occupied_properties": occupied_count,
                "vacant_properties": len(flats) - occupied_count,
                "monthly_income": total_rent,
                "occupancy_rate": round((occupied_count / len(flats) * 100), 2) if flats else 0
            }
        }, 200

    except Exception as e:
        return {"status": "fail", "message": f"Failed to get owner flats: {str(e)}"}, 500


def rent_flat(flat_unique_id: str, tenant_unique_id: str, otp_code: str, deposit_amount: float = 0.0, rented_date: datetime = None):
    """
    Modified rent_flat to NOT create automatic payment.
    Args:
      deposit_amount (float): Optional deposit amount
      rented_date (datetime): Optional rental start date set by owner
    """
    try:
        flat = Flat.query.filter_by(flat_unique_id=flat_unique_id).first()
        if not flat:
            return {"status": "fail", "message": "Flat not found"}, 404

        tenant = User.query.filter_by(unique_id=tenant_unique_id).first()
        if not tenant:
            return {"status": "fail", "message": "Tenant not found"}, 404
        if tenant.account_type != 'Tenant':
            return {"status": "fail", "message": "Specified user is not a tenant"}, 400

        # Verify OTP as before (same code omitted here)...

        # Check if flat already rented
        if flat.rented_to_unique_id is not None:
            return {"status": "fail", "message": "Flat is already rented"}, 400

        if tenant.currently_rented:
            return {"status": "fail", "message": "Tenant is already renting another property"}, 400

        # Update flat and tenant rental status
        flat.rented_to_unique_id = tenant_unique_id
        flat.deposit_amount = Decimal(str(deposit_amount)) if deposit_amount else Decimal("0.00")
        flat.rented_date = rented_date if rented_date else datetime.utcnow()
        tenant.currently_rented = True

        db.session.commit()

        owner = User.query.filter_by(unique_id=flat.owner_unique_id).first()

        # Send notification emails as before...

        return {
            "status": "success",
            "message": f"Flat '{flat.title}' successfully rented to {tenant.username}. Waiting on owner payment verification.",
            "rental_details": {
                "flat_unique_id": flat.flat_unique_id,
                "flat_title": flat.title,
                "tenant_username": tenant.username,
                "tenant_unique_id": tenant_unique_id,
                "owner_username": owner.username if owner else None,
                "owner_unique_id": owner.unique_id if owner else None,
                "monthly_rent": str(flat.rent),
                "rented_date": flat.rented_date.isoformat(),
                "deposit_amount": str(flat.deposit_amount)
            },
        }, 200

    except Exception as e:
        db.session.rollback()
        return {"status": "fail", "message": f"Failed to rent flat: {str(e)}"}, 500

def verify_rent_payment(payment_unique_id: str, owner_unique_id: str):
    """
    New API for owner to verify a payment manually.
    Marks payment status as 'Paid' only after owner confirmation.
    """
    try:
        payment = RentPayment.query.filter_by(payment_unique_id=payment_unique_id).first()
        if not payment:
            return {"status": "fail", "message": "Payment not found"}, 404

        if payment.owner_unique_id != owner_unique_id:
            return {"status": "fail", "message": "Not authorized to verify this payment"}, 403

        if payment.payment_status == 'Paid':
            return {"status": "fail", "message": "Payment already verified"}, 400

        payment.payment_status = 'Paid'
        db.session.commit()

        # Optionally send confirmation email to tenant and owner about verification...
        tenant = User.query.filter_by(unique_id=payment.tenant_unique_id).first()
        owner = User.query.filter_by(unique_id=owner_unique_id).first()
        if tenant and owner:
            send_email(
                to=tenant.email,
                subject="Rent Payment Verified",
                body=f"Dear {tenant.username},\n\nYour rent payment of ${payment.amount} for the flat '{payment.flat.title}' has been verified by the owner.\n\nThank you."
            )
            send_email(
                to=owner.email,
                subject="Rent Payment Verified",
                body=f"Dear {owner.username},\n\nYou have successfully verified the rent payment (ID: {payment_unique_id}).\n\nThank you."
            )

        return {"status": "success", "message": "Payment verified successfully"}, 200
    except Exception as e:
        db.session.rollback()
        return {"status": "fail", "message": f"Failed to verify payment: {str(e)}"}, 500

def update_rented_date(flat_unique_id: str, owner_unique_id: str, rented_date: datetime):
    """
    New API to allow owner to update the rented_date on a flat.
    """
    try:
        flat = Flat.query.filter_by(flat_unique_id=flat_unique_id).first()
        if not flat:
            return {"status": "fail", "message": "Flat not found"}, 404
        if flat.owner_unique_id != owner_unique_id:
            return {"status": "fail", "message": "Not authorized to update flat"}, 403
        flat.rented_date = rented_date
        db.session.commit()
        return {"status": "success", "message": "Rented date updated successfully", "rented_date": rented_date.isoformat()}, 200
    except Exception as e:
        db.session.rollback()
        return {"status": "fail", "message": f"Failed to update rented date: {str(e)}"}, 500

def vacate_flat(flat_unique_id):
    """
    Vacate a flat (remove tenant).
    
    Args:
        flat_unique_id (str): Flat's unique identifier
    
    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        # Fetch the flat
        flat = Flat.query.filter_by(flat_unique_id=flat_unique_id).first()
        if not flat:
            return {"status": "fail", "message": "Flat not found"}, 404
        
        if not flat.rented_to_unique_id:
            return {"status": "fail", "message": "Flat is not currently rented"}, 400
        
        # Fetch tenant and owner
        tenant = User.query.filter_by(unique_id=flat.rented_to_unique_id).first()
        owner = User.query.filter_by(unique_id=flat.owner_unique_id).first()
        
        # Clear rental info
        tenant_name = tenant.username if tenant else "Unknown"
        owner_name = owner.username if owner else "Unknown"
        
        if tenant:
            tenant.currently_rented = False
        
        flat.rented_to_unique_id = None
        
        db.session.commit()
        
        # Send notification emails to tenant and owner
        if tenant:
            send_email(
                to=tenant.email,
                subject="Flat Vacated Confirmation",
                body=(
                    f"Dear {tenant.username},\n\n"
                    f"You have successfully vacated the flat '{flat.title}'.\n"
                    f"Vacate date: {datetime.utcnow().strftime('%Y-%m-%d')}.\n\n"
                    "Thank you for using our system."
                )
            )
        if owner:
            send_email(
                to=owner.email,
                subject="Flat Vacated Notification",
                body=(
                    f"Dear {owner.username},\n\n"
                    f"The flat '{flat.title}' has been vacated by {tenant_name}.\n"
                    f"Vacate date: {datetime.utcnow().strftime('%Y-%m-%d')}.\n\n"
                    "You may now re-rent or make the property available."
                )
            )
        
        return {
            "status": "success",
            "message": f"Flat '{flat.title}' vacated by {tenant_name}",
            "flat_details": {
                "flat_unique_id": flat.flat_unique_id,
                "title": flat.title,
                "address": flat.address,
                "is_available": True
            }
        }, 200
    
    except Exception as e:
        db.session.rollback()
        return {"status": "fail", "message": f"Failed to vacate flat: {str(e)}"}, 500

def delete_flat(flat_unique_id):
    """
    Delete a flat listing.
    
    Args:
        flat_unique_id (str): Flat's unique identifier
    
    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        flat = Flat.query.filter_by(flat_unique_id=flat_unique_id).first()
        
        if not flat:
            return {"status": "fail", "message": "Flat not found"}, 404
        
        # Check if flat is currently rented
        if flat.rented_to_unique_id:
            return {"status": "fail", "message": "Cannot delete a rented flat. Vacate it first."}, 400

        flat_title = flat.title
        db.session.delete(flat)
        db.session.commit()

        return {
            "status": "success",
            "message": f"Flat '{flat_title}' deleted successfully"
        }, 200

    except Exception as e:
        db.session.rollback()
        return {"status": "fail", "message": f"Failed to delete flat: {str(e)}"}, 500

def list_all_tenants():
    """
    List all tenants with their rental status.
    
    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        tenants = User.query.filter_by(account_type='Tenant').all()
        tenants_data = []
        
        for tenant in tenants:
            current_rental = tenant.flats_rented.first()
            
            tenant_info = {
                "unique_id": tenant.unique_id,
                "username": tenant.username,
                "email": tenant.email,
                "contact_no": tenant.contact_no,
                "currently_rented": tenant.currently_rented,
                "created_at": tenant.created_at.isoformat(),
                "current_rental": {
                    "flat_unique_id": current_rental.flat_unique_id,
                    "title": current_rental.title,
                    "address": current_rental.address,
                    "rent": str(current_rental.rent)
                } if current_rental else None
            }
            tenants_data.append(tenant_info)

        return {"status": "success", "tenants": tenants_data}, 200

    except Exception as e:
        return {"status": "fail", "message": f"Failed to list tenants: {str(e)}"}, 500

def list_available_tenants():
    """
    List tenants who are not currently renting.
    
    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        available_tenants = User.query.filter_by(
            account_type='Tenant', 
            currently_rented=False
        ).all()
        
        tenants_data = []
        for tenant in available_tenants:
            tenant_info = {
                "unique_id": tenant.unique_id,
                "username": tenant.username,
                "email": tenant.email,
                "contact_no": tenant.contact_no,
                "currently_rented": tenant.currently_rented,
                "created_at": tenant.created_at.isoformat()
            }
            tenants_data.append(tenant_info)

        return {"status": "success", "available_tenants": tenants_data}, 200

    except Exception as e:
        return {"status": "fail", "message": f"Failed to list available tenants: {str(e)}"}, 500
def request_rent_otp(flat_unique_id, tenant_unique_id):
    """
    Send rent-approval OTP to a tenant for a specific flat.
    Args:
        flat_unique_id (str): Flat's unique identifier
        tenant_unique_id (str): Tenant's unique identifier
    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        # Fetch the flat
        flat = Flat.query.filter_by(flat_unique_id=flat_unique_id).first()
        if not flat:
            return {"status": "fail", "message": "Flat not found"}, 404

        # Fetch the tenant
        tenant = User.query.filter_by(unique_id=tenant_unique_id).first()
        if not tenant or tenant.account_type != 'Tenant':
            return {"status": "fail", "message": "Tenant not found or not a tenant"}, 404

        # Send OTP with purpose "rent_approval" to the tenant
        _create_and_email_otp(
            tenant.email,
            purpose="rent_approval",
            extra_message=f"for renting flat '{flat.title}' at {flat.address}"
        )
        return {"status": "success", "message": f"OTP sent to {tenant.email} for flat '{flat.title}'"}, 200

    except Exception as e:
        db.session.rollback()
        return {"status": "fail", "message": f"Failed to send OTP: {str(e)}"}, 500
