import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { serviceRequestsAPI } from '../../api/endpoints';
import toast from 'react-hot-toast';
import { Wrench, CheckCircle, Clock, XCircle } from 'lucide-react';
import Loader from '../../components/Loader';

export default function ServiceRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateData, setUpdateData] = useState({
    status: "",
    owner_notes: "",
  });

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await serviceRequestsAPI.getOwnerRequests(user.unique_id);

      const items = response.data?.service_requests || [];
      setRequests(items);
    } catch (error) {
      console.error("Error fetching requests:", error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const openUpdateModal = (request) => {
    setSelectedRequest(request);
    setUpdateData({
      status: request.status,
      owner_notes: request.owner_notes || "",
    });
    setShowUpdateModal(true);
  };

  const handleUpdate = async () => {
    try {
      await serviceRequestsAPI.update({
        request_unique_id: selectedRequest.request_unique_id,
        status: updateData.status,
        owner_notes: updateData.owner_notes,
      });

      toast.success("Request updated successfully");
      setShowUpdateModal(false);
      fetchRequests();
    } catch (error) {
      console.error("Error updating request:", error);
      toast.error("Failed to update request");
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Open":
      case "Pending":
        return <Clock className="text-yellow-500" size={20} />;
      case "In Progress":
        return <Wrench className="text-blue-500" size={20} />;
      case "Completed":
        return <CheckCircle className="text-green-500" size={20} />;
      case "Cancelled":
      case "Rejected":
        return <XCircle className="text-red-500" size={20} />;
      default:
        return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Open":
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "In Progress":
        return "bg-blue-100 text-blue-800";
      case "Completed":
        return "bg-green-100 text-green-800";
      case "Cancelled":
      case "Rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) return <Loader />;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Service Requests</h1>

      {requests.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Wrench size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Service Requests</h3>
          <p className="text-gray-500">All service requests will appear here</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium">Flat</th>
                <th className="px-6 py-3 text-left text-xs font-medium">Tenant</th>
                <th className="px-6 py-3 text-left text-xs font-medium">Issue</th>
                <th className="px-6 py-3 text-left text-xs font-medium">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium">Actions</th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {requests.map((req) => (
                <tr key={req.request_unique_id} className="hover:bg-gray-50">

                  <td className="px-6 py-4 text-sm">{req.flat?.title}</td>

                  <td className="px-6 py-4 text-sm">{req.tenant?.username}</td>

                  <td className="px-6 py-4 text-sm">{req.description}</td>

                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      req.priority === "High"
                        ? "bg-red-100 text-red-800"
                        : req.priority === "Medium"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-800"
                    }`}>
                      {req.priority}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(req.status)}
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(req.status)}`}>
                        {req.status}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => openUpdateModal(req)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Update
                    </button>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showUpdateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Update Service Request</h2>

            <div className="space-y-4">

              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select
                  value={updateData.status}
                  onChange={(e) => setUpdateData({ ...updateData, status: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Owner Notes</label>
                <textarea
                  value={updateData.owner_notes}
                  onChange={(e) => setUpdateData({ ...updateData, owner_notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleUpdate}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                Update
              </button>

              <button
                onClick={() => setShowUpdateModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
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
