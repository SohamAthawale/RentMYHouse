import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { flatsAPI } from '../../api/endpoints';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';

export default function CreateFlat() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    address: '',
    rent: '',
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.address || !formData.rent) {
      toast.error('Please fill in all fields');
      return;
    }

    if (user.account_type !== 'Owner') {
      toast.error('Only owners can create flats');
      return;
    }

    setLoading(true);
    try {
      await flatsAPI.createFlat({
        owner_unique_id: user.unique_id,
        title: formData.title,
        address: formData.address,
        rent: Number(formData.rent),
      });

      toast.success('Flat created successfully!');
      navigate('/owner/flats');
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Failed to create flat';
      toast.error(msg);
      console.error('Create flat error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => navigate('/owner/flats')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
      >
        <ArrowLeft size={20} />
        Back to Flats
      </button>

      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Create New Flat
        </h1>

        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Flat Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="Apartment 101"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="123 Main Street"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Monthly Rent
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.rent}
                onChange={(e) =>
                  setFormData({ ...formData, rent: e.target.value })
                }
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="1500"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
              >
                {loading ? 'Creating...' : 'Create Flat'}
              </button>

              <button
                type="button"
                onClick={() => navigate('/owner/flats')}
                className="flex-1 bg-gray-300 py-3 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
