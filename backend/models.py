# models.py ─ Complete SQLAlchemy models for Rental Management System
# ---------------------------------------------------------------
# Works with PostgreSQL, SQLite, or MySQL.
# Requires Flask-SQLAlchemy >= 3.0.

import uuid
from datetime import datetime, timedelta
from sqlalchemy import LargeBinary
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.types import CHAR, TypeDecorator
from decimal import Decimal

db = SQLAlchemy()


# ────────────────────────────────────────────────────────────────
# Helpers
# ────────────────────────────────────────────────────────────────
class GUID(TypeDecorator):
    """
    Platform-independent UUID type.

    • On PostgreSQL it stores UUIDs in the native UUID column.
    • On other back-ends it stores a 32-character hex string.
    """

    impl = CHAR(32)
    cache_ok = True  # SQLAlchemy 2.x requirement

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID())
        return dialect.type_descriptor(CHAR(32))

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if not isinstance(value, uuid.UUID):
            value = uuid.UUID(str(value))
        return str(value) if dialect.name == "postgresql" else f"{value.int:032x}"

    def process_result_value(self, value, dialect):
        # psycopg2 already returns UUID objects → leave untouched
        if value is None or isinstance(value, uuid.UUID):
            return value
        return uuid.UUID(str(value))


# ────────────────────────────────────────────────────────────────
# Core User / Flat / Financial Models
# ────────────────────────────────────────────────────────────────
class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    unique_id = db.Column(db.String(100), unique=True, nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    username = db.Column(db.String(100), nullable=False)
    account_type = db.Column(db.String(10), nullable=False)           # 'Owner' / 'Tenant'
    password_hash = db.Column(db.String(256), nullable=False)
    currently_rented = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    contact_no = db.Column(db.String(15), nullable=False)
    is_verified = db.Column(db.Boolean, default=False)

    # ─── Relationships (declared with unique_id FK strings) ───
    flats_owned = db.relationship(
        "Flat",
        back_populates="owner",
        primaryjoin="User.unique_id == Flat.owner_unique_id",
        foreign_keys="Flat.owner_unique_id",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )

    flats_rented = db.relationship(
        "Flat",
        back_populates="tenant",
        primaryjoin="User.unique_id == Flat.rented_to_unique_id",
        foreign_keys="Flat.rented_to_unique_id",
        lazy="dynamic",
    )

    service_requests_as_tenant = db.relationship(
        "ServiceRequest",
        back_populates="tenant",
        primaryjoin="User.unique_id == ServiceRequest.tenant_unique_id",
        foreign_keys="ServiceRequest.tenant_unique_id",
        lazy="dynamic",
    )

    service_requests_as_owner = db.relationship(
        "ServiceRequest",
        back_populates="owner",
        primaryjoin="User.unique_id == ServiceRequest.owner_unique_id",
        foreign_keys="ServiceRequest.owner_unique_id",
        lazy="dynamic",
    )

    rent_payments_as_tenant = db.relationship(
        "RentPayment",
        back_populates="tenant",
        primaryjoin="User.unique_id == RentPayment.tenant_unique_id",
        foreign_keys="RentPayment.tenant_unique_id",
        lazy="dynamic",
    )

    rent_payments_as_owner = db.relationship(
        "RentPayment",
        back_populates="owner",
        primaryjoin="User.unique_id == RentPayment.owner_unique_id",
        foreign_keys="RentPayment.owner_unique_id",
        lazy="dynamic",
    )
    rent_agreements = db.relationship(
        "RentAgreement",
        back_populates="tenant",
        primaryjoin="User.unique_id == RentAgreement.tenant_unique_id",
        foreign_keys="RentAgreement.tenant_unique_id",
        lazy="dynamic"
    )

class Flat(db.Model):
    __tablename__ = "flats"

    id = db.Column(db.Integer, primary_key=True)

    flat_unique_id = db.Column(
        db.String(100),
        unique=True,
        nullable=False,
        default=lambda: f"flat-{uuid.uuid4().hex[:8]}",
    )

    owner_unique_id = db.Column(
        db.String(100),
        db.ForeignKey("users.unique_id", ondelete="CASCADE"),
        nullable=False,
    )

    title = db.Column(db.String(200), nullable=False)
    address = db.Column(db.Text, nullable=False)

    rent = db.Column(db.Numeric(10, 2), nullable=False)

    # 🔹 ML-READY PROPERTY FEATURES (ADDED)
    bedrooms = db.Column(db.Integer)
    bathrooms = db.Column(db.Integer)
    area_sqft = db.Column(db.Integer)
    furnishing = db.Column(db.String(20))
    property_type = db.Column(db.String(20))

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    rented_to_unique_id = db.Column(
        db.String(100),
        db.ForeignKey("users.unique_id", ondelete="SET NULL"),
    )

    rented_date = db.Column(db.DateTime)
    deposit_amount = db.Column(db.Numeric(10, 2), default=0)

    # ---------------- RELATIONSHIPS ----------------

    owner = db.relationship(
        "User",
        back_populates="flats_owned",
        primaryjoin="Flat.owner_unique_id == User.unique_id",
        foreign_keys=[owner_unique_id],
    )

    tenant = db.relationship(
        "User",
        back_populates="flats_rented",
        primaryjoin="Flat.rented_to_unique_id == User.unique_id",
        foreign_keys=[rented_to_unique_id],
    )

    service_requests = db.relationship(
        "ServiceRequest",
        back_populates="flat",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )

    rent_payments = db.relationship(
        "RentPayment",
        back_populates="flat",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )

    service_expenses = db.relationship(
        "ServiceExpense",
        back_populates="flat",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )

    rent_agreements = db.relationship(
        "RentAgreement",
        back_populates="flat",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )

# ────────────────────────────────────────────────────────────────
# Maintenance / Service Workflow
# ────────────────────────────────────────────────────────────────
class ServiceRequest(db.Model):
    __tablename__ = "service_requests"

    id = db.Column(db.Integer, primary_key=True)

    request_unique_id = db.Column(
        db.String(100),
        unique=True,
        nullable=False,
        default=lambda: f"req-{uuid.uuid4().hex[:8]}",
    )

    flat_unique_id = db.Column(
        db.String(100),
        db.ForeignKey("flats.flat_unique_id", ondelete="CASCADE"),
        nullable=False,
    )

    tenant_unique_id = db.Column(
        db.String(100),
        db.ForeignKey("users.unique_id", ondelete="CASCADE"),
        nullable=False,
    )

    owner_unique_id = db.Column(
        db.String(100),
        db.ForeignKey("users.unique_id", ondelete="CASCADE"),
        nullable=False,
    )

    # Core fields
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    priority = db.Column(db.String(20), nullable=False, default="Medium")
    status = db.Column(db.String(20), nullable=False, default="Open")

    requested_at = db.Column(db.DateTime, default=datetime.utcnow)
    assigned_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)

    estimated_cost = db.Column(db.Numeric(10, 2))
    actual_cost = db.Column(db.Numeric(10, 2))

    contractor_name = db.Column(db.String(100))
    contractor_contact = db.Column(db.String(15))

    tenant_notes = db.Column(db.Text)
    owner_notes = db.Column(db.Text)
    tenant_rating = db.Column(db.Integer)

    # 🔥 REQUIRED FLAG (prevents duplicate expenses)
    expense_created = db.Column(db.Boolean, default=False)

    # ---------------- RELATIONSHIPS ----------------

    flat = db.relationship("Flat", back_populates="service_requests")

    tenant = db.relationship(
        "User",
        back_populates="service_requests_as_tenant",
        primaryjoin="ServiceRequest.tenant_unique_id == User.unique_id",
        foreign_keys=[tenant_unique_id],
    )

    owner = db.relationship(
        "User",
        back_populates="service_requests_as_owner",
        primaryjoin="ServiceRequest.owner_unique_id == User.unique_id",
        foreign_keys=[owner_unique_id],
    )

    expenses = db.relationship(
        "ServiceExpense",
        back_populates="service_request",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )


class ServiceExpense(db.Model):
    __tablename__ = "service_expenses"

    id = db.Column(db.Integer, primary_key=True)

    expense_unique_id = db.Column(
        db.String(100),
        unique=True,
        nullable=False,
        default=lambda: f"exp-{uuid.uuid4().hex[:8]}"
    )

    service_request_unique_id = db.Column(
        db.String(100),
        db.ForeignKey("service_requests.request_unique_id", ondelete="CASCADE"),
        nullable=False
    )

    flat_unique_id = db.Column(
        db.String(100),
        db.ForeignKey("flats.flat_unique_id", ondelete="CASCADE"),
        nullable=False
    )

    owner_unique_id = db.Column(
        db.String(100),
        db.ForeignKey("users.unique_id", ondelete="CASCADE"),
        nullable=False
    )

    expense_type = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text, nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)

    expense_date = db.Column(db.DateTime, default=datetime.utcnow)

    vendor_name = db.Column(db.String(100))
    vendor_contact = db.Column(db.String(15))

    receipt_url = db.Column(db.Text)
    is_tax_deductible = db.Column(db.Boolean, default=False)
    notes = db.Column(db.Text)

    # ---------------- RELATIONSHIPS ----------------

    service_request = db.relationship(
        "ServiceRequest",
        back_populates="expenses"
    )

    flat = db.relationship(
        "Flat",
        back_populates="service_expenses"
    )

    owner = db.relationship(
        "User",
        foreign_keys=[owner_unique_id]
    )


# ────────────────────────────────────────────────────────────────
# Financial Tracking
# ────────────────────────────────────────────────────────────────
class RentPayment(db.Model):
    __tablename__ = "rent_payments"

    id = db.Column(db.Integer, primary_key=True)
    payment_unique_id = db.Column(
        db.String(100),
        unique=True,
        nullable=False,
        default=lambda: f"pay-{uuid.uuid4().hex[:8]}",
    )
    flat_unique_id = db.Column(
        db.String(100),
        db.ForeignKey("flats.flat_unique_id", ondelete="CASCADE"),
        nullable=False,
    )
    tenant_unique_id = db.Column(
        db.String(100),
        db.ForeignKey("users.unique_id", ondelete="CASCADE"),
        nullable=False,
    )
    owner_unique_id = db.Column(
        db.String(100),
        db.ForeignKey("users.unique_id", ondelete="CASCADE"),
        nullable=False,
    )

    amount = db.Column(db.Numeric(10, 2), nullable=False)
    payment_date = db.Column(db.DateTime, default=datetime.utcnow)
    due_date = db.Column(db.Date, nullable=False)
    payment_method = db.Column(db.String(50))  # Cash, Check, Transfer, etc.
    payment_status = db.Column(db.String(20), default="Paid")  # Pending, Paid, Late, etc.
    late_fee = db.Column(db.Numeric(10, 2), default=Decimal("0.00"))
    transaction_id = db.Column(db.String(100))
    notes = db.Column(db.Text)

    # Relationships
    flat = db.relationship("Flat", back_populates="rent_payments")
    tenant = db.relationship(
        "User",
        back_populates="rent_payments_as_tenant",
        primaryjoin="RentPayment.tenant_unique_id == User.unique_id",
        foreign_keys=[tenant_unique_id],
    )
    owner = db.relationship(
        "User",
        back_populates="rent_payments_as_owner",
        primaryjoin="RentPayment.owner_unique_id == User.unique_id",
        foreign_keys=[owner_unique_id],
    )


# ────────────────────────────────────────────────────────────────
# One-Time Password (OTP) Verification
# ────────────────────────────────────────────────────────────────
class OTPVerification(db.Model):
    __tablename__ = "otp_verifications"

    unique_id = db.Column(GUID, primary_key=True, default=uuid.uuid4)

    email = db.Column(db.String(120), index=True, nullable=False)

    # ✅ NEW (OPTIONAL, BACKWARD-COMPATIBLE)
    user_unique_id = db.Column(
        db.String(50),   # <-- STRING, not GUID
        db.ForeignKey("users.unique_id"),
        nullable=True,
        index=True
    )

    otp_code = db.Column(db.String(6), nullable=False)
    purpose = db.Column(db.String(40), nullable=False, default="email_signup")
    is_used = db.Column(db.Boolean, default=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.utcnow() + timedelta(minutes=10)
    )

    def mark_used(self):
        """Mark this OTP as used and persist immediately."""
        self.is_used = True
        db.session.commit()



class RentAgreement(db.Model):
    """
    Stores one signed rent agreement document plus key dates.
    """
    __tablename__ = "rent_agreements"

    unique_id         = db.Column(GUID, primary_key=True, default=uuid.uuid4)
    flat_unique_id    = db.Column(
        db.String(100),
        db.ForeignKey("flats.flat_unique_id", ondelete="CASCADE"),
        nullable=False,
    )
    tenant_unique_id  = db.Column(
        db.String(100),
        db.ForeignKey("users.unique_id", ondelete="CASCADE"),
        nullable=False,
    )
    # dates
    agreement_date    = db.Column(db.Date, nullable=False)
    start_date        = db.Column(db.Date, nullable=False)
    end_date          = db.Column(db.Date, nullable=False)
    # document info
    file_name         = db.Column(db.String(255), nullable=False)
    mime_type         = db.Column(db.String(80), nullable=False)
    file_size         = db.Column(db.Integer, nullable=False)
    file_data         = db.Column(LargeBinary, nullable=False)

    created_at        = db.Column(db.DateTime, default=datetime.utcnow)

    flat   = db.relationship("Flat",   back_populates="rent_agreements")
    tenant = db.relationship("User",   back_populates="rent_agreements")

