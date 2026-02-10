import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { flatsAPI } from '../../api/endpoints';
import { Users, Mail, Phone, Home } from 'lucide-react';
import Loader from '../../components/Loader';

export default function Tenants() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const response = await flatsAPI.getOwnerFlats(user.unique_id);

      console.log("TENANTS API RESPONSE:", response.data);

      const flats = response.data.flats || [];

      // ✅ FIX: use backend "tenant" object
      const rentedFlats = flats.filter((f) => f.is_rented && f.tenant);

      setTenants(rentedFlats);
    } catch (error) {
      console.error("Error fetching tenants:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="page">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
          Occupancy
        </p>
        <h1 className="page-title">My Tenants</h1>
      </div>

      {tenants.length === 0 ? (
        <div className="card p-12 text-center">
          <Users size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">No Tenants Yet</h3>
          <p className="text-slate-500">Assign tenants to your flats to see them here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tenants.map((flat) => (
            <div key={flat.flat_unique_id} className="card-hover p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-2xl shadow-soft bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]">
                  <Users size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {flat.tenant?.username}
                  </h3>
                  <p className="text-sm text-slate-500">Tenant</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-600">
                  <Home size={16} />
                  <span className="text-sm">{flat.title}</span>
                </div>

                <div className="flex items-center gap-2 text-slate-600">
                  <Phone size={16} />
                  <span className="text-sm">{flat.tenant?.contact_no || "N/A"}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200/70">
                <p className="text-sm text-slate-600">
                  Monthly Rent:{" "}
                  <span className="font-semibold text-slate-800">
                    ${flat.rent}
                  </span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
