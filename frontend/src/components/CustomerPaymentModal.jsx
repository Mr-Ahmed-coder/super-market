import { X } from 'lucide-react';

function CustomerPaymentModal({ customer, formData, error, isSaving, onChange, onClose, onSubmit }) {
  if (!customer) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="user-modal" role="dialog" aria-modal="true" aria-labelledby="customer-payment-title">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Payment</p>
            <h2 id="customer-payment-title">Record Customer Payment</h2>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <p className="muted-copy">
          {customer.name} balance: {Number(customer.currentBalance || 0).toFixed(2)}
        </p>

        {error && <div className="form-error">{error}</div>}

        <form className="user-form" onSubmit={onSubmit}>
          <label className="input-group">
            <span>Amount</span>
            <input type="number" min="0.01" step="0.01" name="amount" value={formData.amount} onChange={onChange} required />
          </label>
          <label className="input-group">
            <span>Payment Method</span>
            <select name="paymentMethod" value={formData.paymentMethod} onChange={onChange}>
              <option value="cash">Cash</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="card">Card</option>
              <option value="bank">Bank</option>
            </select>
          </label>
          <label className="input-group">
            <span>Notes</span>
            <textarea name="notes" value={formData.notes} onChange={onChange} rows="3" />
          </label>

          <div className="modal-actions">
            <button className="secondary-button" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary-button compact" type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Payment'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default CustomerPaymentModal;
