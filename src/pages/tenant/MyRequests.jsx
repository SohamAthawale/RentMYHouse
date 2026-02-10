import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { serviceRequestsAPI } from '../../api/endpoints';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Wrench, Star } from 'lucide-react';
import Loader from '../../components/Loader';

export default function MyRequests() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rating, setRating] = useState(0);
  const [ratingRemarks, setRatingRemarks] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await serviceRequestsAPI.getTenantRequests(user.unique_id);

      console.log("API RESPONSE:", response.data);

      // FIX: backend returns service_requests
      setRequests(response.data.service_requests || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const openRatingModal = (request) => {
    setSelectedRequest(request);
    setRating(0);
    setRatingRemarks('');
    setShowRatingModal(true);
  };

  const handleRateRequest = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    try {
      await serviceRequestsAPI.rate({
        request_unique_id: selectedRequest.request_unique_id,
        rating,
        tenant_notes: ratingRemarks
      });

      toast.success('Rating submitted successfully');
      setShowRatingModal(false);
      fetchRequests();
    } catch (error) {
      console.error('Error rating request:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Open':
        return 'badge-warning';
      case 'In Progress':
        return 'badge-info';
      case 'Completed':
        return 'badge-success';
      case 'Cancelled':
        return 'badge-danger';
      default:
        return 'badge-neutral';
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Maintenance
          </p>
          <h1 className="page-title">My Service Requests</h1>
        </div>

        <button
          onClick={() => navigate('/tenant/create-request')}
          className="btn-primary"
        >
          <Plus size={20} />
          New Request
        </button>
      </div>

      {/* NO Requests */}
      {requests.length === 0 ? (
        <div className="card p-12 text-center">
          <Wrench size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">No Service Requests</h3>
          <p className="text-slate-500 mb-6">Create your first service request</p>
          <button
            onClick={() => navigate('/tenant/create-request')}
            className="btn-primary"
          >
            Create Request
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.request_unique_id} className="card-hover p-6">

              {/* Title + Status */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{req.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Flat: {req.flat?.title}
                  </p>
                </div>

                <span className={`badge ${getStatusColor(req.status)}`}>
                  {req.status}
                </span>
              </div>

              {/* Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm text-slate-500">Priority</p>
                  <span
                    className={`badge mt-1 ${
                      req.priority === "High"
                        ? "badge-danger"
                        : req.priority === "Medium"
                        ? "badge-warning"
                        : "badge-success"
                    }`}
                  >
                    {req.priority}
                  </span>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Requested At</p>
                  <p className="text-slate-800 mt-1">
                    {new Date(req.requested_at).toLocaleDateString()}
                  </p>
                </div>

                {req.tenant_rating && (
                  <div>
                    <p className="text-sm text-slate-500">Your Rating</p>
                    <div className="flex items-center gap-1 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={16}
                          className={
                            i < req.tenant_rating
                              ? "text-yellow-400 fill-current"
                              : "text-gray-300"
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Owner Notes */}
              {req.owner_notes && (
                <div className="bg-slate-50 rounded-xl p-3 mb-4">
                  <p className="text-sm text-slate-500">Owner Notes</p>
                  <p className="text-slate-800 mt-1">{req.owner_notes}</p>
                </div>
              )}

              {/* Rating Button */}
              {req.status === "Completed" && !req.tenant_rating && (
                <button
                  onClick={() => openRatingModal(req)}
                  className="btn-outline text-[var(--md-sys-color-tertiary)]"
                >
                  <Star size={16} />
                  Rate Service
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h2 className="text-2xl font-display font-semibold text-slate-900 mb-4">Rate Service</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="focus:outline-none"
                    >
                      <Star
                        size={32}
                        className={star <= rating ? 'text-[var(--md-sys-color-tertiary)] fill-current' : 'text-slate-300'}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Comments</label>
                <textarea
                  value={ratingRemarks}
                  onChange={(e) => setRatingRemarks(e.target.value)}
                  className="textarea"
                  rows="3"
                  placeholder="Share your feedback..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleRateRequest}
                className="btn-primary flex-1"
              >
                Submit Rating
              </button>

              <button
                onClick={() => setShowRatingModal(false)}
                className="btn-outline flex-1"
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
