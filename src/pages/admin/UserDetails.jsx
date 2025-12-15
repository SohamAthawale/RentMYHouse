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
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-6">User Not Found</h1>
        <button
          onClick={() => navigate('/admin/users')}
          className="text-blue-600 hover:text-blue-800"
        >
          Back to Users
        </button>
      </div>
    );
  }

  const { user, flats, service_requests, payments } = details;

  return (
    <div>
      <button
        onClick={() => navigate('/admin/users')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
      >
        <ArrowLeft size={20} />
        Back to Users
      </button>

      <h1 className="text-3xl font-bold text-gray-800 mb-6">User Details</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start gap-6">
          <div className="bg-blue-100 p-4 rounded-lg">
            <User size={48} className="text-blue-600" />
          </div>

          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{user.username}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center gap-3">
                <Mail className="text-gray-400" size={20} />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-gray-800">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="text-gray-400" size={20} />
                <div>
                  <p className="text-sm text-gray-500">Contact</p>
                  <p className="text-gray-800">{user.contact_no}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <User className="text-gray-400" size={20} />
                <div>
                  <p className="text-sm text-gray-500">Account Type</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    user.account_type === 'Owner' ? 'bg-blue-100 text-blue-800' :
                    user.account_type === 'Tenant' ? 'bg-green-100 text-green-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {user.account_type}
                  </span>
                </div>
              </div>

              {user.account_type === 'Tenant' && (
                <div className="flex items-center gap-3">
                  <Home className="text-gray-400" size={20} />
                  <div>
                    <p className="text-sm text-gray-500">Rental Status</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      user.currently_rented ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
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
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Home size={20} />
            Flats ({flats.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {flats.map((flat) => (
              <div key={flat.flat_unique_id} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800">{flat.flat_name}</h4>
                <p className="text-sm text-gray-600">{flat.location}</p>
                <div className="mt-2 flex justify-between items-center">
                  <span className="text-gray-700">${flat.rent_amount}/mo</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    flat.is_rented ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
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
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Wrench size={20} />
            Service Requests ({service_requests.length})
          </h3>
          <div className="space-y-3">
            {service_requests.map((request) => (
              <div key={request.request_unique_id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-800">{request.issue_description}</p>
                    <p className="text-sm text-gray-500 mt-1">Flat: {request.flat_name}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    request.status === 'Completed' ? 'bg-green-100 text-green-800' :
                    request.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                    request.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
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
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <DollarSign size={20} />
            Payment History ({payments.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Flat</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Period</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment.payment_unique_id}>
                    <td className="px-4 py-2 text-sm text-gray-800">{payment.flat_name}</td>
                    <td className="px-4 py-2 text-sm text-gray-800">
                      {payment.payment_month}/{payment.payment_year}
                    </td>
                    <td className="px-4 py-2 text-sm font-semibold text-green-600">
                      ${payment.amount_paid}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-800">
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
