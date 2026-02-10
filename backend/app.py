# Complete Flask Application for Rental Management System
# app.py  (add after your existing imports)
import sys
import os

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)
from flask import Flask, request, jsonify, session
import io
from analytics.rent_predictor import predict_rent_logic
from newlogin import _create_and_email_otp, cleanup_expired_otps_only, cleanup_unverified_accounts, request_otp, verify_otp
from flask import Flask, request, jsonify, send_file
from sqlalchemy import text
from models import Flat, User, db
from newlogin import signup_user, login_user, get_user_profile, change_password, update_profile
from ownerreqests import (
    create_flat, list_flats, rent_flat, update_rented_date, vacate_flat, 
    delete_flat, list_all_tenants, list_available_tenants,request_rent_otp, verify_rent_payment
)
from servicerequests import (
    create_service_request, get_tenant_service_requests, get_owner_service_requests, update_service_expense,
    update_service_request_status, add_tenant_rating, get_service_request_details
)
from financials import (
    owner_record_rent_payment, record_rent_payment, get_owner_financial_summary, get_rent_payment_history,
    get_expense_history, create_manual_expense
)
from adminrequests import (
    delete_user_by_unique_id, get_system_statistics, list_all_users,
    get_user_detailed_info, cleanup_orphaned_data, export_system_data
)
from agreements import upload_rent_agreement, get_agreements, download_agreement
from models import RentAgreement
from datetime import datetime

app = Flask(__name__)

from flask_cors import CORS

CORS(
    app,
    supports_credentials=True,
    origins=["http://127.0.0.1:5177"]
)
app.secret_key = "dev-secret-key-change-later"
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=False  # localhost only
)

# Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = \
    'postgresql://sohamathawale@localhost:5432/rentmyhouse'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_pre_ping': True,
    'pool_recycle': 300,
}
from functools import wraps

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("user_unique_id"):
            return jsonify({
                "status": "fail",
                "message": "Authentication required"
            }), 401
        return f(*args, **kwargs)
    return decorated
def owner_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if session.get("role") != "Owner":
            return jsonify({
                "status": "fail",
                "message": "Owner access required"
            }), 403
        return f(*args, **kwargs)
    return decorated

# Initialize database
db.init_app(app)

# Error handler for 404
@app.errorhandler(404)
def not_found(error):
    return jsonify({"status": "fail", "message": "Endpoint not found"}), 404

# Error handler for 500
@app.errorhandler(500)
def internal_error(error):
    return jsonify({"status": "fail", "message": "Internal server error"}), 500

# ==================== AUTHENTICATION ENDPOINTS ====================

@app.route('/signup', methods=['POST'])
def signup():
    """User registration endpoint."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"status": "fail", "message": "No data provided"}), 400
        
        result, status_code = signup_user(
            data.get('email'),
            data.get('username'),
            data.get('password'),
            data.get('account_type'),
            data.get('contact_no')
        )
        return jsonify(result), status_code
    except Exception as e:
        return jsonify({"status": "fail", "message": f"Registration failed: {str(e)}"}), 500

@app.route('/login', methods=['POST'])
def login():
    """User authentication endpoint."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"status": "fail", "message": "No data provided"}), 400
        
        result, status_code = login_user(data.get('email'), data.get('password'))
        return jsonify(result), status_code
    except Exception as e:
        return jsonify({"status": "fail", "message": f"Login failed: {str(e)}"}), 500

@app.route('/profile/<unique_id>', methods=['GET'])
def get_profile(unique_id):
    """Get user profile information."""
    result, status_code = get_user_profile(unique_id)
    return jsonify(result), status_code

@app.route('/change-password', methods=['POST'])
def change_user_password():
    """Change user password."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"status": "fail", "message": "No data provided"}), 400
        
        result, status_code = change_password(
            data.get('unique_id'),
            data.get('current_password'),
            data.get('new_password')
        )
        return jsonify(result), status_code
    except Exception as e:
        return jsonify({"status": "fail", "message": f"Password change failed: {str(e)}"}), 500

@app.route('/update-profile', methods=['PUT'])
def update_user_profile():
    """Update user profile information."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"status": "fail", "message": "No data provided"}), 400
        
        result, status_code = update_profile(
            data.get('unique_id'),
            data.get('username'),
            data.get('contact_no')
        )
        return jsonify(result), status_code
    except Exception as e:
        return jsonify({"status": "fail", "message": f"Profile update failed: {str(e)}"}), 500

# ==================== FLAT MANAGEMENT ENDPOINTS ====================

@app.route('/create-flat', methods=['POST'])
def create_flat_route():
    """Create a new flat listing."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"status": "fail", "message": "No data provided"}), 400

        required_fields = ["owner_unique_id", "title", "address", "rent"]
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    "status": "fail",
                    "message": f"{field} is required"
                }), 400

        result, status_code = create_flat(
            owner_unique_id=data.get("owner_unique_id"),
            title=data.get("title"),
            address=data.get("address"),
            rent=data.get("rent"),
            bedrooms=data.get("bedrooms"),
            bathrooms=data.get("bathrooms"),
            area_sqft=data.get("area_sqft"),
            furnishing=data.get("furnishing"),
            property_type=data.get("property_type")
        )

        return jsonify(result), status_code

    except Exception as e:
        return jsonify({
            "status": "fail",
            "message": f"Flat creation failed: {str(e)}"
        }), 500

@app.route('/list-flats', methods=['GET'])
def list_flats_route():
    """List all flats."""
    result, status_code = list_flats()
    return jsonify(result), status_code

@app.route('/owner-flats', methods=['GET'])
@login_required
@owner_required
def owner_flats_route():
    """
    Get flats ONLY for the logged-in owner
    """
    try:
        owner_unique_id = session.get("user_unique_id")

        owner = User.query.filter_by(unique_id=owner_unique_id).first()
        if not owner:
            return {
                "status": "fail",
                "message": "Owner not found"
            }, 404

        flats = owner.flats_owned.all()

        flats_data = []
        total_rent = 0
        occupied_count = 0

        for flat in flats:
            is_rented = flat.rented_to_unique_id is not None
            if is_rented:
                occupied_count += 1
                total_rent += float(flat.rent)

            flats_data.append({
            "flat_unique_id": flat.flat_unique_id,
            "title": flat.title,
            "address": flat.address,
            "rent": str(flat.rent),

            # ML-READY FEATURES
            "bedrooms": flat.bedrooms,
            "bathrooms": flat.bathrooms,
            "area_sqft": flat.area_sqft,
            "furnishing": flat.furnishing,
            "property_type": flat.property_type,

            "created_at": flat.created_at.isoformat(),

            "is_rented": is_rented,
            "rented_to_unique_id": flat.rented_to_unique_id,  # ✅ ADD THIS

            "tenant": {
                "unique_id": flat.tenant.unique_id,
                "username": flat.tenant.username,
                "contact_no": flat.tenant.contact_no
            } if flat.tenant else None
        })


        return {
            "status": "success",
            "flats": flats_data,
            "summary": {
                "total_properties": len(flats),
                "occupied_properties": occupied_count,
                "vacant_properties": len(flats) - occupied_count,
                "monthly_income": total_rent,
                "occupancy_rate": round(
                    (occupied_count / len(flats) * 100), 2
                ) if flats else 0
            }
        }, 200

    except Exception as e:
        return {
            "status": "fail",
            "message": f"Failed to fetch owner flats: {str(e)}"
        }, 500

# Modify existing /rent-flat route:

@app.route('/rent-flat', methods=['POST'])
def api_rent_flat():
    data = request.get_json()
    flat_unique_id = data.get('flat_unique_id')
    tenant_unique_id = data.get('tenant_unique_id')
    otp_code = data.get('otp_code')
    deposit_amount = float(data.get('deposit_amount', 0))
    rented_date_str = data.get('rented_date')
    rented_date = datetime.fromisoformat(rented_date_str) if rented_date_str else None

    if not otp_code:
        return jsonify({"status": "fail", "message": "OTP code is required"}), 400

    result, status_code = rent_flat(flat_unique_id, tenant_unique_id, otp_code, deposit_amount, rented_date)
    return jsonify(result), status_code

# New route for verifying rent payments by owner

@app.route('/verify-rent-payment', methods=['POST'])
def api_verify_rent_payment():
    data = request.get_json()
    payment_unique_id = data.get('payment_unique_id')
    owner_unique_id = data.get('owner_unique_id')

    if not payment_unique_id or not owner_unique_id:
        return jsonify({"status": "fail", "message": "payment_unique_id and owner_unique_id are required"}), 400

    result, status_code = verify_rent_payment(payment_unique_id, owner_unique_id)
    return jsonify(result), status_code

# New route for owner to update rented_date

@app.route('/update-rented-date', methods=['POST'])
def api_update_rented_date():
    data = request.get_json()
    flat_unique_id = data.get('flat_unique_id')
    owner_unique_id = data.get('owner_unique_id')
    rented_date_str = data.get('rented_date')
    if not (flat_unique_id and owner_unique_id and rented_date_str):
        return jsonify({"status": "fail", "message": "flat_unique_id, owner_unique_id, and rented_date are required"}), 400
    try:
        rented_date = datetime.fromisoformat(rented_date_str)
    except ValueError:
        return jsonify({"status": "fail", "message": "Invalid date format for rented_date"}), 400

    result, status_code = update_rented_date(flat_unique_id, owner_unique_id, rented_date)
    return jsonify(result), status_code

# New route for tenants to view rent payment history

@app.route('/tenant-rent-history/<tenant_unique_id>', methods=['GET'])
def tenant_rent_history(tenant_unique_id):
    # Calls financials.py's get_rent_payment_history filtered by tenant_unique_id
    from financials import get_rent_payment_history
    result, status_code = get_rent_payment_history(tenant_unique_id=tenant_unique_id)
    return jsonify(result), status_code

@app.route('/vacate-flat', methods=['POST'])
def vacate_flat_route():
    try:
        data = request.get_json()
        if not data:
            return {"status": "fail", "message": "No data provided"}, 400

        flat_unique_id = data.get("flat_unique_id")
        tenant_unique_id = data.get("tenant_unique_id")
        otp_code = data.get("otp_code")

        if not flat_unique_id or not tenant_unique_id or not otp_code:
            return {"status": "fail", "message": "Missing required fields"}, 400

        result, status_code = vacate_flat(
            flat_unique_id=flat_unique_id,
            tenant_unique_id=tenant_unique_id,
            otp_code=otp_code
        )

        return result, status_code

    except Exception as e:
        return {"status": "fail", "message": str(e)}, 500

@app.route('/request-vacate-otp', methods=['POST'])
def request_vacate_otp():
    try:
        data = request.get_json()
        if not data:
            return {"status": "fail", "message": "No data provided"}, 400

        flat_unique_id = data.get("flat_unique_id")
        tenant_unique_id = data.get("tenant_unique_id")

        if not flat_unique_id or not tenant_unique_id:
            return {"status": "fail", "message": "Missing required fields"}, 400

        flat = Flat.query.filter_by(flat_unique_id=flat_unique_id).first()
        if not flat:
            return {"status": "fail", "message": "Flat not found"}, 404

        if flat.rented_to_unique_id != tenant_unique_id:
            return {"status": "fail", "message": "Tenant mismatch"}, 403

        tenant = User.query.filter_by(unique_id=tenant_unique_id).first()
        if not tenant:
            return {"status": "fail", "message": "Tenant not found"}, 404

        # 🔐 CREATE OTP
        _create_and_email_otp(
            email=tenant.email,
            user_unique_id=tenant.unique_id,
            purpose="VACATE_FLAT"
        )

        return {
            "status": "success",
            "message": "OTP sent successfully"
        }, 200

    except Exception as e:
        print("VACATE OTP ERROR:", e)  # 👈 IMPORTANT
        return {"status": "fail", "message": str(e)}, 500

@app.route('/delete-flat/<flat_unique_id>', methods=['DELETE'])
def delete_flat_route(flat_unique_id):
    """Delete a flat listing."""
    result, status_code = delete_flat(flat_unique_id)
    return jsonify(result), status_code

# ==================== TENANT MANAGEMENT ENDPOINTS ====================

@app.route('/all-tenants', methods=['GET'])
def all_tenants_route():
    """List all tenants with their rental status."""
    result, status_code = list_all_tenants()
    return jsonify(result), status_code

@app.route('/available-tenants', methods=['GET'])
def available_tenants_route():
    """List tenants who are not currently renting."""
    result, status_code = list_available_tenants()
    return jsonify(result), status_code

# ==================== SERVICE REQUEST ENDPOINTS ====================

@app.route('/create-service-request', methods=['POST'])
def create_service_request_route():
    """Create a new service request."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"status": "fail", "message": "No data provided"}), 400
        
        result, status_code = create_service_request(
            data.get('flat_unique_id'),
            data.get('tenant_unique_id'),
            data.get('title'),
            data.get('description'),
            data.get('category'),
            data.get('priority', 'Medium')
        )
        return jsonify(result), status_code
    except Exception as e:
        return jsonify({"status": "fail", "message": f"Service request creation failed: {str(e)}"}), 500

@app.route('/tenant-service-requests/<tenant_unique_id>', methods=['GET'])
def get_tenant_service_requests_route(tenant_unique_id):
    """Get all service requests for a tenant."""
    result, status_code = get_tenant_service_requests(tenant_unique_id)
    return jsonify(result), status_code

@app.route('/owner-service-requests/<owner_unique_id>', methods=['GET'])
def get_owner_service_requests_route(owner_unique_id):
    """Get all service requests for an owner's properties."""
    result, status_code = get_owner_service_requests(owner_unique_id)
    return jsonify(result), status_code

@app.route('/update-service-request', methods=['PUT'])
def update_service_request_route():
    """Update service request status and details."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"status": "fail", "message": "No data provided"}), 400
        
        result, status_code = update_service_request_status(
            data.get('request_unique_id'),
            data.get('status'),
            data.get('owner_notes'),
            data.get('estimated_cost'),
            data.get('actual_cost'),
            data.get('contractor_name'),
            data.get('contractor_contact')
        )
        return jsonify(result), status_code
    except Exception as e:
        return jsonify({"status": "fail", "message": f"Service request update failed: {str(e)}"}), 500

@app.route('/rate-service-request', methods=['POST'])
@login_required
def rate_service_request_route():
    """
    Add tenant rating to a completed service request.
    Tenant identity comes from session.
    """
    try:
        data = request.get_json() or {}

        tenant_unique_id = session.get("user_unique_id")
        if not tenant_unique_id:
            return jsonify({
                "status": "fail",
                "message": "Authentication required"
            }), 401

        result, status_code = add_tenant_rating(
            request_unique_id=data.get("request_unique_id"),
            tenant_unique_id=tenant_unique_id,  # 🔥 from session
            rating=data.get("rating"),
            tenant_notes=data.get("tenant_notes")
        )

        return jsonify(result), status_code

    except Exception as e:
        return jsonify({
            "status": "fail",
            "message": f"Service rating failed: {str(e)}"
        }), 500


@app.route('/service-request-details/<request_unique_id>', methods=['GET'])
def get_service_request_details_route(request_unique_id):
    """Get detailed information about a service request."""
    result, status_code = get_service_request_details(request_unique_id)
    return jsonify(result), status_code

@app.route("/update-service-expense", methods=["PUT"])
@login_required
def update_service_expense_route():
    """
    Update an existing service expense (owner only)
    """
    try:
        data = request.get_json() or {}

        owner_unique_id = session.get("user_unique_id")
        if not owner_unique_id:
            return {"status": "fail", "message": "Authentication required"}, 401

        result, status_code = update_service_expense(
            expense_unique_id=data.get("expense_unique_id"),
            owner_unique_id=owner_unique_id,
            amount=data.get("amount"),
            description=data.get("description"),
            expense_type=data.get("expense_type"),
            vendor_name=data.get("vendor_name"),
            vendor_contact=data.get("vendor_contact"),
            is_tax_deductible=data.get("is_tax_deductible"),
            notes=data.get("notes"),
        )

        return jsonify(result), status_code

    except Exception as e:
        return jsonify({
            "status": "fail",
            "message": f"Failed to update service expense: {str(e)}"
        }), 500

# ==================== FINANCIAL TRACKING ENDPOINTS ====================
@app.route('/tenant/rent-payments', methods=['GET'])
@login_required
def get_my_rent_payments():
    """
    Get rent payment history for logged-in tenant
    """
    try:
        tenant_unique_id = session.get('user_unique_id')
        if not tenant_unique_id:
            return jsonify({
                "status": "fail",
                "message": "Not authenticated"
            }), 401

        result, status_code = get_rent_payment_history(
            tenant_unique_id=tenant_unique_id
        )

        return jsonify(result), status_code

    except Exception as e:
        return jsonify({
            "status": "fail",
            "message": f"Failed to fetch rent payments: {str(e)}"
        }), 500

@app.route('/owner/record-rent', methods=['POST'])
@login_required
@owner_required
def owner_record_rent_route():
    data = request.get_json() or {}

    owner_unique_id = session.get('user_unique_id')
    if not owner_unique_id:
        return jsonify({
            "status": "fail",
            "message": "Not authenticated"
        }), 401

    result, status_code = owner_record_rent_payment(
        owner_unique_id=owner_unique_id,
        flat_unique_id=data.get('flat_unique_id'),
        amount=data.get('amount'),
        payment_method=data.get('payment_method', 'Other'),  # ✅ FIXED
        notes=data.get('notes')
    )

    return jsonify(result), status_code


@app.route('/tenant/record-rent-payment', methods=['POST'])
@login_required
def tenant_record_rent_payment():
    """
    Tenant submits rent payment (PENDING, no email)
    """
    try:
        data = request.get_json() or {}

        tenant_unique_id = session.get('user_unique_id')
        if not tenant_unique_id:
            return jsonify({
                "status": "fail",
                "message": "Not authenticated"
            }), 401

        return record_rent_payment(
            flat_unique_id=data.get("flat_unique_id"),
            tenant_unique_id=tenant_unique_id,
            amount=data.get("amount"),
            payment_method=data.get("payment_method", "Other"),
            payment_status="Pending",          # 🔒 tenant → pending
            send_confirmation_email=False      # ❌ no emails yet
        )

    except Exception as e:
        return jsonify({
            "status": "fail",
            "message": f"Failed to record rent payment: {str(e)}"
        }), 500
    
@app.route('/owner/verify-rent-payment/<payment_unique_id>', methods=['POST'])
@login_required
def owner_verify_rent_payment(payment_unique_id):
    owner_unique_id = session.get('user_unique_id')

    if not owner_unique_id:
        return jsonify({
            "status": "fail",
            "message": "Not authenticated"
        }), 401

    return verify_rent_payment(payment_unique_id, owner_unique_id)


@app.route('/financial-summary/<owner_unique_id>', methods=['GET'])
def get_financial_summary_route(owner_unique_id):
    """Get owner's financial summary."""
    year = request.args.get('year', type=int)
    month = request.args.get('month', type=int)
    
    result, status_code = get_owner_financial_summary(owner_unique_id, year, month)
    return jsonify(result), status_code

@app.route('/rent-payment-history', methods=['GET'])
def get_rent_payment_history_route():
    """Get rent payment history with optional filters."""
    flat_unique_id = request.args.get('flat_unique_id')
    tenant_unique_id = request.args.get('tenant_unique_id')
    owner_unique_id = request.args.get('owner_unique_id')
    
    result, status_code = get_rent_payment_history(flat_unique_id, tenant_unique_id, owner_unique_id)
    return jsonify(result), status_code

@app.route('/expense-history', methods=['GET'])
def get_expense_history_route():
    """Get expense history with optional filters."""
    owner_unique_id = request.args.get('owner_unique_id')
    flat_unique_id = request.args.get('flat_unique_id')
    expense_type = request.args.get('expense_type')
    
    result, status_code = get_expense_history(owner_unique_id, flat_unique_id, expense_type)
    return jsonify(result), status_code

@app.route('/create-manual-expense', methods=['POST'])
def create_manual_expense_route():
    """Create a manual expense entry."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"status": "fail", "message": "No data provided"}), 400
        
        result, status_code = create_manual_expense(
            data.get('owner_unique_id'),
            data.get('flat_unique_id'),
            data.get('expense_type'),
            data.get('description'),
            data.get('amount'),
            data.get('vendor_name'),
            data.get('vendor_contact'),
            data.get('receipt_url'),
            data.get('is_tax_deductible', False),
            data.get('notes')
        )
        return jsonify(result), status_code
    except Exception as e:
        return jsonify({"status": "fail", "message": f"Expense creation failed: {str(e)}"}), 500

# # ==================== ADMIN ENDPOINTS ====================

# @app.route('/admin/statistics', methods=['GET'])
# def get_system_statistics_route():
#     """Get comprehensive system statistics."""
#     result, status_code = get_system_statistics()
#     return jsonify(result), status_code

# @app.route('/admin/users', methods=['GET'])
# def list_all_users_route():
#     """List all users with optional filters."""
#     account_type = request.args.get('account_type')
#     currently_rented = request.args.get('currently_rented')
    
#     if currently_rented is not None:
#         currently_rented = currently_rented.lower() == 'true'
    
#     result, status_code = list_all_users(account_type, currently_rented)
#     return jsonify(result), status_code

# @app.route('/admin/user-details/<unique_id>', methods=['GET'])
# def get_user_detailed_info_route(unique_id):
#     """Get detailed information about a specific user."""
#     result, status_code = get_user_detailed_info(unique_id)
#     return jsonify(result), status_code

# @app.route('/admin/cleanup', methods=['POST'])
# def cleanup_system_route():
#     """Clean up orphaned data in the system."""
#     result, status_code = cleanup_orphaned_data()
#     return jsonify(result), status_code

# @app.route('/admin/export', methods=['GET'])
# def export_system_data_route():
#     """Export system data for backup."""
#     result, status_code = export_system_data()
#     return jsonify(result), status_code

# @app.route('/delete-user/<unique_id>', methods=['DELETE'])
# def delete_user_route(unique_id):
#     """Delete a user account."""
#     result, status_code = delete_user_by_unique_id(unique_id)
#     return jsonify(result), status_code

# ==================== HEALTH CHECK ENDPOINT ====================

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    try:
        # Test database connection
        db.session.execute(text('SELECT 1'))
        return jsonify({
            "status": "success",
            "message": "Rental Management System is running",
            "timestamp": datetime.utcnow().isoformat(),
            "database": "connected"
        }), 200
    except Exception as e:
        return jsonify({
            "status": "fail",
            "message": "System health check failed",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat(),
            "database": "disconnected"
        }), 500
    
# --- OTP endpoints ---
@app.route('/request-otp', methods=['POST'])
def api_request_otp():
    data = request.get_json()
    email = data.get('email')
    purpose = data.get('purpose', 'email_signup')
    # Call your request_otp function (you should implement it)
    return request_otp(email, purpose)

@app.route('/verify-otp', methods=['POST'])
def api_verify_otp():
    data = request.get_json()
    email = data.get('email')
    otp_code = data.get('otp_code')
    purpose = data.get('purpose', 'email_signup')
    result, status_code = verify_otp(email, otp_code, purpose)
    return jsonify(result), status_code

# tenant rent-approval OTP
@app.route('/request-rent-otp', methods=['POST'])
def api_request_rent_otp():
    data = request.get_json()
    flat_id = data.get('flat_unique_id')
    tenant_id = data.get('tenant_unique_id')
    if not flat_id or not tenant_id:
        return {"status": "fail", "message": "flat_unique_id and tenant_unique_id are required"}, 400
    return request_rent_otp(flat_id, tenant_id)

# @app.route('/admin/cleanup-unverified', methods=['POST'])
# def cleanup_unverified_accounts_route():
#     """Clean up unverified accounts older than specified hours."""
#     try:
#         data = request.get_json()
#         hours_old = data.get('hours_old', 24) if data else 24
        
#         result = cleanup_unverified_accounts(hours_old)
#         return jsonify(result), 200
        
#     except Exception as e:
#         return jsonify({
#             "status": "error",
#             "message": f"Cleanup failed: {str(e)}"
#         }), 500

# @app.route('/admin/cleanup-otps', methods=['POST'])  
# def cleanup_otps_route():
#     """Clean up expired OTP records."""
#     result = cleanup_expired_otps_only()
#     return jsonify(result), 200
# @app.route('/upload-agreement', methods=['POST'])
# def upload_agreement_route():
#     try:
#         flat_id = request.form.get('flat_unique_id')
#         tenant_id = request.form.get('tenant_unique_id')
#         agreement_date = datetime.strptime(request.form.get('agreement_date'), '%Y-%m-%d').date()
#         start_date = datetime.strptime(request.form.get('start_date'), '%Y-%m-%d').date()
#         end_date = datetime.strptime(request.form.get('end_date'), '%Y-%m-%d').date()
        
#         if 'file' not in request.files:
#             return jsonify({"status": "fail", "message": "No file uploaded"}), 400
            
#         result, status = upload_rent_agreement(flat_id, tenant_id, agreement_date, start_date, end_date, request.files['file'])
#         return jsonify(result), status
        
#     except Exception as e:
#         return jsonify({"status": "fail", "message": str(e)}), 500

@app.route('/agreements', methods=['GET'])
def get_agreements_route():
    flat_id = request.args.get('flat_unique_id')
    tenant_id = request.args.get('tenant_unique_id')
    result, status = get_agreements(flat_id, tenant_id)
    return jsonify(result), status

@app.route('/download-agreement/<agreement_id>', methods=['GET'])
def download_agreement_route(agreement_id):
    file_response, error_response, status = download_agreement(agreement_id)
    if error_response:
        return jsonify(error_response), status
    return file_response
@app.route('/upload-id', methods=['POST'])
def upload_id_document():
    user_id = request.form.get('unique_id')
    consent = request.form.get('consent', 'false').lower() == 'true'
    file = request.files.get('file')

    if not user_id or not file:
        return jsonify({"status": "fail", "message": "unique_id and file required"}), 400
    user = User.query.filter_by(unique_id=user_id).first()
    if not user:
        return jsonify({"status": "fail", "message": "User not found"}), 404

    user.id_document_filename = file.filename
    user.id_document_data = file.read()
    user.id_document_mime = file.mimetype or 'application/octet-stream'
    user.id_document_uploaded_at = datetime.utcnow()
    if user.account_type == 'Tenant':
        user.id_document_consent = consent
        if consent:
            user.id_document_consent_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"status": "success", "message": "ID uploaded"}), 200
@app.route('/get-tenant-id', methods=['GET'])
def get_tenant_id():
    flat_id = request.args.get('flat_unique_id')
    owner_id = request.args.get('owner_unique_id')

    if not flat_id or not owner_id:
        return jsonify({"status": "fail", "message": "flat_unique_id and owner_unique_id are required"}), 400

    flat = Flat.query.filter_by(flat_unique_id=flat_id).first()
    if not flat:
        return jsonify({"status": "fail", "message": "Flat not found"}), 404

    if flat.owner_unique_id != owner_id:
        return jsonify({"status": "fail", "message": "Not authorized"}), 403

    tenant = User.query.filter_by(unique_id=flat.rented_to_unique_id).first()
    if not tenant:
        return jsonify({"status": "fail", "message": "No tenant found"}), 404

    # Check if tenant has uploaded ID document
    if not tenant.id_document_data:
        return jsonify({"status": "fail", "message": "Tenant has not uploaded an ID document"}), 404

    # Explicitly check candidate consent - must be true and timestamp must exist
    if not tenant.id_document_consent or not tenant.id_document_consent_at:
        return jsonify({"status": "fail", "message": "Tenant has not given consent for ID sharing"}), 403

    # Confirm the ID document verification status
    if not tenant.id_document_verified:
        return jsonify({"status": "fail", "message": "Tenant's ID document has not been verified"}), 403

    # (Optional) Audit or log access here for compliance

    return send_file(
        io.BytesIO(tenant.id_document_data),
        mimetype=tenant.id_document_mime or 'application/octet-stream',
        as_attachment=True,
        download_name=tenant.id_document_filename or 'tenant_id_document'
    )
@app.route('/give-id-consent', methods=['POST'])
def give_id_consent():
    user_id = request.json.get('unique_id')
    consent = request.json.get('consent', None)
    if not user_id or consent is None:
        return jsonify({"status": "fail", "message": "unique_id and consent required"}), 400

    user = User.query.filter_by(unique_id=user_id).first()
    if not user:
        return jsonify({"status": "fail", "message": "User not found"}), 404

    user.id_document_consent = bool(consent)
    if consent:
        user.id_document_consent_at = datetime.utcnow()
    else:
        user.id_document_consent_at = None
    db.session.commit()
    return jsonify({"status": "success", "message": "Consent updated", "current_consent": user.id_document_consent}), 200
@app.route('/id-consent-status/<unique_id>', methods=['GET'])
def id_consent_status(unique_id):
    user = User.query.filter_by(unique_id=unique_id).first()
    if not user:
        return jsonify({"status": "fail", "message": "User not found"}), 404
    return jsonify({
        "status": "success",
        "id_document_consent": user.id_document_consent,
        "consent_given_at": user.id_document_consent_at.isoformat() if user.id_document_consent_at else None
    }), 200

#======================Analytics routes=========================
@app.route("/predict-rent", methods=["POST"])
def predict_rent():
    data = request.get_json()

    response, status_code = predict_rent_logic(data)
    return jsonify(response), status_code


# ==================== APPLICATION STARTUP ====================

if __name__ == '__main__':
    with app.app_context():
        # Create all database tables
        db.create_all()
        print("✅ Database tables created successfully")
        print("✅ Rental Management System starting...")
        print("📊 Available endpoints:")
        print("   Authentication: /signup, /login, /profile/<id>")
        print("   Flats: /create-flat, /list-flats, /rent-flat")
        print("   Service Requests: /create-service-request, /update-service-request")
        print("   Financials: /financial-summary/<id>, /record-rent-payment")
        print("   Admin: /admin/statistics, /admin/users, /delete-user/<id>")
        print("   Health: /health")
    
    app.run(debug=True, host='0.0.0.0', port=8000)
