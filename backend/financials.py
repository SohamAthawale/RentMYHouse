# Financial Tracking Module for Rental Management System

from datetime import datetime, date
from dateutil.relativedelta import relativedelta
import uuid
from decimal import Decimal
from sqlalchemy import func, extract
from models import db, User, Flat, RentPayment, ServiceExpense
from datetime import datetime, timedelta
from utilities import send_email

def record_rent_payment(
    flat_unique_id,
    tenant_unique_id,
    amount,
    payment_method='Other',
    due_date=None,
    late_fee=0,
    transaction_id=None,
    notes=None,
    payment_status='Paid',                 # ✅ NEW (backward compatible)
    send_confirmation_email=False           # ✅ NEW
):
    """
    Record a rent payment.
    (Extended safely – old calls still work)
    """
    try:
        # Verify flat and tenant
        flat = Flat.query.filter_by(flat_unique_id=flat_unique_id).first()
        tenant = User.query.filter_by(unique_id=tenant_unique_id).first()

        if not flat:
            return {"status": "fail", "message": "Flat not found"}, 404

        if not tenant:
            return {"status": "fail", "message": "Tenant not found"}, 404

        # Verify tenant is renting this flat
        if flat.rented_to_unique_id != tenant_unique_id:
            return {"status": "fail", "message": "Tenant is not renting this flat"}, 403

        # Generate unique payment ID
        payment_unique_id = f"pay-{uuid.uuid4().hex[:10]}"
        while RentPayment.query.filter_by(payment_unique_id=payment_unique_id).first():
            payment_unique_id = f"pay-{uuid.uuid4().hex[:10]}"

        # Default due date
        if not due_date:
            due_date = date.today().replace(day=1)

        payment = RentPayment(
            payment_unique_id=payment_unique_id,
            flat_unique_id=flat_unique_id,
            tenant_unique_id=tenant_unique_id,
            owner_unique_id=flat.owner_unique_id,
            amount=Decimal(str(amount)),
            payment_date=datetime.utcnow(),
            due_date=due_date,
            payment_method=payment_method,
            payment_status=payment_status,
            late_fee=Decimal(str(late_fee)) if late_fee else Decimal('0'),
            transaction_id=transaction_id,
            notes=notes
        )

        db.session.add(payment)
        db.session.commit()

        # 📧 EMAIL ONLY FOR OWNER-RECORDED PAYMENTS
        if send_confirmation_email:
            owner = User.query.filter_by(unique_id=flat.owner_unique_id).first()

            if tenant and tenant.email:
                send_email(
                    tenant.email,
                    "Rent Payment Recorded",
                    f"""Hi {tenant.username},

Your rent payment of ₹{payment.amount} for the flat '{flat.title}'
has been recorded by the owner.

Payment Method: {payment_method}
Date: {payment.payment_date.strftime('%Y-%m-%d')}
Status: PAID

Thank you.
"""
                )

            if owner and owner.email:
                send_email(
                    owner.email,
                    "Rent Payment Recorded Successfully",
                    f"""Hi {owner.username},

You have successfully recorded a rent payment.

Flat: {flat.title}
Tenant: {tenant.username}
Amount: ₹{payment.amount}
Date: {payment.payment_date.strftime('%Y-%m-%d')}
Status: PAID
"""
                )

        return {
            "status": "success",
            "message": "Rent payment recorded successfully",
            "payment": {
                "payment_unique_id": payment_unique_id,
                "amount": str(amount),
                "payment_date": payment.payment_date.isoformat(),
                "due_date": due_date.isoformat(),
                "payment_status": payment.payment_status,
                "flat_title": flat.title,
                "tenant_name": tenant.username
            }
        }, 201

    except Exception as e:
        db.session.rollback()
        return {"status": "fail", "message": f"Failed to record payment: {str(e)}"}, 500


def owner_record_rent_payment(
    owner_unique_id,
    flat_unique_id,
    amount,
    payment_method='Other',
    notes=None
):
    try:
        ALLOWED_PAYMENT_METHODS = [
            'Cash',
            'Check',
            'Bank Transfer',
            'Credit Card',
            'PayPal',
            'Other'
        ]

        owner = User.query.filter_by(unique_id=owner_unique_id).first()
        if not owner or owner.account_type != 'Owner':
            return {"status": "fail", "message": "Invalid owner"}, 403

        flat = Flat.query.filter_by(flat_unique_id=flat_unique_id).first()
        if not flat:
            return {"status": "fail", "message": "Flat not found"}, 404

        if flat.owner_unique_id != owner_unique_id:
            return {"status": "fail", "message": "You do not own this flat"}, 403

        if not flat.rented_to_unique_id:
            return {"status": "fail", "message": "Cannot record rent: flat is not rented"}, 400

        if payment_method not in ALLOWED_PAYMENT_METHODS:
            return {
                "status": "fail",
                "message": f"Invalid payment method. Allowed: {', '.join(ALLOWED_PAYMENT_METHODS)}"
            }, 400

        return record_rent_payment(
            flat_unique_id=flat_unique_id,
            tenant_unique_id=flat.rented_to_unique_id,
            amount=amount,
            payment_method=payment_method,
            notes=notes,
            payment_status='Paid',
            send_confirmation_email=True   # ✅ OWNER EMAIL TRIGGER
        )

    except Exception as e:
        db.session.rollback()
        return {"status": "fail", "message": f"Owner rent recording failed: {str(e)}"}, 500


def get_owner_financial_summary(owner_unique_id, year=None, month=None):
    try:
        owner = User.query.filter_by(unique_id=owner_unique_id).first()
        if not owner:
            return {"status": "fail", "message": "Owner not found"}, 404

        if owner.account_type != 'Owner':
            return {"status": "fail", "message": "User is not an owner"}, 403

        if year is None:
            year = datetime.now().year

        # ---------------- BASE QUERIES ----------------

        payment_query = RentPayment.query.filter_by(
            owner_unique_id=owner_unique_id,
            payment_status="Paid"  # 🔥 IMPORTANT FIX
        )

        expense_query = ServiceExpense.query.filter_by(
            owner_unique_id=owner_unique_id
        )

        if year:
            payment_query = payment_query.filter(
                extract('year', RentPayment.payment_date) == year
            )
            expense_query = expense_query.filter(
                extract('year', ServiceExpense.expense_date) == year
            )

        if month:
            payment_query = payment_query.filter(
                extract('month', RentPayment.payment_date) == month
            )
            expense_query = expense_query.filter(
                extract('month', ServiceExpense.expense_date) == month
            )

        # ---------------- TOTALS ----------------

        total_income = payment_query.with_entities(
            func.coalesce(func.sum(RentPayment.amount), 0)
        ).scalar()

        total_expenses = expense_query.with_entities(
            func.coalesce(func.sum(ServiceExpense.amount), 0)
        ).scalar()

        profit = total_income - total_expenses

        # ---------------- MONTHLY BREAKDOWN ----------------

        monthly_data = []
        for m in range(1, 13):
            month_income = db.session.query(
                func.coalesce(func.sum(RentPayment.amount), 0)
            ).filter_by(
                owner_unique_id=owner_unique_id,
                payment_status="Paid"
            ).filter(
                extract('year', RentPayment.payment_date) == year,
                extract('month', RentPayment.payment_date) == m
            ).scalar()

            month_expenses = db.session.query(
                func.coalesce(func.sum(ServiceExpense.amount), 0)
            ).filter_by(
                owner_unique_id=owner_unique_id
            ).filter(
                extract('year', ServiceExpense.expense_date) == year,
                extract('month', ServiceExpense.expense_date) == m
            ).scalar()

            monthly_data.append({
                "month": m,
                "month_name": date(year, m, 1).strftime("%B"),
                "income": str(month_income),
                "expenses": str(month_expenses),
                "profit": str(month_income - month_expenses)
            })

        # ---------------- PROPERTY BREAKDOWN ----------------

        properties_data = []
        flats = owner.flats_owned.all()

        for flat in flats:
            flat_income = payment_query.filter_by(
                flat_unique_id=flat.flat_unique_id
            ).with_entities(
                func.coalesce(func.sum(RentPayment.amount), 0)
            ).scalar()

            flat_expenses = expense_query.filter_by(
                flat_unique_id=flat.flat_unique_id
            ).with_entities(
                func.coalesce(func.sum(ServiceExpense.amount), 0)
            ).scalar()

            properties_data.append({
                "flat_unique_id": flat.flat_unique_id,
                "title": flat.title,
                "address": flat.address,
                "monthly_rent": str(flat.rent),
                "is_rented": bool(flat.rented_to_unique_id),
                "income": str(flat_income),
                "expenses": str(flat_expenses),
                "profit": str(flat_income - flat_expenses)
            })

        # ---------------- EXPENSE CATEGORIES ----------------

        expense_categories = db.session.query(
            ServiceExpense.expense_type,
            func.coalesce(func.sum(ServiceExpense.amount), 0)
        ).filter_by(
            owner_unique_id=owner_unique_id
        )

        if year:
            expense_categories = expense_categories.filter(
                extract('year', ServiceExpense.expense_date) == year
            )
        if month:
            expense_categories = expense_categories.filter(
                extract('month', ServiceExpense.expense_date) == month
            )

        expense_categories = expense_categories.group_by(
            ServiceExpense.expense_type
        ).all()

        categories_data = [
            {"category": c, "total": str(t)} for c, t in expense_categories
        ]

        financial_summary = {
            "period": {
                "year": year,
                "month": month,
                "month_name": date(year, month, 1).strftime("%B") if month else None
            },
            "summary": {
                "total_income": str(total_income),
                "total_expenses": str(total_expenses),
                "net_profit": str(profit),
                "profit_margin": str(
                    round((profit / total_income * 100), 2)
                ) if total_income > 0 else "0.00"
            },
            "monthly_breakdown": monthly_data,
            "properties_breakdown": properties_data,
            "expense_categories": categories_data,
            "statistics": {
                "total_properties": len(flats),
                "rented_properties": sum(1 for f in flats if f.rented_to_unique_id),
                "vacant_properties": sum(1 for f in flats if not f.rented_to_unique_id),
                "average_rent": str(
                    sum(f.rent for f in flats) / len(flats)
                ) if flats else "0.00"
            }
        }

        return {"status": "success", "financial_summary": financial_summary}, 200

    except Exception as e:
        return {
            "status": "fail",
            "message": f"Failed to get financial summary: {str(e)}"
        }, 500


def get_rent_payment_history(flat_unique_id=None, tenant_unique_id=None, owner_unique_id=None):
    """
    Get rent payment history with optional filters.
    
    Args:
        flat_unique_id (str, optional): Filter by flat
        tenant_unique_id (str, optional): Filter by tenant
        owner_unique_id (str, optional): Filter by owner
    
    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        query = RentPayment.query
        
        if flat_unique_id:
            query = query.filter_by(flat_unique_id=flat_unique_id)
        
        if tenant_unique_id:
            query = query.filter_by(tenant_unique_id=tenant_unique_id)
        
        if owner_unique_id:
            query = query.filter_by(owner_unique_id=owner_unique_id)
        
        payments = query.order_by(RentPayment.payment_date.desc()).all()
        payments_data = []
        
        for payment in payments:
            payment_info = {
                "payment_unique_id": payment.payment_unique_id,
                "amount": str(payment.amount),
                "payment_date": payment.payment_date.isoformat(),
                "due_date": payment.due_date.isoformat(),
                "payment_method": payment.payment_method,
                "payment_status": payment.payment_status,
                "late_fee": str(payment.late_fee),
                "transaction_id": payment.transaction_id,
                "notes": payment.notes,
                "flat": {
                    "flat_unique_id": payment.flat.flat_unique_id,
                    "title": payment.flat.title,
                    "address": payment.flat.address
                },
                "tenant": {
                    "unique_id": payment.tenant.unique_id,
                    "username": payment.tenant.username
                },
                "owner": {
                    "unique_id": payment.owner.unique_id,
                    "username": payment.owner.username
                }
            }
            payments_data.append(payment_info)

        return {"status": "success", "payments": payments_data}, 200

    except Exception as e:
        return {"status": "fail", "message": f"Failed to get payment history: {str(e)}"}, 500

def get_expense_history(owner_unique_id=None, flat_unique_id=None, expense_type=None):
    """
    Get expense history with optional filters.
    
    Args:
        owner_unique_id (str, optional): Filter by owner
        flat_unique_id (str, optional): Filter by flat
        expense_type (str, optional): Filter by expense type
    
    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        query = ServiceExpense.query
        
        if owner_unique_id:
            query = query.filter_by(owner_unique_id=owner_unique_id)
        
        if flat_unique_id:
            query = query.filter_by(flat_unique_id=flat_unique_id)
        
        if expense_type:
            query = query.filter_by(expense_type=expense_type)
        
        expenses = query.order_by(ServiceExpense.expense_date.desc()).all()
        expenses_data = []
        
        for expense in expenses:
            expense_info = {
                "expense_unique_id": expense.expense_unique_id,
                "expense_type": expense.expense_type,
                "description": expense.description,
                "amount": str(expense.amount),
                "expense_date": expense.expense_date.isoformat(),
                "vendor_name": expense.vendor_name,
                "vendor_contact": expense.vendor_contact,
                "receipt_url": expense.receipt_url,
                "is_tax_deductible": expense.is_tax_deductible,
                "notes": expense.notes,
                "service_request_unique_id": expense.service_request_unique_id,
                "flat": {
                    "flat_unique_id": expense.flat.flat_unique_id,
                    "title": expense.flat.title,
                    "address": expense.flat.address
                },
                "owner": {
                    "unique_id": expense.owner.unique_id,
                    "username": expense.owner.username
                }
            }
            expenses_data.append(expense_info)

        return {"status": "success", "expenses": expenses_data}, 200

    except Exception as e:
        return {"status": "fail", "message": f"Failed to get expense history: {str(e)}"}, 500

def create_manual_expense(owner_unique_id, flat_unique_id, expense_type, description, amount,
                         vendor_name=None, vendor_contact=None, receipt_url=None, 
                         is_tax_deductible=False, notes=None):
    """
    Create a manual expense entry (not tied to a service request).
    
    Args:
        owner_unique_id (str): Owner's unique identifier
        flat_unique_id (str): Flat's unique identifier
        expense_type (str): Type of expense
        description (str): Expense description
        amount (float): Expense amount
        vendor_name (str, optional): Vendor name
        vendor_contact (str, optional): Vendor contact
        receipt_url (str, optional): URL to receipt image/document
        is_tax_deductible (bool): Whether expense is tax deductible
        notes (str, optional): Additional notes
    
    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        # Verify owner and flat
        owner = User.query.filter_by(unique_id=owner_unique_id).first()
        flat = Flat.query.filter_by(flat_unique_id=flat_unique_id).first()
        
        if not owner:
            return {"status": "fail", "message": "Owner not found"}, 404
        
        if not flat:
            return {"status": "fail", "message": "Flat not found"}, 404
        
        if owner.account_type != 'Owner':
            return {"status": "fail", "message": "Only owners can create expenses"}, 403
        
        if flat.owner_unique_id != owner_unique_id:
            return {"status": "fail", "message": "Owner does not own this flat"}, 403

        # Validate expense type
        valid_types = ['Maintenance', 'Repair', 'Upgrade', 'Emergency', 'Materials', 'Labor']
        if expense_type not in valid_types:
            return {"status": "fail", "message": f"Invalid expense type. Must be one of: {', '.join(valid_types)}"}, 400

        # Generate unique expense ID
        expense_unique_id = f"exp-{uuid.uuid4().hex[:10]}"
        while ServiceExpense.query.filter_by(expense_unique_id=expense_unique_id).first():
            expense_unique_id = f"exp-{uuid.uuid4().hex[:10]}"

        expense = ServiceExpense(
            expense_unique_id=expense_unique_id,
            service_request_unique_id=None,  # Manual expense, not tied to service request
            flat_unique_id=flat_unique_id,
            owner_unique_id=owner_unique_id,
            expense_type=expense_type,
            description=description.strip(),
            amount=Decimal(str(amount)),
            expense_date=datetime.utcnow(),
            vendor_name=vendor_name.strip() if vendor_name else None,
            vendor_contact=vendor_contact.strip() if vendor_contact else None,
            receipt_url=receipt_url,
            is_tax_deductible=is_tax_deductible,
            notes=notes.strip() if notes else None
        )
        
        db.session.add(expense)
        db.session.commit()

        return {
            "status": "success",
            "message": "Manual expense created successfully",
            "expense": {
                "expense_unique_id": expense_unique_id,
                "expense_type": expense_type,
                "description": description,
                "amount": str(amount),
                "flat_title": flat.title,
                "expense_date": expense.expense_date.isoformat()
            }
        }, 201

    except Exception as e:
        db.session.rollback()
        return {"status": "fail", "message": f"Failed to create expense: {str(e)}"}, 500
# In financials.py or a new module reminders.py

def send_rent_payment_reminders():
    """
    Send reminders to tenants for rent payments due soon or overdue.
    Should be scheduled to run daily.
    """
    try:
        today = datetime.utcnow().date()
        reminder_days_before_due = 3

        # Payments due in next 3 days
        upcoming_due = RentPayment.query.filter(
            RentPayment.payment_status != "Paid",
            RentPayment.due_date <= today + timedelta(days=reminder_days_before_due),
            RentPayment.due_date >= today
        ).all()

        # Overdue payments (due date before today)
        overdue = RentPayment.query.filter(
            RentPayment.payment_status != "Paid",
            RentPayment.due_date < today
        ).all()

        payments_to_notify = upcoming_due + overdue

        for payment in payments_to_notify:
            tenant = User.query.filter_by(unique_id=payment.tenant_unique_id).first()
            if tenant and tenant.email:
                if payment.due_date < today:
                    subject = "Overdue Rent Payment Reminder"
                    body = f"Dear {tenant.username},\n\nYour rent payment for the flat '{payment.flat.title}' was due on {payment.due_date} and is overdue. Please make your payment as soon as possible.\n\nThank you."
                else:
                    subject = "Upcoming Rent Payment Reminder"
                    body = f"Dear {tenant.username},\n\nThis is a reminder that your rent payment for the flat '{payment.flat.title}' is due on {payment.due_date}. Please ensure payment is made on time.\n\nThank you."

                send_email(tenant.email, subject, body)

        return {"status": "success", "message": f"Sent reminders for {len(payments_to_notify)} payments."}
    except Exception as e:
        return {"status": "fail", "message": f"Failed to send reminders: {str(e)}"}
