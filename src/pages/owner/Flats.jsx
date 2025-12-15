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

  useEffect(() => {
    fetchFlats();
  }, []);

  const fetchFlats = async () => {
    try {
      setLoading(true);
      const res = await flatsAPI.listFlats();

      console.log("API /list-flats:", res.data);

      setFlats(res.data?.flats || []);
    } catch (err) {
      console.error("Error loading flats:", err);
      setFlats([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (flatUniqueId) => {
    if (!confirm('Are you sure you want to delete this flat?')) return;

    try {
      await flatsAPI.deleteFlat(flatUniqueId);
      toast.success('Flat deleted successfully');
      fetchFlats();
    } catch (error) {
      console.error('Error deleting flat:', error);
    }
  };

  const openAssignModal = async (flat) => {
    setSelectedFlat(flat);
    try {
      const response = await tenantsAPI.getAvailableTenants();
      setAvailableTenants(response.data || []);
      setShowAssignModal(true);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    }
  };

  const handleAssignTenant = async () => {
    if (!selectedTenant) return toast.error('Please select a tenant');

    try {
      await flatsAPI.rentFlat({
        flat_unique_id: selectedFlat.flat_unique_id,
        tenant_unique_id: selectedTenant,
      });
      toast.success('Tenant assigned successfully');
      setShowAssignModal(false);
      setSelectedTenant('');
      fetchFlats();
    } catch (error) {
      console.error('Error assigning tenant:', error);
    }
  };

  const handleVacate = async (flatUniqueId) => {
    if (!confirm('Are you sure you want to vacate this flat?')) return;

    try {
      await flatsAPI.vacateFlat(flatUniqueId);
      toast.success('Flat vacated successfully');
      fetchFlats();
    } catch (error) {
      console.error('Error vacating flat:', error);
    }
  };

  if (loading) return <Loader />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Manage Flats</h1>

        <button
          onClick={() => navigate('/owner/create-flat')}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          Create Flat
        </button>
      </div>

      {flats.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Home size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Flats Yet</h3>
          <p className="text-gray-500 mb-6">Create your first flat to get started</p>

          <button
            onClick={() => navigate('/owner/create-flat')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Create Flat
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {flats.map((flat) => (
            <div key={flat.flat_unique_id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">{flat.title}</h3>
                  <p className="text-gray-600">{flat.address}</p>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    flat.is_rented
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {flat.is_rented ? 'Rented' : 'Available'}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <p className="text-gray-700">
                  <span className="font-medium">Rent:</span> ${flat.rent}
                </p>

                {flat.tenant && (
                  <p className="text-gray-700">
                    <span className="font-medium">Tenant:</span> {flat.tenant.username}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                {!flat.is_rented ? (
                  <button
                    onClick={() => openAssignModal(flat)}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                  >
                    <UserPlus size={16} />
                    Assign
                  </button>
                ) : (
                  <button
                    onClick={() => handleVacate(flat.flat_unique_id)}
                    className="flex-1 flex items-center justify-center gap-2 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition"
                  >
                    <UserMinus size={16} />
                    Vacate
                  </button>
                )}

                <button
                  onClick={() => handleDelete(flat.flat_unique_id)}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Assign Tenant to {selectedFlat?.title}
            </h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Tenant
              </label>

              <select
                value={selectedTenant}
                onChange={(e) => setSelectedTenant(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choose a tenant...</option>

                {availableTenants.map((tenant) => (
                  <option key={tenant.unique_id} value={tenant.unique_id}>
                    {tenant.username} ({tenant.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAssignTenant}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Assign
              </button>

              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedTenant('');
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
