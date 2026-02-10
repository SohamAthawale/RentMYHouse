import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../api/endpoints';
import toast from 'react-hot-toast';
import LogoMark from '../assets/brand/logo-mark.svg';
import RentalIllustration from '../assets/illustrations/rental-illustration.svg';

export default function Signup() {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    account_type: 'Tenant',
    contact_no: '',
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.username || !formData.password || !formData.contact_no) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await authAPI.signup(formData);
      toast.success('Verification code sent to your email');
      navigate('/verify-otp', {
        state: { email: formData.email },
      });
    } catch (error) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Signup failed';

      toast.error(message);
      console.error('Signup error:', error);
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
                Create Account
              </p>
              <h2 className="text-2xl font-display font-semibold text-slate-900">
                Build your rental workspace
              </h2>
            </div>
          </div>

          <p className="text-sm text-slate-600 mt-4">
            Invite tenants, add properties, and manage every request in one modern dashboard.
          </p>

          <div className="h-1 w-16 rounded-full bg-[var(--md-sys-color-primary)] mt-6"></div>

          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="input"
                placeholder="johndoe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Contact Number
              </label>
              <input
                type="text"
                value={formData.contact_no}
                onChange={(e) => setFormData({ ...formData, contact_no: e.target.value })}
                className="input"
                placeholder="+1234567890"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Account Type
              </label>
              <select
                value={formData.account_type}
                onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                className="select"
              >
                <option value="Tenant">Tenant</option>
                <option value="Owner">Owner</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="input"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-4"
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-600">
              Already have an account?{' '}
              <Link to="/login" className="text-[var(--md-sys-color-secondary)] font-semibold">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <div className="auth-hero">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Ready To Launch
            </p>
            <h1 className="text-3xl font-display font-semibold text-slate-900 mt-2">
              Bring every rental into one rhythm.
            </h1>
            <p className="text-slate-600 mt-4">
              Set up once, then keep leases, payments, and inspections moving with quick approvals.
            </p>

            <div className="mt-6 grid gap-3">
              <div className="feature-tile">
                <span className="feature-dot"></span>
                <p className="text-sm text-slate-700">
                  Launch a full portfolio in minutes
                </p>
              </div>
              <div className="feature-tile">
                <span className="feature-dot"></span>
                <p className="text-sm text-slate-700">
                  Send reminders and payment nudges
                </p>
              </div>
              <div className="feature-tile">
                <span className="feature-dot"></span>
                <p className="text-sm text-slate-700">
                  Track service tickets by urgency
                </p>
              </div>
            </div>
          </div>

          <img
            src={RentalIllustration}
            alt="Rental workspace"
            className="w-full mt-8"
          />
        </div>
      </div>
    </div>
  );
}
