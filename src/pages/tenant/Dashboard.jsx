import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { serviceRequestsAPI, financialsAPI } from '../../api/endpoints';
import { Wrench, DollarSign, CheckCircle } from 'lucide-react';
import Loader from '../../components/Loader';

export default function TenantDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    completedRequests: 0,
    totalPayments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [requestsRes, paymentsRes] = await Promise.all([
        serviceRequestsAPI.getTenantRequests(user.unique_id),
        financialsAPI.getRentPaymentHistory({ tenant_unique_id: user.unique_id }),
      ]);

      // Correct arrays
      const requests = requestsRes.data.service_requests || [];
      const payments = paymentsRes.data.payments || [];

      // FIXED: backend status is "Open", not "Pending"
      const pendingCount = requests.filter(
        r => r.status === "Open" || r.status === "In Progress"
      ).length;

      const completedCount = requests.filter(
        r => r.status === "Completed"
      ).length;

      setStats({
        totalRequests: requests.length,
        pendingRequests: pendingCount,
        completedRequests: completedCount,
        totalPayments: payments.length,
      });

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader />;

  const cards = [
    { label: 'Total Requests', value: stats.totalRequests, icon: Wrench, color: 'bg-blue-500' },
    { label: 'Pending Requests', value: stats.pendingRequests, icon: Wrench, color: 'bg-yellow-500' },
    { label: 'Completed Requests', value: stats.completedRequests, icon: CheckCircle, color: 'bg-green-500' },
    { label: 'Total Payments', value: stats.totalPayments, icon: DollarSign, color: 'bg-purple-500' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Tenant Dashboard</h1>

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
