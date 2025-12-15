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
    flat_name: '',
    location: '',
    rent_amount: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.flat_name || !formData.location || !formData.rent_amount) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await flatsAPI.createFlat({
        ...formData,
        owner_unique_id: user.unique_id,
        rent_amount: parseFloat(formData.rent_amount),
      });
      toast.success('Flat created successfully!');
      navigate('/owner/flats');
    } catch (error) {
      console.error('Error creating flat:', error);
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
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Create New Flat</h1>

        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Flat Name
              </label>
              <input
                type="text"
                value={formData.flat_name}
                onChange={(e) => setFormData({ ...formData, flat_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Apartment 101"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 123 Main St, New York"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monthly Rent Amount ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.rent_amount}
                onChange={(e) => setFormData({ ...formData, rent_amount: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1500.00"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Flat'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/owner/flats')}
                className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-400 transition"
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
