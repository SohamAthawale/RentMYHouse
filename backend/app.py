# Complete Flask Application for Rental Management System

from datetime import datetime
from flask import Flask, request, jsonify
from sqlalchemy import text
from models import db
from newlogin import signup_user, login_user, get_user_profile, change_password, update_profile
from ownerreqests import (
    create_flat, list_flats, get_owner_flats, rent_flat, vacate_flat, 
    delete_flat, list_all_tenants, list_available_tenants
)
from servicerequests import (
    create_service_request, get_tenant_service_requests, get_owner_service_requests,
    update_service_request_status, add_tenant_rating, get_service_request_details
)
from financials import (
    record_rent_payment, get_owner_financial_summary, get_rent_payment_history,
    get_expense_history, create_manual_expense
)
from adminrequests import (
    delete_user_by_unique_id, get_system_statistics, list_all_users,
    get_user_detailed_info, cleanup_orphaned_data, export_system_data
)

app = Flask(__name__)

# Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://rentadmin:222003@localhost:5432/rentmyhouse'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_pre_ping': True,
    'pool_recycle': 300,
}

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
        
        result, status_code = create_flat(
            data.get('owner_unique_id'),
            data.get('title'),
            data.get('address'),
            data.get('rent')
        )
        return jsonify(result), status_code
    except Exception as e:
        return jsonify({"status": "fail", "message": f"Flat creation failed: {str(e)}"}), 500

@app.route('/list-flats', methods=['GET'])
def list_flats_route():
    """List all flats."""
    result, status_code = list_flats()
    return jsonify(result), status_code

@app.route('/owner-flats/<owner_unique_id>', methods=['GET'])
def get_owner_flats_route(owner_unique_id):
    """Get all flats owned by a specific owner."""
    result, status_code = get_owner_flats(owner_unique_id)
    return jsonify(result), status_code

@app.route('/rent-flat', methods=['POST'])
def rent_flat_route():
    """Rent a flat to a tenant."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"status": "fail", "message": "No data provided"}), 400
        
        result, status_code = rent_flat(
            data.get('flat_unique_id'),
            data.get('tenant_unique_id')
        )
        return jsonify(result), status_code
    except Exception as e:
        return jsonify({"status": "fail", "message": f"Flat rental failed: {str(e)}"}), 500

@app.route('/vacate-flat/<flat_unique_id>', methods=['POST'])
def vacate_flat_route(flat_unique_id):
    """Vacate a flat."""
    result, status_code = vacate_flat(flat_unique_id)
    return jsonify(result), status_code

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
def rate_service_request_route():
    """Add tenant rating to a completed service request."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"status": "fail", "message": "No data provided"}), 400
        
        result, status_code = add_tenant_rating(
            data.get('request_unique_id'),
            data.get('tenant_unique_id'),
            data.get('rating'),
            data.get('tenant_notes')
        )
        return jsonify(result), status_code
    except Exception as e:
        return jsonify({"status": "fail", "message": f"Service rating failed: {str(e)}"}), 500

@app.route('/service-request-details/<request_unique_id>', methods=['GET'])
def get_service_request_details_route(request_unique_id):
    """Get detailed information about a service request."""
    result, status_code = get_service_request_details(request_unique_id)
    return jsonify(result), status_code

# ==================== FINANCIAL TRACKING ENDPOINTS ====================

@app.route('/record-rent-payment', methods=['POST'])
def record_rent_payment_route():
    """Record a rent payment."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"status": "fail", "message": "No data provided"}), 400
        
        result, status_code = record_rent_payment(
            data.get('flat_unique_id'),
            data.get('tenant_unique_id'),
            data.get('amount'),
            data.get('payment_method', 'Other'),
            data.get('due_date'),
            data.get('late_fee', 0),
            data.get('transaction_id'),
            data.get('notes')
        )
        return jsonify(result), status_code
    except Exception as e:
        return jsonify({"status": "fail", "message": f"Payment recording failed: {str(e)}"}), 500

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

# ==================== ADMIN ENDPOINTS ====================

@app.route('/admin/statistics', methods=['GET'])
def get_system_statistics_route():
    """Get comprehensive system statistics."""
    result, status_code = get_system_statistics()
    return jsonify(result), status_code

@app.route('/admin/users', methods=['GET'])
def list_all_users_route():
    """List all users with optional filters."""
    account_type = request.args.get('account_type')
    currently_rented = request.args.get('currently_rented')
    
    if currently_rented is not None:
        currently_rented = currently_rented.lower() == 'true'
    
    result, status_code = list_all_users(account_type, currently_rented)
    return jsonify(result), status_code

@app.route('/admin/user-details/<unique_id>', methods=['GET'])
def get_user_detailed_info_route(unique_id):
    """Get detailed information about a specific user."""
    result, status_code = get_user_detailed_info(unique_id)
    return jsonify(result), status_code

@app.route('/admin/cleanup', methods=['POST'])
def cleanup_system_route():
    """Clean up orphaned data in the system."""
    result, status_code = cleanup_orphaned_data()
    return jsonify(result), status_code

@app.route('/admin/export', methods=['GET'])
def export_system_data_route():
    """Export system data for backup."""
    result, status_code = export_system_data()
    return jsonify(result), status_code

@app.route('/delete-user/<unique_id>', methods=['DELETE'])
def delete_user_route(unique_id):
    """Delete a user account."""
    result, status_code = delete_user_by_unique_id(unique_id)
    return jsonify(result), status_code

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
        print("🚀 Server starting on http://localhost:5000")
    
    app.run(debug=True, host='0.0.0.0', port=5000)