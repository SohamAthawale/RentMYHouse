import { DollarSign } from 'lucide-react';

const PAYMENT_METHODS = [
  'Cash',
  'Check',
  'Bank Transfer',
  'Credit Card',
  'PayPal',
  'Other',
];

export default function PaymentModal({
  paymentData,
  setPaymentData,
  flats,
  onClose,
  onSubmit,
}) {
  const handleFlatChange = (e) => {
    const selectedFlatId = e.target.value;

    const selectedFlat = flats.find(
      (f) => f.flat_unique_id === selectedFlatId
    );

    setPaymentData({
      ...paymentData,
      flat_unique_id: selectedFlatId,
      amount_paid: selectedFlat ? selectedFlat.rent : '',
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h2 className="text-xl font-display font-semibold text-slate-900 mb-4">
          Record Rent Payment
        </h2>

        {/* FLAT */}
        <select
          className="select mb-3"
          value={paymentData.flat_unique_id}
          onChange={handleFlatChange}
        >
          <option value="">Select Flat</option>
          {flats.map((flat) => (
            <option key={flat.flat_unique_id} value={flat.flat_unique_id}>
              {flat.title}
            </option>
          ))}
        </select>

        {/* AMOUNT (AUTO-FILLED) */}
        <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-2.5 mb-3">
          <DollarSign size={18} className="text-slate-400" />
          <input
            type="number"
            className="w-full bg-transparent text-sm text-slate-600 outline-none cursor-not-allowed"
            value={paymentData.amount_paid}
            readOnly
          />
        </div>

        {/* PAYMENT METHOD */}
        <select
          className="select mb-4"
          value={paymentData.payment_method}
          onChange={(e) =>
            setPaymentData({
              ...paymentData,
              payment_method: e.target.value,
            })
          }
        >
          {PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </select>

        {/* ACTIONS */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onSubmit}
            className="btn-primary flex-1"
          >
            Save
          </button>

          <button
            onClick={onClose}
            className="btn-outline flex-1"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
