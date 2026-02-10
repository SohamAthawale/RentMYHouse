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
    { label: 'Total Users', value: stats?.total_users || 0, icon: Users, tone: 'icon-primary', accent: 'border-[var(--md-sys-color-primary)]' },
    { label: 'Total Owners', value: stats?.total_owners || 0, icon: Users, tone: 'icon-secondary', accent: 'border-[var(--md-sys-color-secondary)]' },
    { label: 'Total Tenants', value: stats?.total_tenants || 0, icon: Users, tone: 'icon-tertiary', accent: 'border-[var(--md-sys-color-tertiary)]' },
    { label: 'Total Flats', value: stats?.total_flats || 0, icon: Home, tone: 'icon-primary', accent: 'border-[var(--md-sys-color-primary)]' },
    { label: 'Rented Flats', value: stats?.rented_flats || 0, icon: Home, tone: 'icon-secondary', accent: 'border-[var(--md-sys-color-secondary)]' },
    { label: 'Available Flats', value: stats?.available_flats || 0, icon: Home, tone: 'icon-tertiary', accent: 'border-[var(--md-sys-color-tertiary)]' },
    { label: 'Service Requests', value: stats?.total_service_requests || 0, icon: Wrench, tone: 'icon-error', accent: 'border-[var(--md-sys-color-error)]' },
    { label: 'Total Payments', value: stats?.total_payments || 0, icon: DollarSign, tone: 'icon-primary', accent: 'border-[var(--md-sys-color-primary)]' },
  ];

  return (
    <div className="page">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
          Admin
        </p>
        <h1 className="page-title">Admin Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => (
          <div key={index} className={`stat-card border-l-4 ${card.accent}`}>
            <div>
              <p className="text-sm text-slate-500">{card.label}</p>
              <p className="text-3xl font-display font-semibold text-slate-900 mt-2">{card.value}</p>
            </div>
            <div className={`stat-icon ${card.tone}`}>
              <card.icon size={22} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
