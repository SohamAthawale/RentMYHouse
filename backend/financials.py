# financials.py
from datetime import datetime, date
from dateutil.relativedelta import relativedelta
import uuid
from decimal import Decimal, InvalidOperation, getcontext
from sqlalchemy import func, extract
from sqlalchemy.orm import joinedload
from models import db, User, Flat, RentPayment, ServiceExpense

# ensure enough precision
getcontext().prec = 28

def _to_decimal(v):
    try:
        return Decimal(str(v))
    except Exception:
        return Decimal('0')

def _safe_divide(numer, denom):
    try:
        numer = _to_decimal(numer)
        denom = _to_decimal(denom)
        if denom == 0:
            return Decimal('0')
        return numer / denom
    except Exception:
        return Decimal('0')

def record_rent_payment(flat_unique_id, tenant_unique_id, amount, payment_method='Other', 
                       due_date=None, late_fee=0, transaction_id=None, notes=None):
    try:
        # ------------------ FLAT ------------------
        flat = Flat.query.filter_by(flat_unique_id=flat_unique_id).first()
        if not flat:
            return {"status": "fail", "message": "Flat not found"}, 404

        # ------------------ TENANT (AUTO-RESOLVE) ------------------
        tenant_unique_id = flat.rented_to_unique_id
        if not tenant_unique_id:
            return {"status": "fail", "message": "Flat is not rented to any tenant"}, 400

        tenant = User.query.filter_by(unique_id=tenant_unique_id).first()
        if not tenant:
            return {"status": "fail", "message": "Tenant not found"}, 404

        # ------------------ PAYMENT ID ------------------
        payment_unique_id = f"pay-{uuid.uuid4().hex[:10]}"
        while RentPayment.query.filter_by(payment_unique_id=payment_unique_id).first():
            payment_unique_id = f"pay-{uuid.uuid4().hex[:10]}"

        # ------------------ DUE DATE ------------------
        if not due_date:
            due_date = date.today().replace(day=1)

        # ------------------ CREATE PAYMENT ------------------
        payment = RentPayment(
            payment_unique_id=payment_unique_id,
            flat_unique_id=flat_unique_id,
            tenant_unique_id=tenant_unique_id,
            owner_unique_id=flat.owner_unique_id,
            amount=_to_decimal(amount),
            payment_date=datetime.utcnow(),
            due_date=due_date,
            payment_method=payment_method,
            payment_status='Paid',
            late_fee=_to_decimal(late_fee),
            transaction_id=transaction_id,
            notes=notes
        )

        db.session.add(payment)
        db.session.commit()

        return {
            "status": "success",
            "message": "Rent payment recorded successfully",
            "payment": {
                "payment_unique_id": payment_unique_id,
                "amount": str(payment.amount),
                "payment_date": payment.payment_date.isoformat(),
                "due_date": due_date.isoformat(),
                "flat_title": flat.title,
                "tenant_name": tenant.username
            }
        }, 201

    except Exception as e:
        db.session.rollback()
        return {"status": "fail", "message": f"Failed to record payment: {str(e)}"}, 500

def get_owner_financial_summary(owner_unique_id, year=None, month=None):
    try:
        owner = User.query.filter_by(unique_id=owner_unique_id).first()
        if not owner:
            return {"status": "fail", "message": "Owner not found"}, 404
        
        if owner.account_type != 'Owner':
            return {"status": "fail", "message": "User is not an owner"}, 403

        # default year
        if not year:
            year = datetime.utcnow().year

        # base queries filtered by owner
        payment_base = RentPayment.query.filter_by(owner_unique_id=owner_unique_id)
        expense_base = ServiceExpense.query.filter_by(owner_unique_id=owner_unique_id)

        if year:
            payment_base = payment_base.filter(extract('year', RentPayment.payment_date) == year)
            expense_base = expense_base.filter(extract('year', ServiceExpense.expense_date) == year)
        if month:
            payment_base = payment_base.filter(extract('month', RentPayment.payment_date) == month)
            expense_base = expense_base.filter(extract('month', ServiceExpense.expense_date) == month)

        # totals (Decimal)
        total_income = payment_base.with_entities(func.coalesce(func.sum(RentPayment.amount), 0)).scalar() or Decimal('0')
        total_expenses = expense_base.with_entities(func.coalesce(func.sum(ServiceExpense.amount), 0)).scalar() or Decimal('0')
        total_income = _to_decimal(total_income)
        total_expenses = _to_decimal(total_expenses)
        profit = total_income - total_expenses

        # monthly breakdown for the YEAR (1..12)
        monthly_data = []
        for m in range(1, 13):
            month_income = (
                RentPayment.query
                .filter_by(owner_unique_id=owner_unique_id)
                .filter(extract('year', RentPayment.payment_date) == year)
                .filter(extract('month', RentPayment.payment_date) == m)
                .with_entities(func.coalesce(func.sum(RentPayment.amount), 0)).scalar()
            ) or Decimal('0')

            month_expenses = (
                ServiceExpense.query
                .filter_by(owner_unique_id=owner_unique_id)
                .filter(extract('year', ServiceExpense.expense_date) == year)
                .filter(extract('month', ServiceExpense.expense_date) == m)
                .with_entities(func.coalesce(func.sum(ServiceExpense.amount), 0)).scalar()
            ) or Decimal('0')

            month_income = _to_decimal(month_income)
            month_expenses = _to_decimal(month_expenses)
            monthly_data.append({
                "month": m,
                "month_name": date(year, m, 1).strftime("%B"),
                "income": str(month_income),
                "expenses": str(month_expenses),
                "profit": str(month_income - month_expenses)
            })

        # property-wise breakdown
        # fetch flats owned by owner (avoid dynamic relationship pitfalls)
        flats = Flat.query.filter_by(owner_unique_id=owner_unique_id).options(joinedload(Flat.rent_payments)).all()
        properties_data = []
        sum_rents = Decimal('0')

        for flat in flats:
            flat_income = (
                payment_base.filter_by(flat_unique_id=flat.flat_unique_id)
                .with_entities(func.coalesce(func.sum(RentPayment.amount), 0)).scalar()
            ) or Decimal('0')

            flat_expenses = (
                expense_base.filter_by(flat_unique_id=flat.flat_unique_id)
                .with_entities(func.coalesce(func.sum(ServiceExpense.amount), 0)).scalar()
            ) or Decimal('0')

            flat_income = _to_decimal(flat_income)
            flat_expenses = _to_decimal(flat_expenses)

            properties_data.append({
                "flat_unique_id": flat.flat_unique_id,
                "title": flat.title,
                "address": flat.address,
                "monthly_rent": str(_to_decimal(flat.rent)),
                "is_rented": bool(flat.rented_to_unique_id),
                "income": str(flat_income),
                "expenses": str(flat_expenses),
                "profit": str(flat_income - flat_expenses)
            })

            # accumulate for average rent
            try:
                sum_rents += _to_decimal(flat.rent)
            except Exception:
                pass

        total_props = len(flats)
        average_rent = (sum_rents / Decimal(total_props)) if total_props else Decimal('0')

        # expense categories breakdown
        expense_categories_q = db.session.query(
            ServiceExpense.expense_type,
            func.coalesce(func.sum(ServiceExpense.amount), 0).label('total')
        ).filter_by(owner_unique_id=owner_unique_id)

        if year:
            expense_categories_q = expense_categories_q.filter(extract('year', ServiceExpense.expense_date) == year)
        if month:
            expense_categories_q = expense_categories_q.filter(extract('month', ServiceExpense.expense_date) == month)

        expense_categories = expense_categories_q.group_by(ServiceExpense.expense_type).all()

        categories_data = []
        for category, total in expense_categories:
            categories_data.append({
                "category": category,
                "total": str(_to_decimal(total))
            })

        # profit margin (percentage string)
        profit_margin = Decimal('0')
        if total_income > 0:
            profit_margin = (_safe_divide(profit, total_income) * Decimal('100')).quantize(Decimal('0.01'))

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
                "profit_margin": str(profit_margin)
            },
            "monthly_breakdown": monthly_data,
            "properties_breakdown": properties_data,
            "expense_categories": categories_data,
            "statistics": {
                "total_properties": total_props,
                "rented_properties": sum(1 for f in flats if f.rented_to_unique_id),
                "vacant_properties": sum(1 for f in flats if not f.rented_to_unique_id),
                "average_rent": str(average_rent)
            }
        }

        return {"status": "success", "financial_summary": financial_summary}, 200

    except Exception as e:
        # helpful error for debugging (replace with logging in prod)
        return {"status": "fail", "message": f"Failed to get financial summary: {str(e)}"}, 500


def get_rent_payment_history(flat_unique_id=None, tenant_unique_id=None, owner_unique_id=None):
    try:
        query = RentPayment.query.options(joinedload(RentPayment.flat), joinedload(RentPayment.tenant), joinedload(RentPayment.owner))

        if flat_unique_id:
            query = query.filter_by(flat_unique_id=flat_unique_id)
        
        if tenant_unique_id:
            query = query.filter_by(tenant_unique_id=tenant_unique_id)
        
        if owner_unique_id:
            query = query.filter_by(owner_unique_id=owner_unique_id)
        
        payments = query.order_by(RentPayment.payment_date.desc()).all()
        payments_data = []
        
        for payment in payments:
            payments_data.append({
                "payment_unique_id": payment.payment_unique_id,
                "amount": str(_to_decimal(payment.amount)),
                "payment_date": payment.payment_date.isoformat() if payment.payment_date else None,
                "due_date": payment.due_date.isoformat() if payment.due_date else None,
                "payment_method": payment.payment_method,
                "payment_status": payment.payment_status,
                "late_fee": str(_to_decimal(payment.late_fee)),
                "transaction_id": payment.transaction_id,
                "notes": payment.notes,
                "flat": {
                    "flat_unique_id": payment.flat.flat_unique_id,
                    "title": payment.flat.title,
                    "address": payment.flat.address
                } if getattr(payment, 'flat', None) else None,
                "tenant": {
                    "unique_id": payment.tenant.unique_id,
                    "username": payment.tenant.username
                } if getattr(payment, 'tenant', None) else None,
                "owner": {
                    "unique_id": payment.owner.unique_id,
                    "username": payment.owner.username
                } if getattr(payment, 'owner', None) else None
            })
        return {"status": "success", "payments": payments_data}, 200

    except Exception as e:
        return {"status": "fail", "message": f"Failed to get payment history: {str(e)}"}, 500


def get_expense_history(owner_unique_id=None, flat_unique_id=None, expense_type=None):
    try:
        query = ServiceExpense.query.options(joinedload(ServiceExpense.flat), joinedload(ServiceExpense.owner))

        if owner_unique_id:
            query = query.filter_by(owner_unique_id=owner_unique_id)
        
        if flat_unique_id:
            query = query.filter_by(flat_unique_id=flat_unique_id)
        
        if expense_type:
            query = query.filter_by(expense_type=expense_type)
        
        expenses = query.order_by(ServiceExpense.expense_date.desc()).all()
        expenses_data = []
        
        for expense in expenses:
            expenses_data.append({
                "expense_unique_id": expense.expense_unique_id,
                "expense_type": expense.expense_type,
                "description": expense.description,
                "amount": str(_to_decimal(expense.amount)),
                "expense_date": expense.expense_date.isoformat() if expense.expense_date else None,
                "vendor_name": expense.vendor_name,
                "vendor_contact": expense.vendor_contact,
                "receipt_url": expense.receipt_url,
                "is_tax_deductible": bool(expense.is_tax_deductible),
                "notes": expense.notes,
                "service_request_unique_id": expense.service_request_unique_id,
                "flat": {
                    "flat_unique_id": expense.flat.flat_unique_id,
                    "title": expense.flat.title,
                    "address": expense.flat.address
                } if getattr(expense, 'flat', None) else None,
                "owner": {
                    "unique_id": expense.owner.unique_id,
                    "username": expense.owner.username
                } if getattr(expense, 'owner', None) else None
            })
        return {"status": "success", "expenses": expenses_data}, 200

    except Exception as e:
        return {"status": "fail", "message": f"Failed to get expense history: {str(e)}"}, 500

def create_manual_expense(
    owner_unique_id,
    flat_unique_id,
    expense_type,
    description,
    amount,
    vendor_name=None,
    vendor_contact=None,
    receipt_url=None,
    is_tax_deductible=False,
    notes=None
):
    try:
        # ---------------- OWNER ----------------
        owner = User.query.filter_by(unique_id=owner_unique_id).first()
        if not owner:
            return {"status": "fail", "message": "Owner not found"}, 404

        if owner.account_type != "Owner":
            return {"status": "fail", "message": "Only owners can add expenses"}, 403

        # ---------------- FLAT ----------------
        flat = Flat.query.filter_by(flat_unique_id=flat_unique_id).first()
        if not flat:
            return {"status": "fail", "message": "Flat not found"}, 404

        if flat.owner_unique_id != owner_unique_id:
            return {"status": "fail", "message": "Owner does not own this flat"}, 403

        # ---------------- VALIDATION ----------------
        valid_types = [
            "Maintenance", "Repair", "Upgrade",
            "Emergency", "Materials", "Labor"
        ]
        if expense_type not in valid_types:
            return {"status": "fail", "message": "Invalid expense type"}, 400

        if amount is None:
            return {"status": "fail", "message": "Amount is required"}, 400

        amount = _to_decimal(amount)
        if amount <= 0:
            return {"status": "fail", "message": "Amount must be greater than zero"}, 400

        # ---------------- ID ----------------
        expense_unique_id = f"exp-{uuid.uuid4().hex[:10]}"
        while ServiceExpense.query.filter_by(expense_unique_id=expense_unique_id).first():
            expense_unique_id = f"exp-{uuid.uuid4().hex[:10]}"

        # ---------------- NORMALIZE STRINGS ----------------
        description = (description or "").strip()
        vendor_name = (vendor_name or "").strip()
        vendor_contact = (vendor_contact or "").strip()
        notes = (notes or "").strip()

        # ---------------- CREATE ----------------
        expense = ServiceExpense(
            expense_unique_id=expense_unique_id,
            service_request_unique_id=None,
            flat_unique_id=flat_unique_id,
            owner_unique_id=owner_unique_id,
            expense_type=expense_type,
            description=description,
            amount=amount,
            expense_date=datetime.utcnow(),
            vendor_name=vendor_name,
            vendor_contact=vendor_contact,
            receipt_url=receipt_url,
            is_tax_deductible=bool(is_tax_deductible),
            notes=notes
        )

        db.session.add(expense)
        db.session.commit()

        return {
            "status": "success",
            "message": "Manual expense created successfully",
            "expense": {
                "expense_unique_id": expense_unique_id,
                "expense_type": expense_type,
                "amount": str(amount),
                "flat_title": flat.title,
                "expense_date": expense.expense_date.isoformat()
            }
        }, 201

    except Exception as e:
        db.session.rollback()
        print("❌ create_manual_expense error:", repr(e))
        return {"status": "fail", "message": "Internal server error"}, 500
