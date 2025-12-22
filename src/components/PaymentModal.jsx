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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Record Rent Payment</h2>

        {/* FLAT */}
        <select
          className="w-full border px-4 py-2 rounded mb-3"
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
        <div className="flex items-center border rounded mb-3 px-3 bg-gray-100">
          <DollarSign size={18} className="text-gray-400" />
          <input
            type="number"
            className="w-full px-3 py-2 outline-none bg-gray-100 cursor-not-allowed"
            value={paymentData.amount_paid}
            readOnly
          />
        </div>

        {/* PAYMENT METHOD */}
        <select
          className="w-full border px-4 py-2 rounded mb-4"
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
            className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700"
          >
            Save
          </button>

          <button
            onClick={onClose}
            className="flex-1 bg-gray-300 py-2 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
