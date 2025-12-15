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
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">System Statistics</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">User Statistics</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Users:</span>
              <span className="font-semibold text-gray-800">{stats?.total_users || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Owners:</span>
              <span className="font-semibold text-gray-800">{stats?.total_owners || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tenants:</span>
              <span className="font-semibold text-gray-800">{stats?.total_tenants || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Admins:</span>
              <span className="font-semibold text-gray-800">{stats?.total_admins || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Property Statistics</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Flats:</span>
              <span className="font-semibold text-gray-800">{stats?.total_flats || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Rented:</span>
              <span className="font-semibold text-green-600">{stats?.rented_flats || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Available:</span>
              <span className="font-semibold text-yellow-600">{stats?.available_flats || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Occupancy Rate:</span>
              <span className="font-semibold text-blue-600">
                {stats?.total_flats > 0
                  ? ((stats.rented_flats / stats.total_flats) * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Service & Financial</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Service Requests:</span>
              <span className="font-semibold text-gray-800">{stats?.total_service_requests || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Payments:</span>
              <span className="font-semibold text-gray-800">{stats?.total_payments || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Expenses:</span>
              <span className="font-semibold text-gray-800">{stats?.total_expenses || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {stats && Object.keys(stats).length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center mt-6">
          <BarChart3 size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Statistics Available</h3>
          <p className="text-gray-500">System statistics will appear here as data is collected</p>
        </div>
      )}
    </div>
  );
}
