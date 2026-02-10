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
    status: '',
    owner_notes: '',
    actual_cost: '',
    contractor_name: '',
    contractor_contact: '',
  });

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await serviceRequestsAPI.getOwnerRequests(user.unique_id);
      setRequests(response.data?.service_requests || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const openUpdateModal = (request) => {
    setSelectedRequest(request);
    setUpdateData({
      status: request.status,
      owner_notes: request.owner_notes || '',
      actual_cost: request.actual_cost || '',
      contractor_name: request.contractor_name || '',
      contractor_contact: request.contractor_contact || '',
    });
    setShowUpdateModal(true);
  };

  // 🔥 FIXED UPDATE HANDLER
  const handleUpdate = async () => {
    if (
      updateData.status === 'Completed' &&
      (!updateData.actual_cost || Number(updateData.actual_cost) <= 0)
    ) {
      toast.error('Actual cost is required to complete the request');
      return;
    }

    try {
      await serviceRequestsAPI.update({
        request_unique_id: selectedRequest.request_unique_id,
        status: updateData.status,
        owner_notes: updateData.owner_notes,
        actual_cost:
          updateData.status === 'Completed'
            ? Number(updateData.actual_cost)
            : undefined,
        contractor_name:
          updateData.status === 'Completed'
            ? updateData.contractor_name
            : undefined,
        contractor_contact:
          updateData.status === 'Completed'
            ? updateData.contractor_contact
            : undefined,
      });

      toast.success('Request updated successfully');
      setShowUpdateModal(false);
      fetchRequests();
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error(
        error.response?.data?.message || 'Failed to update request'
      );
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Open':
        return <Clock className="text-[var(--md-sys-color-tertiary)]" size={20} />;
      case 'In Progress':
        return <Wrench className="text-[var(--md-sys-color-primary)]" size={20} />;
      case 'Completed':
        return <CheckCircle className="text-[var(--md-sys-color-primary)]" size={20} />;
      case 'Cancelled':
        return <XCircle className="text-[var(--md-sys-color-error)]" size={20} />;
      default:
        return null;
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
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
          Operations
        </p>
        <h1 className="page-title">Service Requests</h1>
      </div>

      {requests.length === 0 ? (
        <div className="card p-12 text-center">
          <Wrench size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">
            No Service Requests
          </h3>
          <p className="text-slate-500">
            All service requests will appear here
          </p>
        </div>
      ) : (
        <div className="table-card">
          <table className="min-w-full">
            <thead className="table-head">
              <tr>
                <th className="px-6 py-4 text-left">Flat</th>
                <th className="px-6 py-4 text-left">Tenant</th>
                <th className="px-6 py-4 text-left">Issue</th>
                <th className="px-6 py-4 text-left">Priority</th>
                <th className="px-6 py-4 text-left">Status</th>
                <th className="px-6 py-4 text-left">Actions</th>
              </tr>
            </thead>

            <tbody className="text-sm text-slate-700">
              {requests.map((req) => (
                <tr key={req.request_unique_id} className="table-row">
                  <td className="px-6 py-4">{req.flat_title}</td>
                  <td className="px-6 py-4">{req.tenant_name}</td>
                  <td className="px-6 py-4">{req.title}</td>
                  <td className="px-6 py-4">{req.priority}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(req.status)}
                      <span
                        className={`badge ${getStatusColor(req.status)}`}
                      >
                        {req.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => openUpdateModal(req)}
                      className="text-[var(--md-sys-color-primary)] font-semibold"
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
        <div className="modal-backdrop">
          <div className="modal-card">
            <h2 className="text-2xl font-display font-semibold text-slate-900 mb-4">
              Update Service Request
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                <select
                  value={updateData.status}
                  onChange={(e) =>
                    setUpdateData({ ...updateData, status: e.target.value })
                  }
                  className="select"
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              {updateData.status === 'Completed' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Actual Cost (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={updateData.actual_cost}
                      onChange={(e) =>
                        setUpdateData({
                          ...updateData,
                          actual_cost: e.target.value,
                        })
                      }
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Contractor Name
                    </label>
                    <input
                      type="text"
                      value={updateData.contractor_name}
                      onChange={(e) =>
                        setUpdateData({
                          ...updateData,
                          contractor_name: e.target.value,
                        })
                      }
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Contractor Contact
                    </label>
                    <input
                      type="text"
                      value={updateData.contractor_contact}
                      onChange={(e) =>
                        setUpdateData({
                          ...updateData,
                          contractor_contact: e.target.value,
                        })
                      }
                      className="input"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Owner Notes
                </label>
                <textarea
                  rows={3}
                  value={updateData.owner_notes}
                  onChange={(e) =>
                    setUpdateData({
                      ...updateData,
                      owner_notes: e.target.value,
                    })
                  }
                  className="textarea"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleUpdate}
                className="btn-primary flex-1"
              >
                Update
              </button>
              <button
                onClick={() => setShowUpdateModal(false)}
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
