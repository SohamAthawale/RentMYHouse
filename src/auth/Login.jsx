import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api/endpoints';
import toast from 'react-hot-toast';
import LogoMark from '../assets/brand/logo-mark.svg';
import RentalIllustration from '../assets/illustrations/rental-illustration.svg';

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.login({
        email: formData.email,
        password: formData.password,
      });

      const userData = response.data.user;

      login(userData);
      toast.success('Login successful');

      if (userData.account_type === 'Owner') {
        navigate('/owner/dashboard');
      } else if (userData.account_type === 'Tenant') {
        navigate('/tenant/dashboard');
      } else if (userData.account_type === 'Admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/login');
      }
    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.message;

      if (status === 403 && message === 'Account not verified') {
        toast.error('Please verify your email first');

        navigate('/verify-otp', {
          state: { email: formData.email },
        });
        return;
      }

      toast.error(message || 'Login failed');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-grid">
        <div className="auth-card">
          <div className="flex items-center gap-3">
            <img src={LogoMark} alt="RentMYHouse" className="h-12 w-12" />
            <div>
              <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">
                Welcome Back
              </p>
              <h2 className="text-2xl font-display font-semibold text-slate-900">
                Sign in to RentMYHouse
              </h2>
            </div>
          </div>

          <p className="text-sm text-slate-600 mt-4">
            Manage properties, rent cycles, and service requests from one calm, color-rich workspace.
          </p>

          <div className="h-1 w-16 rounded-full bg-[var(--md-sys-color-primary)] mt-6"></div>

          <form onSubmit={handleSubmit} className="space-y-5 mt-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="input"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="input"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-600">
              Don&apos;t have an account?{' '}
              <Link
                to="/signup"
                className="text-[var(--md-sys-color-secondary)] font-semibold"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>

        <div className="auth-hero">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Smart Rental Flow
            </p>
            <h1 className="text-3xl font-display font-semibold text-slate-900 mt-2">
              Organize your portfolio like a studio.
            </h1>
            <p className="text-slate-600 mt-4">
              Keep tenants happy with clear status updates, transparent payments, and service workflows that move fast.
            </p>

            <div className="mt-6 grid gap-3">
              <div className="feature-tile">
                <span className="feature-dot"></span>
                <p className="text-sm text-slate-700">
                  Auto-track rent schedules and deposit health
                </p>
              </div>
              <div className="feature-tile">
                <span className="feature-dot"></span>
                <p className="text-sm text-slate-700">
                  Keep service requests organized by priority
                </p>
              </div>
              <div className="feature-tile">
                <span className="feature-dot"></span>
                <p className="text-sm text-slate-700">
                  Share updates with tenants from one hub
                </p>
              </div>
            </div>
          </div>

          <img
            src={RentalIllustration}
            alt="Rental overview"
            className="w-full mt-8"
          />
        </div>
      </div>
    </div>
  );
}
