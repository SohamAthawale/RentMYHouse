import { createBrowserRouter, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './auth/Login';
import Signup from './auth/Signup';

import OwnerLayout from './layouts/OwnerLayout';
import OwnerDashboard from './pages/owner/Dashboard';
import Flats from './pages/owner/Flats';
import CreateFlat from './pages/owner/CreateFlat';
import Tenants from './pages/owner/Tenants';
import OwnerServiceRequests from './pages/owner/ServiceRequests';
import Financials from './pages/owner/Financials';

import TenantLayout from './layouts/TenantLayout';
import TenantDashboard from './pages/tenant/Dashboard';
import MyFlat from './pages/tenant/MyFlat';
import MyRequests from './pages/tenant/MyRequests';
import CreateRequest from './pages/tenant/CreateRequest';
import Payments from './pages/tenant/Payments';

import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import Users from './pages/admin/Users';
import UserDetails from './pages/admin/UserDetails';
import Statistics from './pages/admin/Statistics';

import Profile from './pages/profile/Profile';
import ChangePassword from './pages/profile/ChangePassword';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/signup',
    element: <Signup />,
  },
  {
    path: '/profile',
    element: (
      <ProtectedRoute allowedRoles={['Owner', 'Tenant', 'Admin']}>
        <Profile />
      </ProtectedRoute>
    ),
  },
  {
    path: '/change-password',
    element: (
      <ProtectedRoute allowedRoles={['Owner', 'Tenant', 'Admin']}>
        <ChangePassword />
      </ProtectedRoute>
    ),
  },
  {
    path: '/owner',
    element: (
      <ProtectedRoute allowedRoles={['Owner']}>
        <OwnerLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'dashboard',
        element: <OwnerDashboard />,
      },
      {
        path: 'flats',
        element: <Flats />,
      },
      {
        path: 'create-flat',
        element: <CreateFlat />,
      },
      {
        path: 'tenants',
        element: <Tenants />,
      },
      {
        path: 'service-requests',
        element: <OwnerServiceRequests />,
      },
      {
        path: 'financials',
        element: <Financials />,
      },
    ],
  },
  {
    path: '/tenant',
    element: (
      <ProtectedRoute allowedRoles={['Tenant']}>
        <TenantLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'dashboard',
        element: <TenantDashboard />,
      },
      {
        path: 'my-flat',
        element: <MyFlat />,
      },
      {
        path: 'my-requests',
        element: <MyRequests />,
      },
      {
        path: 'create-request',
        element: <CreateRequest />,
      },
      {
        path: 'payments',
        element: <Payments />,
      },
    ],
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute allowedRoles={['Admin']}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'dashboard',
        element: <AdminDashboard />,
      },
      {
        path: 'users',
        element: <Users />,
      },
      {
        path: 'user-details/:uniqueId',
        element: <UserDetails />,
      },
      {
        path: 'statistics',
        element: <Statistics />,
      },
    ],
  },
]);

export default router;
