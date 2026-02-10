import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { serviceRequestsAPI, flatsAPI } from '../../api/endpoints';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';

const CATEGORIES = [
  'Plumbing',
  'Electrical',
  'HVAC',
  'Appliances',
  'General Maintenance',
  'Emergency',
];

export default function CreateRequest() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [flat, setFlat] = useState(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'General Maintenance',
    priority: 'Medium',
  });

  useEffect(() => {
    fetchFlat();
  }, []);

  const fetchFlat = async () => {
    try {
      const response = await flatsAPI.listFlats();
      const flats = response.data.flats || [];

      const myFlat = flats.find(
        f => f.is_rented && f.tenant?.unique_id === user.unique_id
      );

      setFlat(myFlat || null);
    } catch (error) {
      console.error('Error fetching flat:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!flat) {
      toast.error('You must be assigned to a flat');
      return;
    }

    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Please describe the issue');
      return;
    }

    setLoading(true);
    try {
      await serviceRequestsAPI.create({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        flat_unique_id: flat.flat_unique_id,
        tenant_unique_id: user.unique_id,
      });

      toast.success('Service request created successfully');
      navigate('/tenant/my-requests');
    } catch (error) {
      console.error('Create request error:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  if (!flat) {
    return (
      <div className="card p-12 text-center">
        <p className="text-slate-600">
          You must be assigned to a flat to create service requests
        </p>
        <button
          onClick={() => navigate('/tenant/dashboard')}
          className="btn-primary mt-6"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      <button
        onClick={() => navigate('/tenant/my-requests')}
        className="btn-ghost w-fit"
      >
        <ArrowLeft size={20} />
        Back to Requests
      </button>

      <div className="max-w-2xl">
        <h1 className="page-title mb-6">Create Service Request</h1>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Flat Info */}
            <div className="bg-slate-50 p-4 rounded-xl">
              <p className="text-sm text-slate-600">Requesting for</p>
              <p className="text-lg font-semibold text-slate-900">{flat.title}</p>
              <p className="text-sm text-slate-600">{flat.address}</p>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
              <input
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="input"
                placeholder="e.g. Kitchen sink leakage"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Issue Description
              </label>
              <textarea
                value={formData.description}
                onChange={e =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="textarea"
                rows="5"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
              <select
                value={formData.category}
                onChange={e =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="select"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Priority</label>
              <select
                value={formData.priority}
                onChange={e =>
                  setFormData({ ...formData, priority: e.target.value })
                }
                className="select"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Request'}
              </button>

              <button
                type="button"
                onClick={() => navigate('/tenant/my-requests')}
                className="btn-outline flex-1"
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
