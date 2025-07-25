# Complete SQLAlchemy Models for Rental Management System

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import uuid

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    unique_id = db.Column(db.String(100), unique=True, nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    username = db.Column(db.String(100), nullable=False)
    account_type = db.Column(db.String(10), nullable=False)  # 'Owner' or 'Tenant'
    password_hash = db.Column(db.String(256), nullable=False)
    currently_rented = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    contact_no = db.Column(db.String(15), nullable=False)

    # Relationships using unique_id foreign keys
    flats_owned = db.relationship(
        'Flat',
        back_populates='owner',
        primaryjoin="User.unique_id == Flat.owner_unique_id",
        foreign_keys="Flat.owner_unique_id",
        cascade="all, delete-orphan",
        lazy='dynamic'
    )
    
    flats_rented = db.relationship(
        'Flat',
        back_populates='tenant',
        primaryjoin="User.unique_id == Flat.rented_to_unique_id",
        foreign_keys="Flat.rented_to_unique_id",
        lazy='dynamic'
    )
    
    service_requests_as_tenant = db.relationship(
        'ServiceRequest',
        back_populates='tenant',
        primaryjoin="User.unique_id == ServiceRequest.tenant_unique_id",
        foreign_keys="ServiceRequest.tenant_unique_id",
        lazy='dynamic'
    )
    
    service_requests_as_owner = db.relationship(
        'ServiceRequest',
        back_populates='owner',
        primaryjoin="User.unique_id == ServiceRequest.owner_unique_id",
        foreign_keys="ServiceRequest.owner_unique_id",
        lazy='dynamic'
    )
    
    rent_payments_as_tenant = db.relationship(
        'RentPayment',
        back_populates='tenant',
        primaryjoin="User.unique_id == RentPayment.tenant_unique_id",
        foreign_keys="RentPayment.tenant_unique_id",
        lazy='dynamic'
    )
    
    rent_payments_as_owner = db.relationship(
        'RentPayment',
        back_populates='owner',
        primaryjoin="User.unique_id == RentPayment.owner_unique_id",
        foreign_keys="RentPayment.owner_unique_id",
        lazy='dynamic'
    )

class Flat(db.Model):
    __tablename__ = 'flats'
    
    id = db.Column(db.Integer, primary_key=True)
    flat_unique_id = db.Column(db.String(100), unique=True, nullable=False, default=lambda: f"flat-{uuid.uuid4().hex[:8]}")
    owner_unique_id = db.Column(db.String(100), db.ForeignKey('users.unique_id', ondelete='CASCADE'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    address = db.Column(db.Text, nullable=False)
    rent = db.Column(db.Numeric(10, 2), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    rented_to_unique_id = db.Column(db.String(100), db.ForeignKey('users.unique_id', ondelete='SET NULL'))

    # Relationships
    owner = db.relationship(
        'User',
        back_populates='flats_owned',
        primaryjoin="Flat.owner_unique_id == User.unique_id",
        foreign_keys=[owner_unique_id]
    )
    
    tenant = db.relationship(
        'User',
        back_populates='flats_rented',
        primaryjoin="Flat.rented_to_unique_id == User.unique_id",
        foreign_keys=[rented_to_unique_id]
    )
    
    service_requests = db.relationship(
        'ServiceRequest',
        back_populates='flat',
        cascade="all, delete-orphan",
        lazy='dynamic'
    )
    
    rent_payments = db.relationship(
        'RentPayment',
        back_populates='flat',
        cascade="all, delete-orphan",
        lazy='dynamic'
    )
    
    service_expenses = db.relationship(
        'ServiceExpense',
        back_populates='flat',
        cascade="all, delete-orphan",
        lazy='dynamic'
    )

class ServiceRequest(db.Model):
    __tablename__ = 'service_requests'
    
    id = db.Column(db.Integer, primary_key=True)
    request_unique_id = db.Column(db.String(100), unique=True, nullable=False, default=lambda: f"req-{uuid.uuid4().hex[:8]}")
    flat_unique_id = db.Column(db.String(100), db.ForeignKey('flats.flat_unique_id', ondelete='CASCADE'), nullable=False)
    tenant_unique_id = db.Column(db.String(100), db.ForeignKey('users.unique_id', ondelete='CASCADE'), nullable=False)
    owner_unique_id = db.Column(db.String(100), db.ForeignKey('users.unique_id', ondelete='CASCADE'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(50), nullable=False)  # Plumbing, Electrical, HVAC, etc.
    priority = db.Column(db.String(20), nullable=False, default='Medium')  # Low, Medium, High, Emergency
    status = db.Column(db.String(20), nullable=False, default='Open')  # Open, In Progress, Completed, Cancelled
    requested_at = db.Column(db.DateTime, default=datetime.utcnow)
    assigned_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    estimated_cost = db.Column(db.Numeric(10, 2))
    actual_cost = db.Column(db.Numeric(10, 2))
    contractor_name = db.Column(db.String(100))
    contractor_contact = db.Column(db.String(15))
    tenant_notes = db.Column(db.Text)
    owner_notes = db.Column(db.Text)
    tenant_rating = db.Column(db.Integer)  # 1-5 rating

    # Relationships
    flat = db.relationship('Flat', back_populates='service_requests')
    tenant = db.relationship(
        'User',
        back_populates='service_requests_as_tenant',
        primaryjoin="ServiceRequest.tenant_unique_id == User.unique_id",
        foreign_keys=[tenant_unique_id]
    )
    owner = db.relationship(
        'User',
        back_populates='service_requests_as_owner',
        primaryjoin="ServiceRequest.owner_unique_id == User.unique_id",
        foreign_keys=[owner_unique_id]
    )
    
    expenses = db.relationship(
        'ServiceExpense',
        back_populates='service_request',
        cascade="all, delete-orphan",
        lazy='dynamic'
    )

class ServiceExpense(db.Model):
    __tablename__ = 'service_expenses'
    
    id = db.Column(db.Integer, primary_key=True)
    expense_unique_id = db.Column(db.String(100), unique=True, nullable=False, default=lambda: f"exp-{uuid.uuid4().hex[:8]}")
    service_request_unique_id = db.Column(db.String(100), db.ForeignKey('service_requests.request_unique_id', ondelete='CASCADE'), nullable=False)
    flat_unique_id = db.Column(db.String(100), db.ForeignKey('flats.flat_unique_id', ondelete='CASCADE'), nullable=False)
    owner_unique_id = db.Column(db.String(100), db.ForeignKey('users.unique_id', ondelete='CASCADE'), nullable=False)
    expense_type = db.Column(db.String(50), nullable=False)  # Maintenance, Repair, Upgrade, etc.
    description = db.Column(db.Text, nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    expense_date = db.Column(db.DateTime, default=datetime.utcnow)
    vendor_name = db.Column(db.String(100))
    vendor_contact = db.Column(db.String(15))
    receipt_url = db.Column(db.Text)
    is_tax_deductible = db.Column(db.Boolean, default=False)
    notes = db.Column(db.Text)

    # Relationships
    service_request = db.relationship('ServiceRequest', back_populates='expenses')
    flat = db.relationship('Flat', back_populates='service_expenses')
    owner = db.relationship(
        'User',
        primaryjoin="ServiceExpense.owner_unique_id == User.unique_id",
        foreign_keys=[owner_unique_id]
    )

class RentPayment(db.Model):
    __tablename__ = 'rent_payments'
    
    id = db.Column(db.Integer, primary_key=True)
    payment_unique_id = db.Column(db.String(100), unique=True, nullable=False, default=lambda: f"pay-{uuid.uuid4().hex[:8]}")
    flat_unique_id = db.Column(db.String(100), db.ForeignKey('flats.flat_unique_id', ondelete='CASCADE'), nullable=False)
    tenant_unique_id = db.Column(db.String(100), db.ForeignKey('users.unique_id', ondelete='CASCADE'), nullable=False)
    owner_unique_id = db.Column(db.String(100), db.ForeignKey('users.unique_id', ondelete='CASCADE'), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    payment_date = db.Column(db.DateTime, default=datetime.utcnow)
    due_date = db.Column(db.Date, nullable=False)
    payment_method = db.Column(db.String(50))  # Cash, Check, Bank Transfer, etc.
    payment_status = db.Column(db.String(20), default='Paid')  # Pending, Paid, Late, Failed, Refunded
    late_fee = db.Column(db.Numeric(10, 2), default=0)
    transaction_id = db.Column(db.String(100))
    notes = db.Column(db.Text)

    # Relationships
    flat = db.relationship('Flat', back_populates='rent_payments')
    tenant = db.relationship(
        'User',
        back_populates='rent_payments_as_tenant',
        primaryjoin="RentPayment.tenant_unique_id == User.unique_id",
        foreign_keys=[tenant_unique_id]
    )
    owner = db.relationship(
        'User',
        back_populates='rent_payments_as_owner',
        primaryjoin="RentPayment.owner_unique_id == User.unique_id",
        foreign_keys=[owner_unique_id]
    )