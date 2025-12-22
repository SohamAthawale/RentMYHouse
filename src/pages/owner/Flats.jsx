import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { flatsAPI, tenantsAPI } from '../../api/endpoints';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Trash2, UserPlus, UserMinus, Home } from 'lucide-react';
import Loader from '../../components/Loader';

export default function Flats() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [flats, setFlats] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedFlat, setSelectedFlat] = useState(null);
  const [availableTenants, setAvailableTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);

  useEffect(() => {
    fetchFlats();
  }, []);

  const fetchFlats = async () => {
    try {
      const res = await flatsAPI.listFlats();
      setFlats(res.data?.flats || []);
    } catch {
      setFlats([]);
    } finally {
      setLoading(false);
    }
  };

  const openAssignModal = async (flat) => {
    setSelectedFlat(flat);
    setOtpRequested(false);
    setOtpCode('');
    try {
      const res = await tenantsAPI.getAvailableTenants();
      setAvailableTenants(
        Array.isArray(res.data?.available_tenants)
          ? res.data.available_tenants
          : []
      );
      setShowAssignModal(true);
    } catch {
      toast.error('Failed to load tenants');
    }
  };

  const requestOtp = async () => {
    if (!selectedTenant) return toast.error('Select a tenant first');

    try {
      await flatsAPI.requestRentOtp({
        flat_unique_id: selectedFlat.flat_unique_id,
        tenant_unique_id: selectedTenant,
      });
      toast.success('OTP sent to tenant');
      setOtpRequested(true);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to send OTP');
    }
  };

  const confirmAssign = async () => {
    if (!otpCode) return toast.error('Enter OTP');

    try {
      await flatsAPI.rentFlat({
        flat_unique_id: selectedFlat.flat_unique_id,
        tenant_unique_id: selectedTenant,
        otp_code: otpCode,
      });

      toast.success('Tenant assigned successfully');
      setShowAssignModal(false);
      fetchFlats();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to assign tenant');
    }
  };

  const handleVacate = async (flatId) => {
    if (!confirm('Vacate this flat?')) return;
    await flatsAPI.vacateFlat(flatId);
    fetchFlats();
  };

  if (loading) return <Loader />;

  return (
    <div>
      <div className="flex justify-between mb-6">
        <h1 className="text-3xl font-bold">Manage Flats</h1>
        <button
          onClick={() => navigate('/owner/create-flat')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          <Plus size={18} /> Create Flat
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {flats.map((flat) => (
          <div key={flat.flat_unique_id} className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold">{flat.title}</h3>
            <p>{flat.address}</p>
            <p className="mt-2">Rent: ₹{flat.rent}</p>

            {!flat.is_rented ? (
              <button
                onClick={() => openAssignModal(flat)}
                className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg"
              >
                <UserPlus size={16} /> Assign
              </button>
            ) : (
              <button
                onClick={() => handleVacate(flat.flat_unique_id)}
                className="mt-4 bg-yellow-600 text-white px-4 py-2 rounded-lg"
              >
                <UserMinus size={16} /> Vacate
              </button>
            )}
          </div>
        ))}
      </div>

      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              Assign Tenant – {selectedFlat.title}
            </h2>

            <select
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
              className="w-full border p-2 rounded mb-4"
            >
              <option value="">Select tenant</option>
              {availableTenants.map((t) => (
                <option key={t.unique_id} value={t.unique_id}>
                  {t.username} ({t.email})
                </option>
              ))}
            </select>

            {!otpRequested ? (
              <button
                onClick={requestOtp}
                className="bg-blue-600 text-white px-4 py-2 rounded w-full"
              >
                Send OTP
              </button>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Enter OTP"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="w-full border p-2 rounded mb-3"
                />
                <button
                  onClick={confirmAssign}
                  className="bg-green-600 text-white px-4 py-2 rounded w-full"
                >
                  Confirm Assignment
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
