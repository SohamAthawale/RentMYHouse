import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Home,
  Users,
  Wrench,
  DollarSign,
  FileText,
  BarChart3,
  Settings
} from 'lucide-react';

const ownerLinks = [
  { to: '/owner/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/owner/flats', label: 'Manage Flats', icon: Home },
  { to: '/owner/tenants', label: 'Tenants', icon: Users },
  { to: '/owner/service-requests', label: 'Service Requests', icon: Wrench },
  { to: '/owner/financials', label: 'Financials', icon: DollarSign },
];

const tenantLinks = [
  { to: '/tenant/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tenant/my-flat', label: 'My Flat', icon: Home },
  { to: '/tenant/my-requests', label: 'My Requests', icon: Wrench },
  { to: '/tenant/payments', label: 'Payments', icon: DollarSign },
];

const adminLinks = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/statistics', label: 'Statistics', icon: BarChart3 },
];

export default function Sidebar() {
  const { user } = useAuth();

  const links =
    user?.account_type === 'Owner' ? ownerLinks :
    user?.account_type === 'Tenant' ? tenantLinks :
    user?.account_type === 'Admin' ? adminLinks : [];

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen p-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">RMS</h1>
      </div>
      <nav className="space-y-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`
            }
          >
            <link.icon size={20} />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
