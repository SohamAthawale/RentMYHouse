import { useState, useEffect } from 'react';
import { financialsAPI } from '../../api/endpoints';
import { DollarSign, CheckCircle, Clock, Plus } from 'lucide-react';
import Loader from '../../components/Loader';
import toast from 'react-hot-toast';

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showPayModal, setShowPayModal] = useState(false);
  const [payData, setPayData] = useState({
    flat_unique_id: '',
    amount: '',
    payment_method: 'Bank Transfer',
  });

  useEffect(() => {
    fetchPayments();
  }, []);

  // ---------------- FETCH PAYMENTS ----------------

  const fetchPayments = async () => {
    try {
      const response = await financialsAPI.getMyRentPayments();
      const raw = response.data?.payments || [];

      const formatted = raw.map((p) => {
        const dueDate = p.due_date ? new Date(p.due_date) : null;
        const paymentDate = p.payment_date ? new Date(p.payment_date) : null;

        return {
          payment_unique_id: p.payment_unique_id,
          flat_unique_id: p.flat?.flat_unique_id,
          flat_name: p.flat?.title || 'Unknown Flat',
          payment_month: dueDate ? dueDate.getMonth() + 1 : '-',
          payment_year: dueDate ? dueDate.getFullYear() : '-',
          amount_paid: p.amount,
          payment_date: paymentDate,
          status: p.payment_status,
        };
      });

      setPayments(formatted);

      // 🔥 AUTO-FILL FLAT + RENT (Tenant usually has one flat)
      if (formatted.length) {
        setPayData((prev) => ({
          ...prev,
          flat_unique_id: formatted[0].flat_unique_id,
          amount: formatted[0].amount_paid,
        }));
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  // ---------------- PAY RENT ----------------

  const handlePayRent = async () => {
    if (!payData.flat_unique_id || !payData.amount) {
      toast.error('Invalid payment data');
      return;
    }

    try {
      await financialsAPI.recordRentPayment({
        flat_unique_id: payData.flat_unique_id,
        amount: parseFloat(payData.amount),
        payment_method: payData.payment_method,
      });

      toast.success('Payment submitted for verification');
      setShowPayModal(false);
      fetchPayments();
    } catch (error) {
      console.error(error);
      toast.error('Failed to record payment');
    }
  };

  if (loading) return <Loader />;

  // ---------------- HELPERS ----------------

  const renderStatus = (status) =>
    status === 'Paid' ? (
      <span className="flex items-center gap-2 text-green-600">
        <CheckCircle size={16} /> Paid
      </span>
    ) : (
      <span className="flex items-center gap-2 text-yellow-600">
        <Clock size={16} /> Pending Verification
      </span>
    );

  // ---------------- UI ----------------

  return (
    <div>
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          My Rent Payments
        </h1>

        <button
          onClick={() => setShowPayModal(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          <Plus size={18} />
          Pay Rent
        </button>
      </div>

      {/* EMPTY STATE */}
      {payments.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <DollarSign size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">No payments yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs">Flat</th>
                <th className="px-6 py-3 text-left text-xs">Period</th>
                <th className="px-6 py-3 text-left text-xs">Amount</th>
                <th className="px-6 py-3 text-left text-xs">Payment Date</th>
                <th className="px-6 py-3 text-left text-xs">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {payments.map((p) => (
                <tr key={p.payment_unique_id}>
                  <td className="px-6 py-4 text-sm">{p.flat_name}</td>
                  <td className="px-6 py-4 text-sm">
                    {p.payment_month}/{p.payment_year}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-green-600">
                    ₹{Number(p.amount_paid).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {p.payment_date?.toLocaleDateString() || '-'}
                  </td>
                  <td className="px-6 py-4">{renderStatus(p.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* PAY RENT MODAL */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Pay Rent</h2>

            {/* RENT (AUTO-FILLED) */}
            <div className="flex items-center border rounded px-3 mb-3 bg-gray-100">
              <DollarSign size={18} className="text-gray-400" />
              <input
                type="number"
                value={payData.amount}
                readOnly
                className="w-full px-3 py-2 outline-none bg-gray-100 cursor-not-allowed"
              />
            </div>

            {/* PAYMENT METHOD */}
            <select
              value={payData.payment_method}
              onChange={(e) =>
                setPayData({ ...payData, payment_method: e.target.value })
              }
              className="w-full border rounded px-3 py-2 mb-4"
            >
              <option>Bank Transfer</option>
              <option>Check</option>
              <option>Cash</option>
              <option>Credit Card</option>
              <option>PayPal</option>
              <option>Others</option>
            </select>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowPayModal(false)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={handlePayRent}
                className="px-4 py-2 bg-green-600 text-white rounded"
              >
                Submit Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
