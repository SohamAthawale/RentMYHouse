# Rental Management System – Frontend

A production-grade React + Vite + TailwindCSS frontend for a full-stack Rental Management System with role-based dashboards, OTP-secured workflows, financial tracking, document verification, and an ML-powered rent prediction engine.

---

## 🚀 Key Highlights

- Role-based dashboards (Owner / Tenant / Admin)
- Secure session-based authentication with OTP verification
- End-to-end rental lifecycle management
- Owner-verified rent payments (Pending → Approved)
- Machine Learning rent prediction engine
- Analytics-backed pricing insights
- ID document upload with tenant consent & owner-controlled access
- Rent agreement upload & download
- Responsive and mobile-first UI

---

## Features

### Owner Features
- Dashboard with property, tenant & financial statistics
- Create, update, vacate, and delete flats
- Assign tenants using OTP-verified rent approval
- Set and update rented dates
- View all tenants and available tenants
- Manage tenant service requests
- Record rent payments as owner
- Verify tenant-submitted rent payments
- View financial summaries (monthly / yearly)
- Track rent & expense history
- Upload and download rent agreements
- Access tenant ID documents (only after consent + verification)

### Tenant Features
- Personal dashboard with rental overview
- View rented flat details
- Submit service requests with category & priority
- Track service request status
- Rate completed service requests
- Submit rent payments (marked Pending until owner approval)
- View rent payment history
- Upload ID documents
- Control ID sharing consent
- View rent agreements

### Admin Features
- System-wide statistics dashboard
- User management with filters
- View detailed user information
- Export system data
- Cleanup orphaned records
- APIs implemented and ready to wire into UI

---

## 🧠 Analytics & Machine Learning

### 📊 Rent Prediction Engine (ML)
The system includes an ML-powered rent prediction feature integrated into the application workflow to help owners price properties competitively and give tenants realistic expectations.

#### Model Details
- Trained on Mumbai rental market data
- Model type: Log-transformed regression
- Served via Flask API
- Model loaded using `joblib`
- Confidence interval estimated using model MAE

#### Input Features
- Bedrooms
- Bathrooms
- Area (sqft)
- Furnishing type
- Property type
- Locality (auto-extracted from address)

#### Locality Intelligence
- Automatically extracts locality from address
- Supports major Mumbai localities (Andheri, Bandra, Powai, etc.)
- Falls back to `"Other"` when locality is unknown

#### API Endpoint
POST /predict-rent

#### Sample Request
```json
{
  "address": "Andheri West, Mumbai",
  "bedrooms": 2,
  "bathrooms": 2,
  "area_sqft": 750,
  "furnishing": "Fully Furnished",
  "property_type": "Apartment"
}
```

#### Sample Response
```json
{
  "status": "success",
  "predicted_rent": 45134,
  "confidence_range": "₹33799 – ₹56469",
  "locality_used": "Andheri"
}
```

Business value:
- Helps owners price properties competitively
- Gives tenants realistic rent expectations
- Enables analytics-driven decision making and lays the foundation for pricing dashboards

---

## 🔐 Authentication & Security

- Email + password login
- OTP verification for:
  - User signup
  - Rent approval flows
- Session-based authentication (Flask sessions)
- Role-based route protection (Owner/Tenant/Admin)
- Tenant-controlled ID document consent (owner access only after consent + verification)
- No sensitive credentials stored on frontend (only user metadata in localStorage)
- Secure API communication over the backend

---

## 🧱 Tech Stack

Frontend
- React 18
- Vite
- TypeScript / JavaScript
- TailwindCSS
- Axios
- React Router v6
- Context API
- React Hot Toast
- Lucide React
- Framer Motion

Backend (Integrated)
- Flask
- PostgreSQL
- SQLAlchemy
- Session-based authentication
- OTP workflows
- Machine Learning (scikit-learn, joblib)

---

## 📁 Project Structure

src/
├── api/  
│   ├── api.js              # Axios configuration  
│   └── endpoints.js        # API endpoint functions  
├── auth/  
│   ├── Login.jsx           # Login page  
│   └── Signup.jsx          # Signup page  
├── components/  
│   ├── Navbar.jsx          # Top navigation bar  
│   ├── Sidebar.jsx         # Side navigation  
│   ├── Loader.jsx          # Loading spinner  
│   └── ProtectedRoute.jsx  # Route protection  
├── context/  
│   └── AuthContext.jsx     # Authentication context  
├── layouts/  
│   ├── OwnerLayout.jsx     # Owner dashboard layout  
│   ├── TenantLayout.jsx    # Tenant dashboard layout  
│   └── AdminLayout.jsx     # Admin dashboard layout  
├── pages/  
│   ├── owner/              # Owner pages  
│   ├── tenant/             # Tenant pages  
│   ├── admin/              # Admin pages  
│   └── profile/            # Profile pages  
├── router.jsx              # Route configuration  
├── App.jsx                 # Main app component  
└── main.tsx                # Entry point

---

## 🔌 API Integration

Frontend connects to Flask backend at:
http://localhost:5001

Core API Modules:
- Authentication & OTP
- Flats & tenancy lifecycle (create, rent, vacate, delete)
- Tenants (list all, available tenants)
- Service requests & ratings
- Financial tracking & approvals (payments, expenses)
- Agreements & document verification
- Analytics & ML rent prediction

---

## 🖥️ Getting Started

### Prerequisites
- Node.js 16+
- npm or yarn
- Flask backend running on `http://localhost:5001`

### Installation
1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

---

## 🧪 Available Scripts

- `npm run dev` - Start development server  
- `npm run build` - Build for production  
- `npm run preview` - Preview production build  
- `npm run lint` - Run ESLint  
- `npm run typecheck` - Run TypeScript type checking

---

## ✅ Project Status

- Core system complete
- ML rent prediction integrated
- Secure financial workflows implemented
- Production-ready backend (Flask + PostgreSQL)

---

If you'd like, I can:
- Open a PR that updates README.md in your repo (I can create the branch and push the file)
