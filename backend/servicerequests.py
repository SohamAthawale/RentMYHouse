# servicerequests.py
from datetime import datetime
import uuid
from decimal import Decimal
from sqlalchemy.orm import joinedload
from models import db, User, Flat, ServiceRequest, ServiceExpense

# ------------------------- CREATE SERVICE REQUEST -------------------------
def create_service_request(flat_unique_id, tenant_unique_id, title, description, category, priority='Medium'):
    try:
        # Safety defaults
        title = (title or "Service Request").strip()
        description = (description or "").strip()
        category = category or "General"
        priority = priority or "Medium"

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

        request_unique_id = f"req-{uuid.uuid4().hex[:10]}"
        while ServiceRequest.query.filter_by(request_unique_id=request_unique_id).first():
            request_unique_id = f"req-{uuid.uuid4().hex[:10]}"

        service_request = ServiceRequest(
            request_unique_id=request_unique_id,
            flat_unique_id=flat_unique_id,
            tenant_unique_id=tenant_unique_id,
            owner_unique_id=flat.owner_unique_id,
            title=title,
            description=description,
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

# ------------------------- TENANT REQUESTS -------------------------
def get_tenant_service_requests(tenant_unique_id):
    try:
        tenant = User.query.filter_by(unique_id=tenant_unique_id).first()
        if not tenant:
            return {"status": "fail", "message": "Tenant not found"}, 404

        requests = (
            ServiceRequest.query
            .filter_by(tenant_unique_id=tenant_unique_id)
            .options(joinedload(ServiceRequest.flat))
            .order_by(ServiceRequest.requested_at.desc())
            .all()
        )

        data = []
        for req in requests:
            data.append({
                "request_unique_id": req.request_unique_id,

                # React naming compatibility
                "issue_description": req.description or "",
                "title": req.title or "",
                "category": req.category or "",
                "priority": req.priority or "Medium",
                "status": req.status or "Open",

                # Dates formatted for UI
                "request_date": req.requested_at.isoformat() if req.requested_at else None,
                "requested_at": req.requested_at.isoformat() if req.requested_at else None,
                "assigned_at": req.assigned_at.isoformat() if req.assigned_at else None,
                "completed_at": req.completed_at.isoformat() if req.completed_at else None,

                # Costs
                "estimated_cost": str(req.estimated_cost) if req.estimated_cost is not None else None,
                "actual_cost": str(req.actual_cost) if req.actual_cost is not None else None,

                # Notes / remarks
                "remarks": req.owner_notes,               # React expects "remarks"
                "tenant_notes": req.tenant_notes,
                "owner_notes": req.owner_notes,

                # Rating
                "rating": req.tenant_rating,              # React expects "rating"
                "tenant_rating": req.tenant_rating,

                # Flat details in frontend-friendly naming
                "flat_unique_id": req.flat.flat_unique_id if req.flat else None,
                "flat_name": req.flat.title if req.flat else None,
                "flat_address": req.flat.address if req.flat else None,

                "flat": {
                    "flat_unique_id": req.flat.flat_unique_id,
                    "title": req.flat.title,
                    "address": req.flat.address
                } if req.flat else None
            })

        return {"status": "success", "service_requests": data}, 200

    except Exception as e:
        return {"status": "fail", "message": f"Failed to get service requests: {str(e)}"}, 500

# ------------------------- OWNER REQUESTS -------------------------
def get_owner_service_requests(owner_unique_id):
    try:
        owner = User.query.filter_by(unique_id=owner_unique_id).first()
        if not owner:
            return {"status": "fail", "message": "Owner not found"}, 404

        requests = (
            ServiceRequest.query
            .filter_by(owner_unique_id=owner_unique_id)
            .options(joinedload(ServiceRequest.flat), joinedload(ServiceRequest.tenant))
            .order_by(ServiceRequest.requested_at.desc())
            .all()
        )

        data = []
        for req in requests:
            data.append({
                "request_unique_id": req.request_unique_id,
                "title": req.title,
                "description": req.description,
                "category": req.category,
                "priority": req.priority,
                "status": req.status,
                "requested_at": req.requested_at.isoformat() if req.requested_at else None,
                "assigned_at": req.assigned_at.isoformat() if req.assigned_at else None,
                "completed_at": req.completed_at.isoformat() if req.completed_at else None,
                "estimated_cost": str(req.estimated_cost) if req.estimated_cost is not None else None,
                "actual_cost": str(req.actual_cost) if req.actual_cost is not None else None,
                "contractor_name": req.contractor_name,
                "contractor_contact": req.contractor_contact,
                "tenant_notes": req.tenant_notes,
                "owner_notes": req.owner_notes,
                "tenant_rating": req.tenant_rating,
                "flat": {
                    "flat_unique_id": req.flat.flat_unique_id,
                    "title": req.flat.title,
                    "address": req.flat.address
                } if req.flat else None,
                "tenant": {
                    "unique_id": req.tenant.unique_id,
                    "username": req.tenant.username,
                    "contact_no": req.tenant.contact_no
                } if req.tenant else None
            })

        return {"status": "success", "service_requests": data}, 200

    except Exception as e:
        return {"status": "fail", "message": f"Failed to get service requests: {str(e)}"}, 500


# ------------------------- UPDATE REQUEST STATUS -------------------------
def update_service_request_status(request_unique_id, status, owner_notes=None, estimated_cost=None,
                                  actual_cost=None, contractor_name=None, contractor_contact=None):
    try:
        req = ServiceRequest.query.filter_by(request_unique_id=request_unique_id).first()
        if not req:
            return {"status": "fail", "message": "Service request not found"}, 404

        valid_statuses = ['Open', 'In Progress', 'Completed', 'Cancelled']
        if status not in valid_statuses:
            return {"status": "fail", "message": f"Invalid status"}, 400

        old_status = req.status
        req.status = status

        if status == "In Progress" and old_status == "Open":
            req.assigned_at = datetime.utcnow()
        if status == "Completed":
            req.completed_at = datetime.utcnow()

        if owner_notes:
            req.owner_notes = owner_notes.strip()

        if estimated_cost is not None:
            req.estimated_cost = Decimal(str(estimated_cost))

        if actual_cost is not None:
            req.actual_cost = Decimal(str(actual_cost))

        if contractor_name:
            req.contractor_name = contractor_name.strip()

        if contractor_contact:
            req.contractor_contact = contractor_contact.strip()

        if status == "Completed" and actual_cost is not None:
            expense_unique_id = f"exp-{uuid.uuid4().hex[:10]}"
            while ServiceExpense.query.filter_by(expense_unique_id=expense_unique_id).first():
                expense_unique_id = f"exp-{uuid.uuid4().hex[:10]}"

            expense = ServiceExpense(
                expense_unique_id=expense_unique_id,
                service_request_unique_id=request_unique_id,
                flat_unique_id=req.flat_unique_id,
                owner_unique_id=req.owner_unique_id,
                expense_type='Maintenance',
                description=f"Service expense for: {req.title}",
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
                "title": req.title,
                "status": status,
                "estimated_cost": str(req.estimated_cost) if req.estimated_cost is not None else None,
                "actual_cost": str(req.actual_cost) if req.actual_cost is not None else None,
                "completed_at": req.completed_at.isoformat() if req.completed_at else None
            }
        }, 200

    except Exception as e:
        db.session.rollback()
        return {"status": "fail", "message": f"Failed to update service request: {str(e)}"}, 500


# ------------------------- ADD TENANT RATING -------------------------
def add_tenant_rating(request_unique_id, tenant_unique_id, rating, tenant_notes=None):
    try:
        req = ServiceRequest.query.filter_by(request_unique_id=request_unique_id).first()
        if not req:
            return {"status": "fail", "message": "Service request not found"}, 404

        if req.tenant_unique_id != tenant_unique_id:
            return {"status": "fail", "message": "Only the requesting tenant can rate this service"}, 403

        if req.status != 'Completed':
            return {"status": "fail", "message": "Can only rate completed service requests"}, 400

        if not isinstance(rating, int) or rating < 1 or rating > 5:
            return {"status": "fail", "message": "Rating must be an integer between 1 and 5"}, 400

        req.tenant_rating = rating
        if tenant_notes:
            req.tenant_notes = tenant_notes.strip()

        db.session.commit()

        return {
            "status": "success",
            "message": "Service rating added successfully",
            "rating": {
                "request_unique_id": request_unique_id,
                "rating": rating,
                "tenant_notes": req.tenant_notes
            }
        }, 200

    except Exception as e:
        db.session.rollback()
        return {"status": "fail", "message": f"Failed to add rating: {str(e)}"}, 500


# ------------------------- REQUEST DETAILS -------------------------
def get_service_request_details(request_unique_id):
    try:
        req = (
            ServiceRequest.query
            .filter_by(request_unique_id=request_unique_id)
            .options(
                joinedload(ServiceRequest.flat),
                joinedload(ServiceRequest.tenant),
                joinedload(ServiceRequest.owner),
                joinedload(ServiceRequest.expenses)
            )
            .first()
        )

        if not req:
            return {"status": "fail", "message": "Service request not found"}, 404

        expense_list = []
        for exp in req.expenses:
            expense_list.append({
                "expense_unique_id": exp.expense_unique_id,
                "expense_type": exp.expense_type,
                "description": exp.description,
                "amount": str(exp.amount),
                "expense_date": exp.expense_date.isoformat() if exp.expense_date else None,
                "vendor_name": exp.vendor_name,
                "vendor_contact": exp.vendor_contact
            })

        data = {
            "request_unique_id": req.request_unique_id,
            "title": req.title,
            "description": req.description,
            "category": req.category,
            "priority": req.priority,
            "status": req.status,
            "requested_at": req.requested_at.isoformat() if req.requested_at else None,
            "assigned_at": req.assigned_at.isoformat() if req.assigned_at else None,
            "completed_at": req.completed_at.isoformat() if req.completed_at else None,
            "estimated_cost": str(req.estimated_cost) if req.estimated_cost is not None else None,
            "actual_cost": str(req.actual_cost) if req.actual_cost is not None else None,
            "contractor_name": req.contractor_name,
            "contractor_contact": req.contractor_contact,
            "tenant_notes": req.tenant_notes,
            "owner_notes": req.owner_notes,
            "tenant_rating": req.tenant_rating,
            "flat": {
                "flat_unique_id": req.flat.flat_unique_id,
                "title": req.flat.title,
                "address": req.flat.address
            } if req.flat else None,
            "tenant": {
                "unique_id": req.tenant.unique_id,
                "username": req.tenant.username,
                "contact_no": req.tenant.contact_no
            } if req.tenant else None,
            "owner": {
                "unique_id": req.owner.unique_id,
                "username": req.owner.username,
                "contact_no": req.owner.contact_no
            } if req.owner else None,
            "expenses": expense_list
        }

        return {"status": "success", "request_details": data}, 200

    except Exception as e:
        return {"status": "fail", "message": f"Failed to load details: {str(e)}"}, 500
