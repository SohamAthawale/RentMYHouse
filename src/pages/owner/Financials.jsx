import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { financialsAPI, flatsAPI } from '../../api/endpoints';
import toast from 'react-hot-toast';
import { Plus, CheckCircle, Clock } from 'lucide-react';
import Loader from '../../components/Loader';
import PaymentModal from '../../components/PaymentModal';
import ExpenseModal from '../../components/ExpenseModal';

export default function Financials() {
  const { user } = useAuth();

  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [flats, setFlats] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  const [verifyingId, setVerifyingId] = useState(null);

  const [paymentData, setPaymentData] = useState({
    flat_unique_id: '',
    amount_paid: '',
    payment_method: 'Other',
  });

  const [expenseData, setExpenseData] = useState({
    flat_unique_id: '',
    expense_type: '',
    amount: '',
    description: '',
  });

  useEffect(() => {
    fetchFinancialData();
    fetchFlats();
  }, []);

  // ---------------- FETCH DATA ----------------

  const fetchFinancialData = async () => {
    try {
      const year = new Date().getFullYear();
      const month = new Date().getMonth() + 1;

      const [summaryRes, paymentsRes, expensesRes] = await Promise.all([
        financialsAPI.getFinancialSummary(user.unique_id, year, month),
        financialsAPI.getRentPaymentHistory({ owner_unique_id: user.unique_id }),
        financialsAPI.getExpenseHistory({ owner_unique_id: user.unique_id }),
      ]);

      setSummary(summaryRes.data?.financial_summary || {});
      setPayments(paymentsRes.data?.payments || []);
      setExpenses(expensesRes.data?.expenses || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  const fetchFlats = async () => {
    try {
      const res = await flatsAPI.getOwnerFlats(user.unique_id);
      setFlats(res.data?.flats || []);
    } catch (error) {
      console.error(error);
    }
  };

  // ---------------- ACTIONS ----------------

  const handleRecordPayment = async () => {
    if (!paymentData.flat_unique_id || !paymentData.amount_paid) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      await financialsAPI.ownerRecordRent({
        flat_unique_id: paymentData.flat_unique_id,
        amount: parseFloat(paymentData.amount_paid),
        payment_method: paymentData.payment_method,
      });

      toast.success('Payment recorded successfully');
      setShowPaymentModal(false);
      setPaymentData({
        flat_unique_id: '',
        amount_paid: '',
        payment_method: 'Other',
      });
      fetchFinancialData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to record payment');
    }
  };

  const handleVerifyPayment = async (paymentId) => {
    try {
      setVerifyingId(paymentId);
      await financialsAPI.verifyRentPayment(paymentId);
      toast.success('Payment verified');
      fetchFinancialData();
    } catch (error) {
      console.error(error);
      toast.error('Verification failed');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleCreateExpense = async () => {
    if (!expenseData.flat_unique_id || !expenseData.expense_type || !expenseData.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await financialsAPI.createManualExpense({
        ...expenseData,
        amount: parseFloat(expenseData.amount),
        owner_unique_id: user.unique_id,
      });

      toast.success('Expense recorded successfully');
      setShowExpenseModal(false);
      setExpenseData({
        flat_unique_id: '',
        expense_type: '',
        amount: '',
        description: '',
      });
      fetchFinancialData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to create expense');
    }
  };

  if (loading) return <Loader />;

  const formatMoney = (value) => {
    const num = parseFloat(value);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  const renderStatus = (status) =>
    status === 'Paid' ? (
      <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
        <CheckCircle size={14} /> Paid
      </span>
    ) : (
      <span className="flex items-center gap-1 text-yellow-600 text-sm font-medium">
        <Clock size={14} /> Pending
      </span>
    );

  // ---------------- UI ----------------

  return (
    <div>
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Financial Management</h1>

        <div className="flex gap-3">
          <button
            onClick={() => setShowPaymentModal(true)}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            <Plus size={20} />
            Record Payment
          </button>

          <button
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            <Plus size={20} />
            Add Expense
          </button>
        </div>
      </div>

      {/* SUMMARY */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-500 text-sm">Total Income</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              ${formatMoney(summary.summary?.total_income)}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-500 text-sm">Total Expenses</p>
            <p className="text-3xl font-bold text-red-600 mt-2">
              ${formatMoney(summary.summary?.total_expenses)}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-500 text-sm">Net Profit</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              ${formatMoney(summary.summary?.net_profit)}
            </p>
          </div>
        </div>
      )}

      {/* LISTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PAYMENTS */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Recent Payments</h2>
          </div>

          <div className="p-6">
            {payments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No payments recorded yet</p>
            ) : (
              payments.slice(0, 5).map((p) => (
                <div
                  key={p.payment_unique_id}
                  className="border-b pb-4 mb-4 flex justify-between items-start"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-gray-800">{p.flat?.title}</p>
                    <p className="text-sm text-gray-500">
                      {p.payment_date?.slice(0, 10)} · {p.payment_method}
                    </p>
                    {renderStatus(p.payment_status)}
                  </div>

                  <div className="text-right space-y-2">
                    <p className="text-green-600 font-semibold text-lg">
                      ${formatMoney(p.amount)}
                    </p>

                    {p.payment_status === 'Pending' && (
                      <button
                        onClick={() => handleVerifyPayment(p.payment_unique_id)}
                        disabled={verifyingId === p.payment_unique_id}
                        className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        {verifyingId === p.payment_unique_id ? 'Verifying…' : 'Verify'}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* EXPENSES */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Recent Expenses</h2>
          </div>

          <div className="p-6">
            {expenses.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No expenses recorded yet</p>
            ) : (
              expenses.slice(0, 5).map((e) => (
                <div
                  key={e.expense_unique_id}
                  className="border-b pb-3 mb-3 flex justify-between"
                >
                  <div>
                    <p className="font-medium">{e.expense_type}</p>
                    <p className="text-sm text-gray-500">{e.description}</p>
                  </div>
                  <p className="text-red-600 font-semibold">
                    ${formatMoney(e.amount)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* MODALS */}
      {showPaymentModal && (
        <PaymentModal
          paymentData={paymentData}
          setPaymentData={setPaymentData}
          flats={flats}
          onClose={() => setShowPaymentModal(false)}
          onSubmit={handleRecordPayment}
        />
      )}

      {showExpenseModal && (
        <ExpenseModal
          expenseData={expenseData}
          setExpenseData={setExpenseData}
          flats={flats}
          onClose={() => setShowExpenseModal(false)}
          onSubmit={handleCreateExpense}
        />
      )}
    </div>
  );
}
