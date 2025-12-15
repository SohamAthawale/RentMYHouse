import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/endpoints';
import { Users, Home, Wrench, DollarSign } from 'lucide-react';
import Loader from '../../components/Loader';

export default function AdminDashboard() {
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

  const cards = [
    { label: 'Total Users', value: stats?.total_users || 0, icon: Users, color: 'bg-blue-500' },
    { label: 'Total Owners', value: stats?.total_owners || 0, icon: Users, color: 'bg-green-500' },
    { label: 'Total Tenants', value: stats?.total_tenants || 0, icon: Users, color: 'bg-yellow-500' },
    { label: 'Total Flats', value: stats?.total_flats || 0, icon: Home, color: 'bg-purple-500' },
    { label: 'Rented Flats', value: stats?.rented_flats || 0, icon: Home, color: 'bg-teal-500' },
    { label: 'Available Flats', value: stats?.available_flats || 0, icon: Home, color: 'bg-orange-500' },
    { label: 'Service Requests', value: stats?.total_service_requests || 0, icon: Wrench, color: 'bg-red-500' },
    { label: 'Total Payments', value: stats?.total_payments || 0, icon: DollarSign, color: 'bg-pink-500' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">{card.label}</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">{card.value}</p>
              </div>
              <div className={`${card.color} p-3 rounded-lg`}>
                <card.icon className="text-white" size={24} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
