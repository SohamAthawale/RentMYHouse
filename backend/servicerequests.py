# Service Requests Module for Rental Management System

from datetime import datetime
import uuid
from decimal import Decimal
from models import db, User, Flat, ServiceRequest, ServiceExpense

# --------------------------------------------------
# CREATE SERVICE REQUEST
# --------------------------------------------------

def create_service_request(flat_unique_id, tenant_unique_id, title, description, category, priority='Medium'):
    try:
        flat = Flat.query.filter_by(flat_unique_id=flat_unique_id).first()
        tenant = User.query.filter_by(unique_id=tenant_unique_id).first()

        if not flat:
            return {"status": "fail", "message": "Flat not found"}, 404

        if not tenant:
            return {"status": "fail", "message": "Tenant not found"}, 404

        if tenant.account_type != 'Tenant':
            return {"status": "fail", "message": "Only tenants can create service requests"}, 403

        if flat.rented_to_unique_id != tenant_unique_id:
            return {"status": "fail", "message": "Tenant is not renting this flat"}, 403

        valid_categories = ['Plumbing', 'Electrical', 'HVAC', 'Appliances', 'General Maintenance', 'Emergency']
        valid_priorities = ['Low', 'Medium', 'High', 'Emergency']

        if category not in valid_categories:
            return {"status": "fail", "message": "Invalid category"}, 400

        if priority not in valid_priorities:
            return {"status": "fail", "message": "Invalid priority"}, 400

        request_unique_id = f"req-{uuid.uuid4().hex[:10]}"
        while ServiceRequest.query.filter_by(request_unique_id=request_unique_id).first():
            request_unique_id = f"req-{uuid.uuid4().hex[:10]}"

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
            requested_at=datetime.utcnow(),
            expense_created=False
        )

        db.session.add(service_request)
        db.session.commit()

        return {
            "status": "success",
            "message": "Service request created successfully",
            "request_unique_id": request_unique_id
        }, 201

    except Exception as e:
        db.session.rollback()
        return {"status": "fail", "message": str(e)}, 500


# --------------------------------------------------
# GET TENANT SERVICE REQUESTS
# --------------------------------------------------

def get_tenant_service_requests(tenant_unique_id):
    try:
        tenant = User.query.filter_by(unique_id=tenant_unique_id).first()
        if not tenant:
            return {"status": "fail", "message": "Tenant not found"}, 404

        requests = tenant.service_requests_as_tenant.order_by(
            ServiceRequest.requested_at.desc()
        ).all()

        data = []
        for r in requests:
            data.append({
                "request_unique_id": r.request_unique_id,
                "title": r.title,
                "category": r.category,
                "priority": r.priority,
                "status": r.status,
                "requested_at": r.requested_at.isoformat(),
                "completed_at": r.completed_at.isoformat() if r.completed_at else None,
                "tenant_rating": r.tenant_rating
            })

        return {"status": "success", "service_requests": data}, 200

    except Exception as e:
        return {"status": "fail", "message": str(e)}, 500


# --------------------------------------------------
# GET OWNER SERVICE REQUESTS
# --------------------------------------------------

def get_owner_service_requests(owner_unique_id):
    try:
        owner = User.query.filter_by(unique_id=owner_unique_id).first()
        if not owner:
            return {"status": "fail", "message": "Owner not found"}, 404

        requests = owner.service_requests_as_owner.order_by(
            ServiceRequest.requested_at.desc()
        ).all()

        data = []
        for r in requests:
            data.append({
                "request_unique_id": r.request_unique_id,
                "title": r.title,
                "status": r.status,
                "priority": r.priority,
                "category": r.category,
                "flat_title": r.flat.title,
                "tenant_name": r.tenant.username,
                "actual_cost": str(r.actual_cost) if r.actual_cost else None
            })

        return {"status": "success", "service_requests": data}, 200

    except Exception as e:
        return {"status": "fail", "message": str(e)}, 500


# --------------------------------------------------
# UPDATE SERVICE REQUEST (OWNER)
# --------------------------------------------------

def update_service_request_status(
    request_unique_id,
    status,
    owner_notes=None,
    estimated_cost=None,
    actual_cost=None,
    contractor_name=None,
    contractor_contact=None
):
    try:
        request = ServiceRequest.query.filter_by(
            request_unique_id=request_unique_id
        ).first()

        if not request:
            return {"status": "fail", "message": "Service request not found"}, 404

        valid_statuses = ['Open', 'In Progress', 'Completed', 'Cancelled']
        if status not in valid_statuses:
            return {"status": "fail", "message": "Invalid status"}, 400

        # ---------------- STATUS UPDATES ----------------
        previous_status = request.status
        request.status = status

        if status == 'In Progress' and previous_status == 'Open':
            request.assigned_at = datetime.utcnow()

        if status == 'Completed':
            if actual_cost is None:
                return {
                    "status": "fail",
                    "message": "Actual cost required to complete request"
                }, 400
            request.completed_at = datetime.utcnow()

        # ---------------- FIELD UPDATES ----------------
        if owner_notes is not None:
            request.owner_notes = owner_notes.strip()

        if estimated_cost is not None:
            request.estimated_cost = Decimal(str(estimated_cost))

        if actual_cost is not None:
            request.actual_cost = Decimal(str(actual_cost))

        if contractor_name:
            request.contractor_name = contractor_name.strip()

        if contractor_contact:
            request.contractor_contact = contractor_contact.strip()

        # ---------------- CREATE EXPENSE (ONCE ONLY) ----------------
        if (
            status == 'Completed'
            and actual_cost is not None
            and not request.expense_created
        ):
            expense_unique_id = f"exp-{uuid.uuid4().hex[:10]}"
            while ServiceExpense.query.filter_by(
                expense_unique_id=expense_unique_id
            ).first():
                expense_unique_id = f"exp-{uuid.uuid4().hex[:10]}"

            expense = ServiceExpense(
                expense_unique_id=expense_unique_id,
                service_request_unique_id=request.request_unique_id,
                flat_unique_id=request.flat_unique_id,
                owner_unique_id=request.owner_unique_id,
                expense_type='Maintenance',
                description=f"Service: {request.title}",
                amount=Decimal(str(actual_cost)),
                expense_date=datetime.utcnow(),
                vendor_name=contractor_name,
                vendor_contact=contractor_contact,
                notes="Auto-generated from completed service request"
            )

            db.session.add(expense)
            request.expense_created = True  # 🔥 CRITICAL SAFETY FLAG

        db.session.commit()

        return {
            "status": "success",
            "message": f"Service request updated to {status}"
        }, 200

    except Exception as e:
        db.session.rollback()
        return {"status": "fail", "message": str(e)}, 500

from decimal import Decimal
from models import db, ServiceExpense

def update_service_expense(
    expense_unique_id,
    owner_unique_id,
    amount=None,
    description=None,
    expense_type=None,
    vendor_name=None,
    vendor_contact=None,
    is_tax_deductible=None,
    notes=None,
):
    try:
        expense = ServiceExpense.query.filter_by(
            expense_unique_id=expense_unique_id
        ).first()

        if not expense:
            return {"status": "fail", "message": "Expense not found"}, 404

        # 🔐 OWNER CHECK
        if expense.owner_unique_id != owner_unique_id:
            return {
                "status": "fail",
                "message": "You are not authorized to edit this expense"
            }, 403

        # ---------------- UPDATE FIELDS ----------------

        if amount is not None:
            amount = Decimal(str(amount))
            if amount <= 0:
                return {
                    "status": "fail",
                    "message": "Amount must be greater than zero"
                }, 400
            expense.amount = amount

        if description is not None:
            expense.description = description.strip()

        if expense_type is not None:
            expense.expense_type = expense_type

        if vendor_name is not None:
            expense.vendor_name = vendor_name.strip()

        if vendor_contact is not None:
            expense.vendor_contact = vendor_contact.strip()

        if is_tax_deductible is not None:
            expense.is_tax_deductible = bool(is_tax_deductible)

        if notes is not None:
            expense.notes = notes.strip()

        db.session.commit()

        return {
            "status": "success",
            "message": "Service expense updated successfully",
            "expense": {
                "expense_unique_id": expense.expense_unique_id,
                "amount": str(expense.amount),
                "expense_type": expense.expense_type,
                "description": expense.description,
                "vendor_name": expense.vendor_name,
                "is_tax_deductible": expense.is_tax_deductible,
            }
        }, 200

    except Exception as e:
        db.session.rollback()
        return {
            "status": "fail",
            "message": str(e)
        }, 500

# --------------------------------------------------
# ADD TENANT RATING
# --------------------------------------------------

def add_tenant_rating(request_unique_id, tenant_unique_id, rating, tenant_notes=None):
    try:
        request = ServiceRequest.query.filter_by(
            request_unique_id=request_unique_id
        ).first()

        if not request:
            return {"status": "fail", "message": "Service request not found"}, 404

        if request.tenant_unique_id != tenant_unique_id:
            return {"status": "fail", "message": "Unauthorized"}, 403

        if request.status != 'Completed':
            return {"status": "fail", "message": "Request not completed"}, 400

        if request.tenant_rating is not None:
            return {"status": "fail", "message": "Already rated"}, 403

        if not isinstance(rating, int) or not 1 <= rating <= 5:
            return {"status": "fail", "message": "Invalid rating"}, 400

        request.tenant_rating = rating
        request.tenant_notes = tenant_notes.strip() if tenant_notes else None

        db.session.commit()

        return {"status": "success", "message": "Rating submitted"}, 200

    except Exception as e:
        db.session.rollback()
        return {"status": "fail", "message": str(e)}, 500


# --------------------------------------------------
# GET SERVICE REQUEST DETAILS
# --------------------------------------------------

def get_service_request_details(request_unique_id):
    try:
        request = ServiceRequest.query.filter_by(
            request_unique_id=request_unique_id
        ).first()

        if not request:
            return {"status": "fail", "message": "Service request not found"}, 404

        expenses = [
            {
                "expense_unique_id": e.expense_unique_id,
                "amount": str(e.amount),
                "expense_date": e.expense_date.isoformat(),
                "vendor_name": e.vendor_name
            }
            for e in request.expenses.all()
        ]

        return {
            "status": "success",
            "request_details": {
                "request_unique_id": request.request_unique_id,
                "title": request.title,
                "status": request.status,
                "actual_cost": str(request.actual_cost) if request.actual_cost else None,
                "tenant_rating": request.tenant_rating,
                "expenses": expenses
            }
        }, 200

    except Exception as e:
        return {"status": "fail", "message": str(e)}, 500
