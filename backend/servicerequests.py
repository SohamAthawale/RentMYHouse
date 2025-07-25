# Service Requests Module for Rental Management System

from datetime import datetime
import uuid
from decimal import Decimal
from models import db, User, Flat, ServiceRequest, ServiceExpense

def create_service_request(flat_unique_id, tenant_unique_id, title, description, category, priority='Medium'):
    """
    Create a new service request from tenant to owner.
    
    Args:
        flat_unique_id (str): Flat's unique identifier
        tenant_unique_id (str): Tenant's unique identifier
        title (str): Request title
        description (str): Detailed description
        category (str): Category (Plumbing, Electrical, HVAC, etc.)
        priority (str): Priority level (Low, Medium, High, Emergency)
    
    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        # Verify flat and tenant exist
        flat = Flat.query.filter_by(flat_unique_id=flat_unique_id).first()
        tenant = User.query.filter_by(unique_id=tenant_unique_id).first()
        
        if not flat:
            return {"status": "fail", "message": "Flat not found"}, 404
        
        if not tenant:
            return {"status": "fail", "message": "Tenant not found"}, 404
        
        if tenant.account_type != 'Tenant':
            return {"status": "fail", "message": "Only tenants can create service requests"}, 403
        
        # Verify tenant is renting this flat
        if flat.rented_to_unique_id != tenant_unique_id:
            return {"status": "fail", "message": "Tenant is not renting this flat"}, 403

        # Validate input
        valid_categories = ['Plumbing', 'Electrical', 'HVAC', 'Appliances', 'General Maintenance', 'Emergency']
        valid_priorities = ['Low', 'Medium', 'High', 'Emergency']
        
        if category not in valid_categories:
            return {"status": "fail", "message": f"Invalid category. Must be one of: {', '.join(valid_categories)}"}, 400
        
        if priority not in valid_priorities:
            return {"status": "fail", "message": f"Invalid priority. Must be one of: {', '.join(valid_priorities)}"}, 400

        # Generate unique request_unique_id
        request_unique_id = f"req-{uuid.uuid4().hex[:10]}"
        while ServiceRequest.query.filter_by(request_unique_id=request_unique_id).first():
            request_unique_id = f"req-{uuid.uuid4().hex[:10]}"

        # Create service request
        service_request = ServiceRequest(
            request_unique_id=request_unique_id,
            flat_unique_id=flat_unique_id,
            tenant_unique_id=tenant_unique_id,
            owner_unique_id=flat.owner_unique_id,
            title=title.strip(),
            description=description.strip(),
            category=category,
            priority=priority,
            status='Open',
            requested_at=datetime.utcnow()
        )
        
        db.session.add(service_request)
        db.session.commit()

        return {
            "status": "success",
            "message": "Service request created successfully",
            "request": {
                "request_unique_id": request_unique_id,
                "title": title,
                "category": category,
                "priority": priority,
                "status": "Open",
                "flat_title": flat.title,
                "requested_at": service_request.requested_at.isoformat()
            }
        }, 201

    except Exception as e:
        db.session.rollback()
        return {"status": "fail", "message": f"Failed to create service request: {str(e)}"}, 500

def get_tenant_service_requests(tenant_unique_id):
    """
    Get all service requests for a specific tenant.
    
    Args:
        tenant_unique_id (str): Tenant's unique identifier
    
    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        tenant = User.query.filter_by(unique_id=tenant_unique_id).first()
        if not tenant:
            return {"status": "fail", "message": "Tenant not found"}, 404
        
        requests = tenant.service_requests_as_tenant.order_by(ServiceRequest.requested_at.desc()).all()
        requests_data = []
        
        for req in requests:
            request_info = {
                "request_unique_id": req.request_unique_id,
                "title": req.title,
                "description": req.description,
                "category": req.category,
                "priority": req.priority,
                "status": req.status,
                "requested_at": req.requested_at.isoformat(),
                "assigned_at": req.assigned_at.isoformat() if req.assigned_at else None,
                "completed_at": req.completed_at.isoformat() if req.completed_at else None,
                "estimated_cost": str(req.estimated_cost) if req.estimated_cost else None,
                "actual_cost": str(req.actual_cost) if req.actual_cost else None,
                "contractor_name": req.contractor_name,
                "contractor_contact": req.contractor_contact,
                "tenant_notes": req.tenant_notes,
                "owner_notes": req.owner_notes,
                "tenant_rating": req.tenant_rating,
                "flat": {
                    "flat_unique_id": req.flat.flat_unique_id,
                    "title": req.flat.title,
                    "address": req.flat.address
                }
            }
            requests_data.append(request_info)

        return {"status": "success", "service_requests": requests_data}, 200

    except Exception as e:
        return {"status": "fail", "message": f"Failed to get service requests: {str(e)}"}, 500

def get_owner_service_requests(owner_unique_id):
    """
    Get all service requests for properties owned by a specific owner.
    
    Args:
        owner_unique_id (str): Owner's unique identifier
    
    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        owner = User.query.filter_by(unique_id=owner_unique_id).first()
        if not owner:
            return {"status": "fail", "message": "Owner not found"}, 404
        
        requests = owner.service_requests_as_owner.order_by(ServiceRequest.requested_at.desc()).all()
        requests_data = []
        
        for req in requests:
            request_info = {
                "request_unique_id": req.request_unique_id,
                "title": req.title,
                "description": req.description,
                "category": req.category,
                "priority": req.priority,
                "status": req.status,
                "requested_at": req.requested_at.isoformat(),
                "assigned_at": req.assigned_at.isoformat() if req.assigned_at else None,
                "completed_at": req.completed_at.isoformat() if req.completed_at else None,
                "estimated_cost": str(req.estimated_cost) if req.estimated_cost else None,
                "actual_cost": str(req.actual_cost) if req.actual_cost else None,
                "contractor_name": req.contractor_name,
                "contractor_contact": req.contractor_contact,
                "tenant_notes": req.tenant_notes,
                "owner_notes": req.owner_notes,
                "tenant_rating": req.tenant_rating,
                "flat": {
                    "flat_unique_id": req.flat.flat_unique_id,
                    "title": req.flat.title,
                    "address": req.flat.address
                },
                "tenant": {
                    "unique_id": req.tenant.unique_id,
                    "username": req.tenant.username,
                    "contact_no": req.tenant.contact_no
                }
            }
            requests_data.append(request_info)

        return {"status": "success", "service_requests": requests_data}, 200

    except Exception as e:
        return {"status": "fail", "message": f"Failed to get service requests: {str(e)}"}, 500

def update_service_request_status(request_unique_id, status, owner_notes=None, estimated_cost=None, 
                                 actual_cost=None, contractor_name=None, contractor_contact=None):
    """
    Update service request status and details (owner action).
    
    Args:
        request_unique_id (str): Request's unique identifier
        status (str): New status (In Progress, Completed, Cancelled)
        owner_notes (str, optional): Owner's notes
        estimated_cost (float, optional): Estimated cost
        actual_cost (float, optional): Actual cost when completed
        contractor_name (str, optional): Contractor name
        contractor_contact (str, optional): Contractor contact
    
    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        request = ServiceRequest.query.filter_by(request_unique_id=request_unique_id).first()
        if not request:
            return {"status": "fail", "message": "Service request not found"}, 404

        valid_statuses = ['Open', 'In Progress', 'Completed', 'Cancelled']
        if status not in valid_statuses:
            return {"status": "fail", "message": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"}, 400

        # Update status and timestamp
        old_status = request.status
        request.status = status
        
        if status == 'In Progress' and old_status == 'Open':
            request.assigned_at = datetime.utcnow()
        elif status == 'Completed':
            request.completed_at = datetime.utcnow()

        # Update optional fields
        if owner_notes:
            request.owner_notes = owner_notes.strip()
        
        if estimated_cost is not None:
            request.estimated_cost = Decimal(str(estimated_cost))
        
        if actual_cost is not None:
            request.actual_cost = Decimal(str(actual_cost))
        
        if contractor_name:
            request.contractor_name = contractor_name.strip()
        
        if contractor_contact:
            request.contractor_contact = contractor_contact.strip()

        # If completed with actual cost, create expense record
        if status == 'Completed' and actual_cost is not None:
            expense_unique_id = f"exp-{uuid.uuid4().hex[:10]}"
            while ServiceExpense.query.filter_by(expense_unique_id=expense_unique_id).first():
                expense_unique_id = f"exp-{uuid.uuid4().hex[:10]}"
            
            expense = ServiceExpense(
                expense_unique_id=expense_unique_id,
                service_request_unique_id=request_unique_id,
                flat_unique_id=request.flat_unique_id,
                owner_unique_id=request.owner_unique_id,
                expense_type='Maintenance',
                description=f"Service expense for: {request.title}",
                amount=Decimal(str(actual_cost)),
                expense_date=datetime.utcnow(),
                vendor_name=contractor_name,
                vendor_contact=contractor_contact,
                notes=f"Auto-generated expense from service request completion"
            )
            db.session.add(expense)

        db.session.commit()

        return {
            "status": "success",
            "message": f"Service request status updated to '{status}'",
            "request": {
                "request_unique_id": request_unique_id,
                "title": request.title,
                "status": status,
                "estimated_cost": str(request.estimated_cost) if request.estimated_cost else None,
                "actual_cost": str(request.actual_cost) if request.actual_cost else None,
                "completed_at": request.completed_at.isoformat() if request.completed_at else None
            }
        }, 200

    except Exception as e:
        db.session.rollback()
        return {"status": "fail", "message": f"Failed to update service request: {str(e)}"}, 500

def add_tenant_rating(request_unique_id, tenant_unique_id, rating, tenant_notes=None):
    """
    Allow tenant to rate completed service request.
    
    Args:
        request_unique_id (str): Request's unique identifier
        tenant_unique_id (str): Tenant's unique identifier
        rating (int): Rating from 1-5
        tenant_notes (str, optional): Tenant's additional notes
    
    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        request = ServiceRequest.query.filter_by(request_unique_id=request_unique_id).first()
        if not request:
            return {"status": "fail", "message": "Service request not found"}, 404
        
        if request.tenant_unique_id != tenant_unique_id:
            return {"status": "fail", "message": "Only the requesting tenant can rate this service"}, 403
        
        if request.status != 'Completed':
            return {"status": "fail", "message": "Can only rate completed service requests"}, 400
        
        if not isinstance(rating, int) or rating < 1 or rating > 5:
            return {"status": "fail", "message": "Rating must be an integer between 1 and 5"}, 400

        request.tenant_rating = rating
        if tenant_notes:
            request.tenant_notes = tenant_notes.strip()
        
        db.session.commit()

        return {
            "status": "success",
            "message": "Service rating added successfully",
            "rating": {
                "request_unique_id": request_unique_id,
                "rating": rating,
                "tenant_notes": request.tenant_notes
            }
        }, 200

    except Exception as e:
        db.session.rollback()
        return {"status": "fail", "message": f"Failed to add rating: {str(e)}"}, 500

def get_service_request_details(request_unique_id):
    """
    Get detailed information about a specific service request.
    
    Args:
        request_unique_id (str): Request's unique identifier
    
    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        request = ServiceRequest.query.filter_by(request_unique_id=request_unique_id).first()
        if not request:
            return {"status": "fail", "message": "Service request not found"}, 404

        # Get related expenses
        expenses = request.expenses.all()
        expenses_data = []
        for expense in expenses:
            expense_info = {
                "expense_unique_id": expense.expense_unique_id,
                "expense_type": expense.expense_type,
                "description": expense.description,
                "amount": str(expense.amount),
                "expense_date": expense.expense_date.isoformat(),
                "vendor_name": expense.vendor_name,
                "vendor_contact": expense.vendor_contact
            }
            expenses_data.append(expense_info)

        request_details = {
            "request_unique_id": request.request_unique_id,
            "title": request.title,
            "description": request.description,
            "category": request.category,
            "priority": request.priority,
            "status": request.status,
            "requested_at": request.requested_at.isoformat(),
            "assigned_at": request.assigned_at.isoformat() if request.assigned_at else None,
            "completed_at": request.completed_at.isoformat() if request.completed_at else None,
            "estimated_cost": str(request.estimated_cost) if request.estimated_cost else None,
            "actual_cost": str(request.actual_cost) if request.actual_cost else None,
            "contractor_name": request.contractor_name,
            "contractor_contact": request.contractor_contact,
            "tenant_notes": request.tenant_notes,
            "owner_notes": request.owner_notes,
            "tenant_rating": request.tenant_rating,
            "flat": {
                "flat_unique_id": request.flat.flat_unique_id,
                "title": request.flat.title,
                "address": request.flat.address
            },
            "tenant": {
                "unique_id": request.tenant.unique_id,
                "username": request.tenant.username,
                "contact_no": request.tenant.contact_no
            },
            "owner": {
                "unique_id": request.owner.unique_id,
                "username": request.owner.username,
                "contact_no": request.owner.contact_no
            },
            "expenses": expenses_data
        }

        return {"status": "success", "request_details": request_details}, 200

    except Exception as e:
        return {"status": "fail", "message": f"Failed to get request details: {str(e)}"}, 500