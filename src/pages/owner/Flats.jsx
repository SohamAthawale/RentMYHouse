import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { flatsAPI, tenantsAPI } from '../../api/endpoints';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Trash2, UserPlus, UserMinus } from 'lucide-react';
import Loader from '../../components/Loader';

export default function Flats() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [flats, setFlats] = useState([]);
  const [loading, setLoading] = useState(true);

  // ============================
  // GLOBAL ACTION LOCKS
  // ============================
  const [isSendingAssignOtp, setIsSendingAssignOtp] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  const [isSendingVacateOtp, setIsSendingVacateOtp] = useState(false);
  const [isVacating, setIsVacating] = useState(false);

  // ============================
  // ASSIGN STATES
  // ============================
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedFlat, setSelectedFlat] = useState(null);
  const [availableTenants, setAvailableTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [assignOtp, setAssignOtp] = useState('');
  const [assignOtpRequested, setAssignOtpRequested] = useState(false);

  // ============================
  // VACATE STATES
  // ============================
  const [showVacateModal, setShowVacateModal] = useState(false);
  const [vacateOtp, setVacateOtp] = useState('');
  const [vacateOtpRequested, setVacateOtpRequested] = useState(false);

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

  // ============================
  // DELETE FLAT
  // ============================
  const handleDeleteFlat = async (flatId) => {
    if (!window.confirm('Are you sure you want to permanently delete this flat?')) return;

    try {
      await flatsAPI.deleteFlat(flatId);
      toast.success('Flat deleted successfully');
      fetchFlats();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete flat');
    }
  };

  // ============================
  // ASSIGN FLOW
  // ============================
  const openAssignModal = async (flat) => {
    setSelectedFlat(flat);
    setSelectedTenant('');
    setAssignOtp('');
    setAssignOtpRequested(false);
    setIsSendingAssignOtp(false);
    setIsAssigning(false);

    try {
      const res = await tenantsAPI.getAvailableTenants();
      setAvailableTenants(res.data?.available_tenants || []);
      setShowAssignModal(true);
    } catch {
      toast.error('Failed to load tenants');
    }
  };

  const requestAssignOtp = async () => {
    if (isSendingAssignOtp) return;

    if (!selectedTenant) {
      toast.error('Select a tenant first');
      return;
    }

    try {
      setIsSendingAssignOtp(true);

      await flatsAPI.requestRentOtp({
        flat_unique_id: selectedFlat.flat_unique_id,
        tenant_unique_id: selectedTenant,
      });

      toast.success('OTP sent to tenant');
      setAssignOtpRequested(true);

      // ⏱ cooldown (email delay protection)
      setTimeout(() => setIsSendingAssignOtp(false), 30000);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to send OTP');
      setIsSendingAssignOtp(false);
    }
  };

  const confirmAssign = async () => {
    if (isAssigning) return;

    if (!assignOtp) {
      toast.error('Enter OTP');
      return;
    }

    try {
      setIsAssigning(true);

      await flatsAPI.rentFlat({
        flat_unique_id: selectedFlat.flat_unique_id,
        tenant_unique_id: selectedTenant,
        otp_code: assignOtp,
      });

      toast.success('Tenant assigned successfully');
      setShowAssignModal(false);
      fetchFlats();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to assign tenant');
    } finally {
      setIsAssigning(false);
    }
  };

  // ============================
  // VACATE FLOW
  // ============================
  const openVacateModal = (flat) => {
    setSelectedFlat(flat);
    setVacateOtp('');
    setVacateOtpRequested(false);
    setIsSendingVacateOtp(false);
    setIsVacating(false);
    setShowVacateModal(true);
  };

  const requestVacateOtp = async () => {
    if (isSendingVacateOtp) return;

    try {
      setIsSendingVacateOtp(true);

      await flatsAPI.requestVacateOtp({
        flat_unique_id: selectedFlat.flat_unique_id,
        tenant_unique_id: selectedFlat.rented_to_unique_id,
      });

      toast.success('OTP sent to tenant');
      setVacateOtpRequested(true);

      // ⏱ cooldown
      setTimeout(() => setIsSendingVacateOtp(false), 30000);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to send OTP');
      setIsSendingVacateOtp(false);
    }
  };

  const confirmVacate = async () => {
    if (isVacating) return;

    if (!vacateOtp) {
      toast.error('Enter OTP');
      return;
    }

    try {
      setIsVacating(true);

      await flatsAPI.vacateFlat({
        flat_unique_id: selectedFlat.flat_unique_id,
        tenant_unique_id: selectedFlat.rented_to_unique_id,
        otp_code: vacateOtp,
      });

      toast.success('Flat vacated successfully');
      setShowVacateModal(false);
      fetchFlats();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to vacate flat');
    } finally {
      setIsVacating(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div>
      {/* HEADER */}
      <div className="flex justify-between mb-6">
        <h1 className="text-3xl font-bold">Manage Flats</h1>
        <button
          onClick={() => navigate('/owner/create-flat')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={18} /> Create Flat
        </button>
      </div>

      {/* FLATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {flats.map((flat) => (
          <div key={flat.flat_unique_id} className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold">{flat.title}</h3>
            <p>{flat.address}</p>
            <p className="mt-2">Rent: ₹{flat.rent}</p>

            {!flat.is_rented ? (
              <>
                <button
                  onClick={() => openAssignModal(flat)}
                  className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg w-full flex items-center justify-center gap-2"
                >
                  <UserPlus size={16} /> Assign
                </button>

                <button
                  onClick={() => handleDeleteFlat(flat.flat_unique_id)}
                  className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg w-full flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} /> Delete Flat
                </button>
              </>
            ) : (
              <button
                onClick={() => openVacateModal(flat)}
                className="mt-4 bg-yellow-600 text-white px-4 py-2 rounded-lg w-full flex items-center justify-center gap-2"
              >
                <UserMinus size={16} /> Vacate
              </button>
            )}
          </div>
        ))}
      </div>

      {/* ASSIGN MODAL */}
      {showAssignModal && selectedFlat && (
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

            {!assignOtpRequested ? (
              <button
                onClick={requestAssignOtp}
                disabled={isSendingAssignOtp}
                className={`px-4 py-2 rounded w-full ${
                  isSendingAssignOtp
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white'
                }`}
              >
                {isSendingAssignOtp ? 'Sending OTP…' : 'Send OTP'}
              </button>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Enter OTP"
                  value={assignOtp}
                  onChange={(e) => setAssignOtp(e.target.value)}
                  className="w-full border p-2 rounded mb-3"
                />
                <button
                  onClick={confirmAssign}
                  disabled={isAssigning}
                  className={`px-4 py-2 rounded w-full ${
                    isAssigning
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 text-white'
                  }`}
                >
                  {isAssigning ? 'Assigning…' : 'Confirm Assignment'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* VACATE MODAL */}
      {showVacateModal && selectedFlat && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              Vacate Flat – {selectedFlat.title}
            </h2>

            {!vacateOtpRequested ? (
              <button
                onClick={requestVacateOtp}
                disabled={isSendingVacateOtp}
                className={`px-4 py-2 rounded w-full ${
                  isSendingVacateOtp
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white'
                }`}
              >
                {isSendingVacateOtp ? 'Sending OTP…' : 'Send OTP'}
              </button>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Enter OTP"
                  value={vacateOtp}
                  onChange={(e) => setVacateOtp(e.target.value)}
                  className="w-full border p-2 rounded mb-3"
                />
                <button
                  onClick={confirmVacate}
                  disabled={isVacating}
                  className={`px-4 py-2 rounded w-full ${
                    isVacating
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-yellow-600 text-white'
                  }`}
                >
                  {isVacating ? 'Processing…' : 'Confirm Vacate'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
