import { DollarSign } from 'lucide-react';

export default function PaymentModal({
  paymentData,
  setPaymentData,
  flats,
  onClose,
  onSubmit,
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">

        <h2 className="text-xl font-bold mb-4">Record Rent Payment</h2>

        {/* FLAT */}
        <select
          className="w-full border px-4 py-2 rounded mb-3"
          value={paymentData.flat_unique_id}
          onChange={(e) =>
            setPaymentData({ ...paymentData, flat_unique_id: e.target.value })
          }
        >
          <option value="">Select Flat</option>
          {flats.map((flat) => (
            <option key={flat.flat_unique_id} value={flat.flat_unique_id}>
              {flat.title}
            </option>
          ))}
        </select>

        {/* AMOUNT */}
        <div className="flex items-center border rounded mb-3 px-3">
          <DollarSign size={18} className="text-gray-400" />
          <input
            type="number"
            placeholder="Amount"
            className="w-full px-3 py-2 outline-none"
            value={paymentData.amount_paid}
            onChange={(e) =>
              setPaymentData({ ...paymentData, amount_paid: e.target.value })
            }
          />
        </div>

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
