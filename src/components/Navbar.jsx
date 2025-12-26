import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';

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
    <nav className="bg-white border-b border-gray-200 px-3 md:px-6 py-2 md:py-4">
      <div className="flex items-center justify-between gap-2">
        {/* LEFT: TITLE */}
        <div className="min-w-0">
          <h2 className="text-base md:text-xl font-semibold text-gray-800 truncate">
            RentMYHome
          </h2>
          <p className="text-xs md:text-sm text-gray-500 truncate">
            {user?.account_type} Dashboard
          </p>
        </div>

        {/* RIGHT: USER + ACTIONS */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Hide text on small screens */}
          <div className="hidden sm:block text-right leading-tight">
            <p className="text-sm font-medium text-gray-700 truncate max-w-[140px]">
              {user?.username}
            </p>
            <p className="text-xs text-gray-500 truncate max-w-[160px]">
              {user?.email}
            </p>
          </div>

          <button
            onClick={handleProfile}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            aria-label="Profile"
          >
            <User size={18} />
          </button>

          <button
            onClick={handleLogout}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            aria-label="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </nav>
  );
}
