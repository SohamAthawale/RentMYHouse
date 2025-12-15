# Setup Instructions

## Prerequisites

1. **Node.js**: Version 16 or higher
2. **Flask Backend**: Make sure your Flask backend is running on `http://localhost:5001`

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

This will install all required packages:
- react & react-dom
- react-router-dom
- axios
- react-hot-toast
- lucide-react
- tailwindcss
- vite

### 2. Configure Backend URL (Optional)

The frontend is configured to connect to `http://localhost:5001` by default.

If your Flask backend is running on a different URL, update it in `src/api/api.js`:

```javascript
const api = axios.create({
  baseURL: 'http://your-backend-url:port',
  // ...
});
```

### 3. Start the Development Server

```bash
npm run dev
```

The application will be available at: `http://localhost:5173`

### 4. Test the Application

1. **Create an account**:
   - Navigate to `/signup`
   - Fill in the form with your details
   - Select an account type (Owner, Tenant, or Admin)
   - Click "Sign Up"

2. **Login**:
   - Navigate to `/login`
   - Enter your email and password
   - You'll be redirected to your role-specific dashboard

## User Roles & Routes

### Owner Routes
- `/owner/dashboard` - Overview of flats, tenants, and requests
- `/owner/flats` - Manage properties
- `/owner/create-flat` - Add new properties
- `/owner/tenants` - View all tenants
- `/owner/service-requests` - Manage service requests
- `/owner/financials` - Financial management

### Tenant Routes
- `/tenant/dashboard` - Personal overview
- `/tenant/my-flat` - View assigned flat details
- `/tenant/my-requests` - View and track service requests
- `/tenant/create-request` - Submit new service request
- `/tenant/payments` - View rent payment history

### Admin Routes
- `/admin/dashboard` - System-wide statistics
- `/admin/users` - User management
- `/admin/user-details/:id` - Detailed user information
- `/admin/statistics` - Detailed system statistics

### Common Routes
- `/profile` - User profile management
- `/change-password` - Change account password

## Features by Role

### Owner Features
✅ Create and manage flats
✅ Assign tenants to flats
✅ View all tenants
✅ Manage service requests
✅ Record rent payments
✅ Track expenses
✅ View financial summaries

### Tenant Features
✅ View assigned flat details
✅ Submit service requests
✅ Rate completed services
✅ View service request history
✅ View rent payment history

### Admin Features
✅ View system statistics
✅ Manage all users
✅ View detailed user information
✅ Filter users by type and status
✅ Export system data
✅ Cleanup orphaned records

## API Endpoints

The frontend integrates with these Flask backend endpoints:

### Authentication
- `POST /signup` - Create new account
- `POST /login` - User login
- `GET /profile/:unique_id` - Get user profile
- `POST /change-password` - Change password
- `PUT /update-profile` - Update profile

### Flats (Owner)
- `POST /create-flat` - Create new flat
- `GET /owner-flats/:owner_unique_id` - Get owner's flats
- `GET /list-flats` - List all flats
- `POST /rent-flat` - Assign tenant to flat
- `POST /vacate-flat/:flat_unique_id` - Vacate flat
- `DELETE /delete-flat/:flat_unique_id` - Delete flat

### Tenants (Owner)
- `GET /all-tenants` - Get all tenants
- `GET /available-tenants` - Get available tenants

### Service Requests
- `POST /create-service-request` - Create request
- `GET /tenant-service-requests/:tenant_unique_id` - Get tenant's requests
- `GET /owner-service-requests/:owner_unique_id` - Get owner's requests
- `PUT /update-service-request` - Update request status
- `POST /rate-service-request` - Rate completed request
- `GET /service-request-details/:request_unique_id` - Get request details

### Financials (Owner)
- `POST /record-rent-payment` - Record rent payment
- `GET /financial-summary/:owner_unique_id` - Get financial summary
- `GET /rent-payment-history` - Get payment history
- `GET /expense-history` - Get expense history
- `POST /create-manual-expense` - Add manual expense

### Admin
- `GET /admin/statistics` - Get system statistics
- `GET /admin/users` - Get all users with filters
- `GET /admin/user-details/:unique_id` - Get user details
- `POST /admin/cleanup` - Cleanup orphaned records
- `GET /admin/export` - Export system data
- `DELETE /delete-user/:unique_id` - Delete user

## Build for Production

```bash
npm run build
```

The production-ready files will be in the `dist/` directory.

## Troubleshooting

### Backend Connection Issues
- Ensure Flask backend is running on `http://localhost:5001`
- Check that CORS is enabled on the backend
- Verify all endpoints are accessible

### Authentication Issues
- Clear localStorage: `localStorage.clear()`
- Check that the backend returns correct user data structure
- Verify JWT/session handling on backend

### Build Issues
- Delete `node_modules` and run `npm install` again
- Clear Vite cache: `rm -rf node_modules/.vite`
- Update dependencies: `npm update`

## Tech Stack

- **React 18** - UI library
- **Vite** - Build tool & dev server
- **React Router v6** - Client-side routing
- **TailwindCSS** - Utility-first CSS
- **Axios** - HTTP client
- **Context API** - State management
- **React Hot Toast** - Toast notifications
- **Lucide React** - Icon library

## Project Structure

```
src/
├── api/                    # API configuration and endpoints
├── auth/                   # Authentication pages
├── components/             # Reusable components
├── context/                # React context providers
├── layouts/                # Layout components
├── pages/                  # Page components
│   ├── admin/             # Admin pages
│   ├── owner/             # Owner pages
│   ├── tenant/            # Tenant pages
│   └── profile/           # Profile pages
├── router.jsx             # Route configuration
├── App.jsx                # Main app component
└── main.tsx               # Entry point
```

## Support

For issues or questions:
1. Check the README.md for feature documentation
2. Review API endpoint responses in browser DevTools
3. Check console for error messages
4. Verify Flask backend is running correctly
