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
import LogoMark from '../assets/brand/logo-mark.svg';

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
      <aside className="side-panel">
        <div>
          <div className="side-brand">
            <img src={LogoMark} alt="RentMYHouse" className="h-12 w-12" />
            <div>
              <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">
                RentMYHouse
              </p>
              <p className="text-base font-display font-semibold text-slate-900">
                Rental Hub
              </p>
            </div>
          </div>

          <nav className="side-links">
            {links.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `side-link ${isActive ? 'side-link-active' : ''}`
                }
              >
                <span className="side-link-icon">
                  <link.icon size={20} />
                </span>
                <span>{link.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="side-footer">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Tip
          </p>
          <p className="text-sm font-semibold text-slate-900 mt-2">
            Keep rent reminders on auto.
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Reduce missed payments with scheduled nudges.
          </p>
        </div>
      </aside>

      {/* ========================= */}
      {/* MOBILE BOTTOM NAV */}
      {/* ========================= */}
      <nav className="mobile-dock">
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `mobile-dock-item ${isActive ? 'mobile-dock-item-active' : ''}`
            }
          >
            <link.icon size={22} />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
