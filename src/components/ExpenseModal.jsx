export default function ExpenseModal({
  expenseData,
  setExpenseData,
  flats,
  onClose,
  onSubmit,
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">

        <h2 className="text-xl font-bold mb-4">Add Expense</h2>

        {/* FLAT */}
        <select
          className="w-full border px-4 py-2 rounded mb-3"
          value={expenseData.flat_unique_id}
          onChange={(e) =>
            setExpenseData({ ...expenseData, flat_unique_id: e.target.value })
          }
        >
          <option value="">Select Flat</option>
          {flats.map((flat) => (
            <option key={flat.flat_unique_id} value={flat.flat_unique_id}>
              {flat.title}
            </option>
          ))}
        </select>

        {/* TYPE */}
        <select
          className="w-full border px-4 py-2 rounded mb-3"
          value={expenseData.expense_type}
          onChange={(e) =>
            setExpenseData({ ...expenseData, expense_type: e.target.value })
          }
        >
          <option value="">Expense Type</option>
          <option value="Maintenance">Maintenance</option>
          <option value="Repair">Repair</option>
          <option value="Upgrade">Upgrade</option>
          <option value="Emergency">Emergency</option>
          <option value="Materials">Materials</option>
          <option value="Labor">Labor</option>
        </select>

        {/* AMOUNT */}
        <input
          type="number"
          placeholder="Amount"
          className="w-full border px-4 py-2 rounded mb-3"
          value={expenseData.amount}
          onChange={(e) =>
            setExpenseData({ ...expenseData, amount: e.target.value })
          }
        />

        {/* DESCRIPTION */}
        <textarea
          placeholder="Description"
          className="w-full border px-4 py-2 rounded mb-4"
          rows="3"
          value={expenseData.description}
          onChange={(e) =>
            setExpenseData({ ...expenseData, description: e.target.value })
          }
        />

        {/* ACTIONS */}
        <div className="flex gap-3">
          <button
            onClick={onSubmit}
            className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700"
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
