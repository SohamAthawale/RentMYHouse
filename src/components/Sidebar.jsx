import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Home,
  Users,
  Wrench,
  DollarSign,
  BarChart3,
} from 'lucide-react';

const ownerLinks = [
  { to: '/owner/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/owner/flats', label: 'Flats', icon: Home },
  { to: '/owner/tenants', label: 'Tenants', icon: Users },
  { to: '/owner/service-requests', label: 'Service', icon: Wrench },
  { to: '/owner/financials', label: 'Money', icon: DollarSign },
];

const tenantLinks = [
  { to: '/tenant/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tenant/my-flat', label: 'Flat', icon: Home },
  { to: '/tenant/my-requests', label: 'Requests', icon: Wrench },
  { to: '/tenant/payments', label: 'Pay', icon: DollarSign },
];

const adminLinks = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/statistics', label: 'Stats', icon: BarChart3 },
];

export default function Sidebar() {
  const { user } = useAuth();

  const links =
    user?.account_type === 'Owner'
      ? ownerLinks
      : user?.account_type === 'Tenant'
      ? tenantLinks
      : user?.account_type === 'Admin'
      ? adminLinks
      : [];

  return (
    <>
      {/* ========================= */}
      {/* DESKTOP SIDEBAR */}
      {/* ========================= */}
      <aside className="hidden md:block w-64 bg-gray-900 text-white min-h-screen p-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">RMS</h1>
        </div>

        <nav className="space-y-2">
          {links.map(link => (
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

      {/* ========================= */}
      {/* MOBILE BOTTOM NAV */}
      {/* ========================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-50">
        <div className="flex justify-around">
          {links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-2 px-1 text-xs transition ${
                  isActive
                    ? 'text-blue-500'
                    : 'text-gray-400'
                }`
              }
            >
              <link.icon size={22} />
              <span className="mt-1">{link.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
