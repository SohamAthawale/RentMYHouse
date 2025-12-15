import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { serviceRequestsAPI, flatsAPI } from '../../api/endpoints';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';

export default function CreateRequest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [flat, setFlat] = useState(null);
  const [formData, setFormData] = useState({
    issue_description: '',
    priority: 'Medium',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchFlat();
  }, []);

  const fetchFlat = async () => {
    try {
      const response = await flatsAPI.listFlats();

      // Backend returns { flats: [...] }
      const flats = response.data.flats || [];

      // Transform backend -> UI expected fields
      const formattedFlats = flats.map(f => ({
        flat_unique_id: f.flat_unique_id,
        flat_name: f.title,
        location: f.address,
        rent_amount: f.rent,
        is_rented: f.is_rented,
        tenant_unique_id: f.tenant?.unique_id,
      }));

      // Find the flat assigned to this tenant
      const myFlat = formattedFlats.find(
        f => f.is_rented && f.tenant_unique_id === user.unique_id
      );

      setFlat(myFlat);
    } catch (error) {
      console.error("Error fetching flat:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!flat) {
      toast.error('You must be assigned to a flat to create a request');
      return;
    }

    if (!formData.issue_description.trim()) {
      toast.error('Please describe the issue');
      return;
    }

    setLoading(true);
    try {
      await serviceRequestsAPI.create({
        ...formData,
        flat_unique_id: flat.flat_unique_id,
        tenant_unique_id: user.unique_id,
      });

      toast.success('Service request created successfully!');
      navigate('/tenant/my-requests');
    } catch (error) {
      console.error('Error creating request:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!flat) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Create Service Request</h1>
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600">You must be assigned to a flat to create service requests</p>
          <button
            onClick={() => navigate('/tenant/dashboard')}
            className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => navigate('/tenant/my-requests')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
      >
        <ArrowLeft size={20} />
        Back to Requests
      </button>

      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Create Service Request</h1>

        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Requesting for:</p>
              <p className="text-lg font-semibold text-gray-800">{flat.flat_name}</p>
              <p className="text-sm text-gray-600">{flat.location}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Issue Description
              </label>
              <textarea
                value={formData.issue_description}
                onChange={(e) => setFormData({ ...formData, issue_description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="5"
                placeholder="Describe the issue in detail..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Request'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/tenant/my-requests')}
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
