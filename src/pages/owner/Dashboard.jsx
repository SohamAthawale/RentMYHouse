import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  flatsAPI,
  serviceRequestsAPI,
  tenantsAPI,
} from '../../api/endpoints';
import {
  Home,
  Users,
  Wrench,
  Mail,
  Phone,
} from 'lucide-react';
import Loader from '../../components/Loader';
import toast from 'react-hot-toast';

export default function OwnerDashboard() {
  const { user } = useAuth();

  // ================= STATS =================
  const [stats, setStats] = useState({
    totalFlats: 0,
    rentedFlats: 0,
    availableFlats: 0,
    serviceRequests: 0,
  });

  // ================= DATA =================
  const [availableTenants, setAvailableTenants] = useState([]);
  const [availableFlats, setAvailableFlats] = useState([]);

  // ================= RENT MODAL =================
  const [showRentModal, setShowRentModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);

  const [rentForm, setRentForm] = useState({
    flat_unique_id: '',
    otp_code: '',
    deposit_amount: '',
    rented_date: '',
  });

  const [otpCooldown, setOtpCooldown] = useState(false);
  const [loading, setLoading] = useState(true);

  // ================= EFFECT =================
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // ================= FETCH DASHBOARD =================
  const fetchDashboardData = async () => {
    try {
      const [flatsRes, requestsRes, tenantsRes] = await Promise.all([
        flatsAPI.getOwnerFlats(user.unique_id),
        serviceRequestsAPI.getOwnerRequests(user.unique_id),
        tenantsAPI.getAvailableTenants(),
      ]);

      const flats = flatsRes.data.flats || [];
      const rentedCount = flats.filter(f => f.is_rented).length;

      setStats({
        totalFlats: flats.length,
        rentedFlats: rentedCount,
        availableFlats: flats.length - rentedCount,
        serviceRequests: requestsRes.data.requests?.length || 0,
      });

      setAvailableFlats(flats.filter(f => !f.is_rented));
      setAvailableTenants(tenantsRes.data.available_tenants || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  // ================= REQUEST OTP =================
  const handleRequestOtp = async () => {
    if (!rentForm.flat_unique_id) {
      toast.error('Please select a flat first');
      return;
    }

    try {
      setOtpCooldown(true);
      await flatsAPI.requestRentOtp({
        flat_unique_id: rentForm.flat_unique_id,
        tenant_unique_id: selectedTenant.unique_id,
      });
      toast.success('OTP sent to tenant email');
      setTimeout(() => setOtpCooldown(false), 30000);
    } catch {
      toast.error('Failed to send OTP');
      setOtpCooldown(false);
    }
  };

  // ================= CONFIRM RENT =================
  const handleRentFlat = async () => {
    if (!rentForm.flat_unique_id || !rentForm.otp_code) {
      toast.error('Flat and OTP are required');
      return;
    }

    try {
      await flatsAPI.rentFlat({
        flat_unique_id: rentForm.flat_unique_id,
        tenant_unique_id: selectedTenant.unique_id,
        otp_code: rentForm.otp_code,
        deposit_amount: rentForm.deposit_amount || 0,
        rented_date: rentForm.rented_date || null,
      });

      toast.success('Flat rented successfully');

      setShowRentModal(false);
      setSelectedTenant(null);
      setRentForm({
        flat_unique_id: '',
        otp_code: '',
        deposit_amount: '',
        rented_date: '',
      });

      fetchDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rent failed');
    }
  };

  if (loading) return <Loader />;

  // ================= UI =================
  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-bold text-gray-800">
        Owner Dashboard
      </h1>

      {/* ================= STATS CARDS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Flats', value: stats.totalFlats, icon: Home, color: 'bg-blue-500' },
          { label: 'Rented Flats', value: stats.rentedFlats, icon: Users, color: 'bg-green-500' },
          { label: 'Available Flats', value: stats.availableFlats, icon: Home, color: 'bg-yellow-500' },
          { label: 'Service Requests', value: stats.serviceRequests, icon: Wrench, color: 'bg-red-500' },
        ].map((card, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">{card.label}</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">
                  {card.value}
                </p>
              </div>
              <div className={`${card.color} p-3 rounded-lg`}>
                <card.icon className="text-white" size={24} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ================= AVAILABLE TENANTS ================= */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Available Tenants
        </h2>

        {availableTenants.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-10 text-center">
            <Users size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No available tenants right now</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableTenants.map(tenant => (
              <div key={tenant.unique_id} className="bg-white shadow rounded p-6">
                <h3 className="font-semibold">{tenant.username}</h3>

                <div className="text-sm text-gray-600 mt-2">
                  <Mail size={14} className="inline mr-1" />
                  {tenant.email}
                </div>

                <div className="text-sm text-gray-600">
                  <Phone size={14} className="inline mr-1" />
                  {tenant.contact_no || 'N/A'}
                </div>

                <button
                  onClick={() => {
                    setSelectedTenant(tenant);
                    setShowRentModal(true);
                  }}
                  className="mt-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                >
                  Assign Flat
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================= RENT MODAL ================= */}
      {showRentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="font-semibold mb-4">
              Rent Flat to {selectedTenant?.username}
            </h3>

            <select
              className="w-full border p-2 rounded mb-2"
              value={rentForm.flat_unique_id}
              onChange={e => setRentForm({ ...rentForm, flat_unique_id: e.target.value })}
            >
              <option value="">Select Flat</option>
              {availableFlats.map(flat => (
                <option key={flat.flat_unique_id} value={flat.flat_unique_id}>
                  {flat.title}
                </option>
              ))}
            </select>

            <button
              onClick={handleRequestOtp}
              disabled={otpCooldown}
              className="w-full bg-gray-800 text-white py-2 rounded mb-3 disabled:opacity-50"
            >
              {otpCooldown ? 'OTP Sent (wait)' : 'Request OTP'}
            </button>

            <input
              placeholder="Enter OTP"
              className="w-full border p-2 rounded mb-2"
              value={rentForm.otp_code}
              onChange={e => setRentForm({ ...rentForm, otp_code: e.target.value })}
            />

            <input
              type="number"
              placeholder="Deposit (optional)"
              className="w-full border p-2 rounded mb-2"
              value={rentForm.deposit_amount}
              onChange={e => setRentForm({ ...rentForm, deposit_amount: e.target.value })}
            />

            <input
              type="date"
              className="w-full border p-2 rounded mb-4"
              value={rentForm.rented_date}
              onChange={e => setRentForm({ ...rentForm, rented_date: e.target.value })}
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRentModal(false)}
                className="border px-4 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleRentFlat}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Confirm Rent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
