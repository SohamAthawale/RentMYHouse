import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { financialsAPI } from '../../api/endpoints';
import { DollarSign, CheckCircle } from 'lucide-react';
import Loader from '../../components/Loader';

export default function Payments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const response = await financialsAPI.getRentPaymentHistory({
        tenant_unique_id: user.unique_id
      });

      console.log("PAYMENTS API RESPONSE:", response.data);

      const raw = response.data.payments || [];

      // 🔥 Normalize backend fields → frontend expected structure
      const formatted = raw.map(p => ({
        payment_unique_id: p.payment_unique_id,
        flat_name: p.flat?.title || "Unknown Flat",
        
        // Extract month + year from due_date
        payment_month: p.due_date ? new Date(p.due_date).getMonth() + 1 : "",
        payment_year: p.due_date ? new Date(p.due_date).getFullYear() : "",

        amount_paid: p.amount,
        payment_date: p.payment_date,
      }));

      setPayments(formatted);
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">My Rent Payments</h1>

      {payments.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <DollarSign size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Payments Yet</h3>
          <p className="text-gray-500">Your payment history will appear here</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium">Flat</th>
                <th className="px-6 py-3 text-left text-xs font-medium">Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium">Payment Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium">Status</th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr key={payment.payment_unique_id} className="hover:bg-gray-50">
                  
                  <td className="px-6 py-4 text-sm">{payment.flat_name}</td>

                  <td className="px-6 py-4 text-sm">
                    {payment.payment_month}/{payment.payment_year}
                  </td>

                  <td className="px-6 py-4 text-sm font-semibold text-green-600">
                    ${payment.amount_paid}
                  </td>

                  <td className="px-6 py-4 text-sm">
                    {new Date(payment.payment_date).toLocaleDateString()}
                  </td>

                  <td className="px-6 py-4">
                    <span className="flex items-center gap-2 text-green-600">
                      <CheckCircle size={16} />
                      Paid
                    </span>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
