import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import LogoMark from '../assets/brand/logo-mark.svg';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleProfile = () => {
    navigate('/profile');
  };

  return (
    <nav className="app-bar">
      <div className="app-bar-inner">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={LogoMark}
            alt="RentMYHouse"
            className="hidden sm:block h-11 w-11"
          />

          <div className="min-w-0">
            <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">
              RentMYHouse Console
            </p>
            <h2 className="text-lg md:text-xl font-display font-semibold text-slate-900 truncate">
              {user?.account_type} Workspace
            </h2>
          </div>
        </div>

        <div className="app-bar-actions">
          <span className="chip hidden sm:inline-flex">
            {user?.account_type}
          </span>

          <div className="hidden md:flex flex-col text-right leading-tight">
            <p className="text-sm font-semibold text-slate-700 truncate max-w-[180px]">
              {user?.username}
            </p>
            <p className="text-xs text-slate-500 truncate max-w-[200px]">
              {user?.email}
            </p>
          </div>

          <button
            onClick={handleProfile}
            className="icon-button"
            aria-label="Profile"
          >
            <User size={18} />
          </button>

          <button
            onClick={handleLogout}
            className="icon-button"
            aria-label="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </nav>
  );
}
