import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/endpoints';
import { BarChart3 } from 'lucide-react';
import Loader from '../../components/Loader';

export default function Statistics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      const response = await adminAPI.getStatistics();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="page">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
          Insights
        </p>
        <h1 className="page-title">System Statistics</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card p-6">
          <h3 className="section-title mb-4">User Statistics</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600">Total Users:</span>
              <span className="font-semibold text-slate-800">{stats?.total_users || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Owners:</span>
              <span className="font-semibold text-slate-800">{stats?.total_owners || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Tenants:</span>
              <span className="font-semibold text-slate-800">{stats?.total_tenants || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Admins:</span>
              <span className="font-semibold text-slate-800">{stats?.total_admins || 0}</span>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="section-title mb-4">Property Statistics</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600">Total Flats:</span>
              <span className="font-semibold text-slate-800">{stats?.total_flats || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Rented:</span>
              <span className="font-semibold text-[var(--md-sys-color-primary)]">{stats?.rented_flats || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Available:</span>
              <span className="font-semibold text-[var(--md-sys-color-tertiary)]">{stats?.available_flats || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Occupancy Rate:</span>
              <span className="font-semibold text-[var(--md-sys-color-primary)]">
                {stats?.total_flats > 0
                  ? ((stats.rented_flats / stats.total_flats) * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="section-title mb-4">Service & Financial</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600">Service Requests:</span>
              <span className="font-semibold text-slate-800">{stats?.total_service_requests || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Total Payments:</span>
              <span className="font-semibold text-slate-800">{stats?.total_payments || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Total Expenses:</span>
              <span className="font-semibold text-slate-800">{stats?.total_expenses || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {stats && Object.keys(stats).length === 0 && (
        <div className="card p-12 text-center">
          <BarChart3 size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">No Statistics Available</h3>
          <p className="text-slate-500">System statistics will appear here as data is collected</p>
        </div>
      )}
    </div>
  );
}
