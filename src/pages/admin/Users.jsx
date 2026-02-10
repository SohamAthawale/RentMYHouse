import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/endpoints';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Users as UsersIcon, Trash2, Eye, Download, Trash } from 'lucide-react';
import Loader from '../../components/Loader';

export default function Users() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    account_type: '',
    currently_rented: '',
  });

  useEffect(() => {
    fetchUsers();
  }, [filters]);

  const fetchUsers = async () => {
    try {
      const params = {};
      if (filters.account_type) params.account_type = filters.account_type;
      if (filters.currently_rented) params.currently_rented = filters.currently_rented;

      const response = await adminAPI.getUsers(params);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (uniqueId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

    try {
      await adminAPI.deleteUser(uniqueId);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleCleanup = async () => {
    if (!confirm('Are you sure you want to cleanup orphaned records?')) return;

    try {
      await adminAPI.cleanup();
      toast.success('Cleanup completed successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  };

  const handleExport = async () => {
    try {
      const response = await adminAPI.exportData();
      const dataStr = JSON.stringify(response.data, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `system_export_${Date.now()}.json`;
      link.click();
      toast.success('Data exported successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Admin
          </p>
          <h1 className="page-title">User Management</h1>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleExport}
            className="btn-primary"
          >
            <Download size={20} />
            Export Data
          </button>
          <button
            onClick={handleCleanup}
            className="btn-outline"
          >
            <Trash size={20} />
            Cleanup
          </button>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="section-title mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Account Type</label>
            <select
              value={filters.account_type}
              onChange={(e) => setFilters({ ...filters, account_type: e.target.value })}
              className="select"
            >
              <option value="">All</option>
              <option value="Owner">Owner</option>
              <option value="Tenant">Tenant</option>
              <option value="Admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Rental Status</label>
            <select
              value={filters.currently_rented}
              onChange={(e) => setFilters({ ...filters, currently_rented: e.target.value })}
              className="select"
            >
              <option value="">All</option>
              <option value="true">Currently Rented</option>
              <option value="false">Not Rented</option>
            </select>
          </div>
        </div>
      </div>

      {users.length === 0 ? (
        <div className="card p-12 text-center">
          <UsersIcon size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">No Users Found</h3>
          <p className="text-slate-500">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="table-card">
          <table className="min-w-full">
            <thead className="table-head">
              <tr>
                <th className="px-6 py-4 text-left">
                  Username
                </th>
                <th className="px-6 py-4 text-left">
                  Email
                </th>
                <th className="px-6 py-4 text-left">
                  Contact
                </th>
                <th className="px-6 py-4 text-left">
                  Type
                </th>
                <th className="px-6 py-4 text-left">
                  Status
                </th>
                <th className="px-6 py-4 text-left">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-700">
              {users.map((user) => (
                <tr key={user.unique_id} className="table-row">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">
                    {user.username}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.contact_no}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`badge ${
                      user.account_type === 'Owner' ? 'badge-info' :
                      user.account_type === 'Tenant' ? 'badge-success' :
                      'badge-neutral'
                    }`}>
                      {user.account_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.account_type === 'Tenant' && (
                      <span className={`badge ${
                        user.currently_rented ? 'badge-success' : 'badge-neutral'
                      }`}>
                        {user.currently_rented ? 'Rented' : 'Available'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap space-x-3">
                    <button
                      onClick={() => navigate(`/admin/user-details/${user.unique_id}`)}
                      className="text-[var(--md-sys-color-primary)]"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.unique_id)}
                      className="text-[var(--md-sys-color-error)]"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
