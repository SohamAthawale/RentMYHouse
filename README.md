# Rental Management System - Frontend

A comprehensive React + Vite + TailwindCSS frontend for managing rental properties with role-based dashboards for Owners, Tenants, and Admins.

## Features

### Owner Features
- Dashboard with statistics (flats, tenants, service requests)
- Create and manage flats
- Assign tenants to flats
- Manage service requests from tenants
- Financial management (rent payments, expenses)
- View all tenants

### Tenant Features
- Dashboard with personal statistics
- View flat details
- Submit and track service requests
- Rate completed service requests
- View rent payment history

### Admin Features
- System-wide statistics dashboard
- User management with filters
- View detailed user information
- Export system data
- Cleanup orphaned records

## Tech Stack

- **React 18+** - UI library
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **Axios** - HTTP client
- **React Router v6** - Routing
- **Context API** - State management
- **React Hot Toast** - Notifications
- **Lucide React** - Icons

## Project Structure

```
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
```

## Getting Started

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

## Authentication Flow

1. Users sign up with email, username, password, contact number, and account type
2. Users log in with email and password
3. After successful login, users are redirected based on their account type:
   - **Owner** → `/owner/dashboard`
   - **Tenant** → `/tenant/dashboard`
   - **Admin** → `/admin/dashboard`
4. User information is stored in AuthContext and persisted in localStorage

## API Integration

The frontend connects to a Flask backend at `http://localhost:5001`. All API endpoints are configured in `src/api/endpoints.js`:

- **Authentication**: signup, login, profile management, password change
- **Flats**: create, list, rent, vacate, delete
- **Tenants**: list all, available tenants
- **Service Requests**: create, update, rate, view by user
- **Financials**: record payments, view history, manage expenses
- **Admin**: statistics, user management, data export, cleanup

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

## Key Features

### Role-Based Access Control
- Protected routes ensure users can only access pages appropriate for their role
- Automatic redirection based on account type

### Responsive Design
- Mobile-friendly interface
- Adaptive layouts for different screen sizes
- Touch-optimized controls

### Real-Time Feedback
- Toast notifications for all actions
- Loading states for async operations
- Error handling with clear messages

### Data Management
- Create, read, update, and delete operations for all entities
- Filtering and sorting capabilities
- Export functionality for admins

## Security

- Password-protected accounts
- Role-based route protection
- Secure API communication
- No sensitive data in localStorage (only user metadata)

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

