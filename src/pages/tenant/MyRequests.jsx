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
        return 'bg-yellow-100 text-yellow-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'Cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) return <Loader />;

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">My Service Requests</h1>

        <button
          onClick={() => navigate('/tenant/create-request')}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          New Request
        </button>
      </div>

      {/* NO Requests */}
      {requests.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Wrench size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Service Requests</h3>
          <p className="text-gray-500 mb-6">Create your first service request</p>
          <button
            onClick={() => navigate('/tenant/create-request')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Create Request
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.request_unique_id} className="bg-white rounded-lg shadow p-6">

              {/* Title + Status */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{req.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Flat: {req.flat?.title}
                  </p>
                </div>

                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(req.status)}`}>
                  {req.status}
                </span>
              </div>

              {/* Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Priority</p>
                  <span
                    className={`inline-block px-2 py-1 mt-1 text-xs font-medium rounded-full ${
                      req.priority === "High"
                        ? "bg-red-100 text-red-800"
                        : req.priority === "Medium"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {req.priority}
                  </span>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Requested At</p>
                  <p className="text-gray-800 mt-1">
                    {new Date(req.requested_at).toLocaleDateString()}
                  </p>
                </div>

                {req.tenant_rating && (
                  <div>
                    <p className="text-sm text-gray-500">Your Rating</p>
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
                <div className="bg-gray-50 rounded p-3 mb-4">
                  <p className="text-sm text-gray-500">Owner Notes</p>
                  <p className="text-gray-800 mt-1">{req.owner_notes}</p>
                </div>
              )}

              {/* Rating Button */}
              {req.status === "Completed" && !req.tenant_rating && (
                <button
                  onClick={() => openRatingModal(req)}
                  className="flex items-center gap-2 bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Rate Service</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="focus:outline-none"
                    >
                      <Star
                        size={32}
                        className={star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Comments</label>
                <textarea
                  value={ratingRemarks}
                  onChange={(e) => setRatingRemarks(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  placeholder="Share your feedback..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleRateRequest}
                className="flex-1 bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition"
              >
                Submit Rating
              </button>

              <button
                onClick={() => setShowRatingModal(false)}
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
