import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { flatsAPI, serviceRequestsAPI } from '../../api/endpoints';
import { Home, Users, Wrench } from 'lucide-react';
import Loader from '../../components/Loader';

export default function OwnerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalFlats: 0,
    rentedFlats: 0,
    availableFlats: 0,
    serviceRequests: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [flatsRes, requestsRes] = await Promise.all([
        flatsAPI.getOwnerFlats(user.unique_id),
        serviceRequestsAPI.getOwnerRequests(user.unique_id),
      ]);

      console.log("OWNER DASHBOARD FLATS:", flatsRes.data);

      // 🔥 FIX: backend returns { flats: [...] }
      const flats = flatsRes.data.flats || [];
      const rentedCount = flats.filter((f) => f.is_rented).length;

      setStats({
        totalFlats: flats.length,
        rentedFlats: rentedCount,
        availableFlats: flats.length - rentedCount,
        serviceRequests: requestsRes.data.requests?.length || 0, // also fix
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader />;

  const cards = [
    { label: 'Total Flats', value: stats.totalFlats, icon: Home, color: 'bg-blue-500' },
    { label: 'Rented Flats', value: stats.rentedFlats, icon: Users, color: 'bg-green-500' },
    { label: 'Available Flats', value: stats.availableFlats, icon: Home, color: 'bg-yellow-500' },
    { label: 'Service Requests', value: stats.serviceRequests, icon: Wrench, color: 'bg-red-500' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Owner Dashboard</h1>

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
