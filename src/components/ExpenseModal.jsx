export default function ExpenseModal({
  expenseData,
  setExpenseData,
  flats,
  onClose,
  onSubmit,
}) {
  return (
    <div className="modal-backdrop">
      <div className="modal-card">

        <h2 className="text-xl font-display font-semibold text-slate-900 mb-4">
          Add Expense
        </h2>

        {/* FLAT */}
        <select
          className="select mb-3"
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
          className="select mb-3"
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
          className="input mb-3"
          value={expenseData.amount}
          onChange={(e) =>
            setExpenseData({ ...expenseData, amount: e.target.value })
          }
        />

        {/* DESCRIPTION */}
        <textarea
          placeholder="Description"
          className="textarea mb-4"
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
            className="btn-danger flex-1"
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
