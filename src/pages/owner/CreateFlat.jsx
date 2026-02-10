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
    bedrooms: '',
    bathrooms: '',
    area_sqft: '',
    furnishing: '',
    property_type: '',
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.address || !formData.rent) {
      toast.error('Title, address and rent are required');
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

        // 🔹 ML-ready fields
        bedrooms: formData.bedrooms ? Number(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? Number(formData.bathrooms) : null,
        area_sqft: formData.area_sqft ? Number(formData.area_sqft) : null,
        furnishing: formData.furnishing || null,
        property_type: formData.property_type || null,
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
    <div className="page">
      <button
        onClick={() => navigate('/owner/flats')}
        className="btn-ghost w-fit"
      >
        <ArrowLeft size={20} />
        Back to Flats
      </button>

      <div className="max-w-2xl">
        <h1 className="page-title mb-6">Create New Flat</h1>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Flat Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="input"
                placeholder="Apartment 101"
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                className="input"
                placeholder="101 Vasudev Apartment, Malad West"
              />
            </div>

            {/* Rent */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Monthly Rent
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.rent}
                onChange={(e) =>
                  setFormData({ ...formData, rent: e.target.value })
                }
                className="input"
                placeholder="65000"
              />
            </div>

            {/* Bedrooms & Bathrooms */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Bedrooms
                </label>
                <input
                  type="number"
                  value={formData.bedrooms}
                  onChange={(e) =>
                    setFormData({ ...formData, bedrooms: e.target.value })
                  }
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Bathrooms
                </label>
                <input
                  type="number"
                  value={formData.bathrooms}
                  onChange={(e) =>
                    setFormData({ ...formData, bathrooms: e.target.value })
                  }
                  className="input"
                />
              </div>
            </div>

            {/* Area */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Area (sqft)
              </label>
              <input
                type="number"
                value={formData.area_sqft}
                onChange={(e) =>
                  setFormData({ ...formData, area_sqft: e.target.value })
                }
                className="input"
              />
            </div>

            {/* Furnishing & Property Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Furnishing
                </label>
                <select
                  value={formData.furnishing}
                  onChange={(e) =>
                    setFormData({ ...formData, furnishing: e.target.value })
                  }
                  className="select"
                >
                  <option value="">Select</option>
                  <option value="Unfurnished">Unfurnished</option>
                  <option value="Semi-Furnished">Semi-Furnished</option>
                  <option value="Fully Furnished">Fully Furnished</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Property Type
                </label>
                <select
                  value={formData.property_type}
                  onChange={(e) =>
                    setFormData({ ...formData, property_type: e.target.value })
                  }
                  className="select"
                >
                  <option value="">Select</option>
                  <option value="Apartment">Apartment</option>
                  <option value="Villa">Villa</option>
                  <option value="Independent House">
                    Independent House
                  </option>
                </select>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex-1"
              >
                {loading ? 'Creating...' : 'Create Flat'}
              </button>

              <button
                type="button"
                onClick={() => navigate('/owner/flats')}
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
