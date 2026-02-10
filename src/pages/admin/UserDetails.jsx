import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminAPI } from '../../api/endpoints';
import { ArrowLeft, User, Mail, Phone, Home, Wrench, DollarSign } from 'lucide-react';
import Loader from '../../components/Loader';

export default function UserDetails() {
  const { uniqueId } = useParams();
  const navigate = useNavigate();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserDetails();
  }, [uniqueId]);

  const fetchUserDetails = async () => {
    try {
      const response = await adminAPI.getUserDetails(uniqueId);
      setDetails(response.data);
    } catch (error) {
      console.error('Error fetching user details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader />;

  if (!details) {
    return (
      <div className="page">
        <h1 className="page-title">User Not Found</h1>
        <button
          onClick={() => navigate('/admin/users')}
          className="btn-ghost w-fit"
        >
          Back to Users
        </button>
      </div>
    );
  }

  const { user, flats, service_requests, payments } = details;

  return (
    <div className="page">
      <button
        onClick={() => navigate('/admin/users')}
        className="btn-ghost w-fit"
      >
        <ArrowLeft size={20} />
        Back to Users
      </button>

      <h1 className="page-title">User Details</h1>

      <div className="card p-6">
        <div className="flex items-start gap-6">
          <div className="p-4 rounded-2xl shadow-soft bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]">
            <User size={40} />
          </div>

          <div className="flex-1">
            <h2 className="text-2xl font-display font-semibold text-slate-900 mb-4">{user.username}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center gap-3">
                <Mail className="text-slate-400" size={20} />
                <div>
                  <p className="text-sm text-slate-500">Email</p>
                  <p className="text-slate-800">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="text-slate-400" size={20} />
                <div>
                  <p className="text-sm text-slate-500">Contact</p>
                  <p className="text-slate-800">{user.contact_no}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <User className="text-slate-400" size={20} />
                <div>
                  <p className="text-sm text-slate-500">Account Type</p>
                  <span className={`badge ${
                    user.account_type === 'Owner' ? 'badge-info' :
                    user.account_type === 'Tenant' ? 'badge-success' :
                    'badge-neutral'
                  }`}>
                    {user.account_type}
                  </span>
                </div>
              </div>

              {user.account_type === 'Tenant' && (
                <div className="flex items-center gap-3">
                  <Home className="text-slate-400" size={20} />
                  <div>
                    <p className="text-sm text-slate-500">Rental Status</p>
                    <span className={`badge ${
                      user.currently_rented ? 'badge-success' : 'badge-neutral'
                    }`}>
                      {user.currently_rented ? 'Rented' : 'Available'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {user.account_type === 'Owner' && flats && flats.length > 0 && (
        <div className="card p-6">
          <h3 className="section-title mb-4 flex items-center gap-2">
            <Home size={20} />
            Flats ({flats.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {flats.map((flat) => (
              <div key={flat.flat_unique_id} className="border border-slate-200/70 rounded-xl p-4">
                <h4 className="font-semibold text-slate-900">{flat.flat_name}</h4>
                <p className="text-sm text-slate-600">{flat.location}</p>
                <div className="mt-2 flex justify-between items-center">
                  <span className="text-slate-700">${flat.rent_amount}/mo</span>
                  <span className={`badge ${
                    flat.is_rented ? 'badge-success' : 'badge-warning'
                  }`}>
                    {flat.is_rented ? 'Rented' : 'Available'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {service_requests && service_requests.length > 0 && (
        <div className="card p-6">
          <h3 className="section-title mb-4 flex items-center gap-2">
            <Wrench size={20} />
            Service Requests ({service_requests.length})
          </h3>
          <div className="space-y-3">
            {service_requests.map((request) => (
              <div key={request.request_unique_id} className="border border-slate-200/70 rounded-xl p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-slate-900">{request.issue_description}</p>
                    <p className="text-sm text-slate-500 mt-1">Flat: {request.flat_name}</p>
                  </div>
                  <span className={`badge ${
                    request.status === 'Completed' ? 'badge-success' :
                    request.status === 'In Progress' ? 'badge-info' :
                    request.status === 'Rejected' ? 'badge-danger' :
                    'badge-warning'
                  }`}>
                    {request.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {payments && payments.length > 0 && (
        <div className="card p-6">
          <h3 className="section-title mb-4 flex items-center gap-2">
            <DollarSign size={20} />
            Payment History ({payments.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3 text-left">Flat</th>
                  <th className="px-4 py-3 text-left">Period</th>
                  <th className="px-4 py-3 text-left">Amount</th>
                  <th className="px-4 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="text-sm text-slate-700">
                {payments.map((payment) => (
                  <tr key={payment.payment_unique_id} className="table-row">
                    <td className="px-4 py-3">{payment.flat_name}</td>
                    <td className="px-4 py-3">
                      {payment.payment_month}/{payment.payment_year}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[var(--md-sys-color-primary)]">
                      ${payment.amount_paid}
                    </td>
                    <td className="px-4 py-3">
                      {new Date(payment.payment_date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
