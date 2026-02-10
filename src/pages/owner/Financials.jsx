import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { financialsAPI, flatsAPI } from '../../api/endpoints';
import toast from 'react-hot-toast';
import { Plus, CheckCircle, Clock, DollarSign } from 'lucide-react';
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
  const [editingExpense, setEditingExpense] = useState(null);

  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [isSavingExpense, setIsSavingExpense] = useState(false);

  const paymentCooldownRef = useRef(false);
  const expenseCooldownRef = useRef(false);

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
    vendor_name: '',
    vendor_contact: '',
    expense_unique_id: '',
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

  // ---------------- PAYMENTS ----------------

  const handleRecordPayment = async () => {
    if (isRecordingPayment || paymentCooldownRef.current) return;

    if (!paymentData.flat_unique_id || !paymentData.amount_paid) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setIsRecordingPayment(true);
      paymentCooldownRef.current = true;

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
    } finally {
      setIsRecordingPayment(false);
      setTimeout(() => {
        paymentCooldownRef.current = false;
      }, 3000);
    }
  };

  const handleVerifyPayment = async (paymentId) => {
    if (verifyingId) return;

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

  // ---------------- EXPENSES ----------------

  const handleSubmitExpense = async () => {
    if (isSavingExpense || expenseCooldownRef.current) return;

    if (!expenseData.expense_type || !expenseData.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setIsSavingExpense(true);
      expenseCooldownRef.current = true;

      if (editingExpense) {
        await financialsAPI.updateServiceExpense({
          expense_unique_id: expenseData.expense_unique_id,
          expense_type: expenseData.expense_type,
          amount: parseFloat(expenseData.amount),
          description: expenseData.description,
          vendor_name: expenseData.vendor_name,
          vendor_contact: expenseData.vendor_contact,
        });
        toast.success('Expense updated successfully');
      } else {
        await financialsAPI.createManualExpense({
          flat_unique_id: expenseData.flat_unique_id,
          expense_type: expenseData.expense_type,
          amount: parseFloat(expenseData.amount),
          description: expenseData.description,
          owner_unique_id: user.unique_id,
        });
        toast.success('Expense recorded successfully');
      }

      setShowExpenseModal(false);
      setEditingExpense(null);
      setExpenseData({
        flat_unique_id: '',
        expense_type: '',
        amount: '',
        description: '',
        vendor_name: '',
        vendor_contact: '',
        expense_unique_id: '',
      });

      fetchFinancialData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save expense');
    } finally {
      setIsSavingExpense(false);
      setTimeout(() => {
        expenseCooldownRef.current = false;
      }, 3000);
    }
  };

  // ---------------- HELPERS ----------------

  const formatMoney = (value) => {
    const num = parseFloat(value);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  const renderStatus = (status) =>
    status === 'Paid' ? (
      <span className="badge-success gap-2">
        <CheckCircle size={14} /> Paid
      </span>
    ) : (
      <span className="badge-warning gap-2">
        <Clock size={14} /> Pending
      </span>
    );

  if (loading) return <Loader />;

  // ---------------- UI ----------------

  return (
    <div className="page overflow-x-hidden">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Finance
          </p>
          <h1 className="page-title">Financial Management</h1>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setShowPaymentModal(true)}
            disabled={isRecordingPayment}
            className="btn-primary disabled:opacity-50"
          >
            <Plus size={18} />
            Record Payment
          </button>

          <button
            onClick={() => {
              setEditingExpense(null);
              setShowExpenseModal(true);
            }}
            disabled={isSavingExpense}
            className="btn-danger disabled:opacity-50"
          >
            <Plus size={18} />
            Add Expense
          </button>
        </div>
      </div>

      {/* SUMMARY */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div className="stat-card border-l-4 border-[var(--md-sys-color-primary)]">
            <div>
              <p className="text-sm text-slate-500">Total Income</p>
              <p className="text-2xl md:text-3xl font-display font-semibold text-[var(--md-sys-color-primary)] mt-1">
                ${formatMoney(summary.summary?.total_income)}
              </p>
            </div>
            <div className="stat-icon icon-secondary">
              <CheckCircle size={20} />
            </div>
          </div>

          <div className="stat-card border-l-4 border-[var(--md-sys-color-error)]">
            <div>
              <p className="text-sm text-slate-500">Total Expenses</p>
              <p className="text-2xl md:text-3xl font-display font-semibold text-[var(--md-sys-color-error)] mt-1">
                ${formatMoney(summary.summary?.total_expenses)}
              </p>
            </div>
            <div className="stat-icon icon-error">
              <Clock size={20} />
            </div>
          </div>

          <div className="stat-card border-l-4 border-[var(--md-sys-color-tertiary)]">
            <div>
              <p className="text-sm text-slate-500">Net Profit</p>
              <p className="text-2xl md:text-3xl font-display font-semibold text-[var(--md-sys-color-tertiary)] mt-1">
                ${formatMoney(summary.summary?.net_profit)}
              </p>
            </div>
            <div className="stat-icon icon-tertiary">
              <DollarSign size={20} />
            </div>
          </div>
        </div>
      )}

      {/* LISTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PAYMENTS */}
        <div className="card">
          <div className="p-4 md:p-6 border-b border-slate-200/60">
            <h2 className="section-title">Recent Payments</h2>
          </div>

          <div className="p-4 md:p-6">
            {payments.length === 0 ? (
              <p className="text-slate-500 text-center py-6">
                No payments recorded yet
              </p>
            ) : (
              payments.slice(0, 5).map((p) => (
                <div
                  key={p.payment_unique_id}
                  className="border-b border-slate-200/60 pb-4 mb-4 flex flex-col sm:flex-row sm:justify-between gap-2"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{p.flat?.title}</p>
                    <p className="text-sm text-slate-500">
                      {p.payment_date?.slice(0, 10)} · {p.payment_method}
                    </p>
                    {renderStatus(p.payment_status)}
                  </div>

                  <div className="sm:text-right">
                    <p className="text-[var(--md-sys-color-primary)] font-semibold text-lg">
                      ${formatMoney(p.amount)}
                    </p>
                    {p.payment_status === 'Pending' && (
                      <button
                        onClick={() =>
                          handleVerifyPayment(p.payment_unique_id)
                        }
                        disabled={verifyingId === p.payment_unique_id}
                        className="btn-secondary mt-2 text-xs px-3 py-1.5 disabled:opacity-50"
                      >
                        {verifyingId === p.payment_unique_id
                          ? 'Verifying…'
                          : 'Verify'}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* EXPENSES */}
        <div className="card">
          <div className="p-4 md:p-6 border-b border-slate-200/60">
            <h2 className="section-title">Recent Expenses</h2>
          </div>

          <div className="p-4 md:p-6">
            {expenses.length === 0 ? (
              <p className="text-slate-500 text-center py-6">
                No expenses recorded yet
              </p>
            ) : (
              expenses.slice(0, 5).map((e) => (
                <div
                  key={e.expense_unique_id}
                  className="border-b border-slate-200/60 pb-3 mb-3 flex flex-col sm:flex-row sm:justify-between gap-2"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{e.expense_type}</p>
                    <p className="text-sm text-slate-500">{e.description}</p>
                    <button
                      onClick={() => {
                        setEditingExpense(e);
                        setExpenseData({
                          flat_unique_id: e.flat_unique_id,
                          expense_type: e.expense_type,
                          amount: e.amount,
                          description: e.description,
                          vendor_name: e.vendor_name || '',
                          vendor_contact: e.vendor_contact || '',
                          expense_unique_id: e.expense_unique_id,
                        });
                        setShowExpenseModal(true);
                      }}
                      className="text-sm text-[var(--md-sys-color-primary)] mt-1 font-semibold"
                    >
                      Edit
                    </button>
                  </div>
                  <p className="text-[var(--md-sys-color-error)] font-semibold">
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
          submitting={isRecordingPayment}
        />
      )}

      {showExpenseModal && (
        <ExpenseModal
          expenseData={expenseData}
          setExpenseData={setExpenseData}
          flats={flats}
          mode={editingExpense ? 'edit' : 'create'}
          onClose={() => {
            setShowExpenseModal(false);
            setEditingExpense(null);
          }}
          onSubmit={handleSubmitExpense}
          submitting={isSavingExpense}
        />
      )}
    </div>
  );
}
