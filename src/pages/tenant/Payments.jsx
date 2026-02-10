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
      <span className="badge-success gap-2">
        <CheckCircle size={16} /> Paid
      </span>
    ) : (
      <span className="badge-warning gap-2">
        <Clock size={16} /> Pending Verification
      </span>
    );

  // ---------------- UI ----------------

  return (
    <div className="page">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Payments
          </p>
          <h1 className="page-title">My Rent Payments</h1>
        </div>

        <button
          onClick={() => setShowPayModal(true)}
          className="btn-primary"
        >
          <Plus size={18} />
          Pay Rent
        </button>
      </div>

      {/* EMPTY STATE */}
      {payments.length === 0 ? (
        <div className="card p-12 text-center">
          <DollarSign size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">No payments yet</p>
        </div>
      ) : (
        <div className="table-card">
          <table className="min-w-full">
            <thead className="table-head">
              <tr>
                <th className="px-6 py-4 text-left">Flat</th>
                <th className="px-6 py-4 text-left">Period</th>
                <th className="px-6 py-4 text-left">Amount</th>
                <th className="px-6 py-4 text-left">Payment Date</th>
                <th className="px-6 py-4 text-left">Status</th>
              </tr>
            </thead>

            <tbody className="text-sm text-slate-700">
              {payments.map((p) => (
                <tr key={p.payment_unique_id} className="table-row">
                  <td className="px-6 py-4">{p.flat_name}</td>
                  <td className="px-6 py-4">
                    {p.payment_month}/{p.payment_year}
                  </td>
                  <td className="px-6 py-4 font-semibold text-[var(--md-sys-color-primary)]">
                    ₹{Number(p.amount_paid).toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
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
        <div className="modal-backdrop">
          <div className="modal-card">
            <h2 className="text-xl font-display font-semibold text-slate-900 mb-4">Pay Rent</h2>

            {/* RENT (AUTO-FILLED) */}
            <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-2.5 mb-3">
              <DollarSign size={18} className="text-slate-400" />
              <input
                type="number"
                value={payData.amount}
                readOnly
                className="w-full bg-transparent text-sm text-slate-600 outline-none cursor-not-allowed"
              />
            </div>

            {/* PAYMENT METHOD */}
            <select
              value={payData.payment_method}
              onChange={(e) =>
                setPayData({ ...payData, payment_method: e.target.value })
              }
              className="select mb-4"
            >
              <option>Bank Transfer</option>
              <option>Check</option>
              <option>Cash</option>
              <option>Credit Card</option>
              <option>PayPal</option>
              <option>Others</option>
            </select>

            <div className="modal-actions">
              <button
                onClick={() => setShowPayModal(false)}
                className="btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={handlePayRent}
                className="btn-primary"
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
