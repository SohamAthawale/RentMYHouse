import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api/endpoints';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { User, Mail, Phone, ArrowLeft, Key } from 'lucide-react';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    contact_no: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        email: user.email,
        contact_no: user.contact_no,
      });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.username || !formData.email || !formData.contact_no) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await authAPI.updateProfile({
        unique_id: user.unique_id,
        ...formData,
      });

      updateUser({ ...user, ...formData });
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (user.account_type === 'Owner') {
      navigate('/owner/dashboard');
    } else if (user.account_type === 'Tenant') {
      navigate('/tenant/dashboard');
    } else {
      navigate('/admin/dashboard');
    }
  };

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-10 py-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <button
          onClick={goBack}
          className="btn-ghost w-fit"
        >
          <ArrowLeft size={20} />
          Back to Dashboard
        </button>

        <h1 className="page-title">My Profile</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card p-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl mb-4 shadow-soft bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]">
                <User size={40} />
              </div>
              <h2 className="text-xl font-semibold text-slate-900">{user?.username}</h2>
              <p className="text-slate-600 mt-1">{user?.account_type}</p>
              <span className="badge-success mt-3">Active</span>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-200/70">
              <button
                onClick={() => navigate('/change-password')}
                className="btn-secondary w-full"
              >
                <Key size={20} />
                Change Password
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 card p-6">
            <h2 className="section-title mb-6">Profile Information</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  <User size={16} />
                  Username
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  <Mail size={16} />
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  <Phone size={16} />
                  Contact Number
                </label>
                <input
                  type="text"
                  value={formData.contact_no}
                  onChange={(e) => setFormData({ ...formData, contact_no: e.target.value })}
                  className="input"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
