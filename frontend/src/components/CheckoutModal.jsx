import { CreditCard, X } from 'lucide-react';

const paymentMethods = [
  { value: 'cash', label: 'Cash' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'card', label: 'Card' },
  { value: 'bank', label: 'Bank' }
];

function CheckoutModal({
  totals,
  amountPaid,
  paymentMethod,
  isSubmitting,
  error,
  onAmountPaidChange,
  onPaymentMethodChange,
  onClose,
  onSubmit
}) {
  return (
    <div className="modal-backdrop no-print">
      <section className="checkout-modal">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Payment</p>
            <h2>Checkout</h2>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Close checkout">
            <X size={18} />
          </button>
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="checkout-total-band">
          <span>Grand Total</span>
          <strong>{totals.grandTotal.toFixed(2)}</strong>
        </div>

        <form className="checkout-form" onSubmit={onSubmit}>
          <label className="input-group">
            Payment Method
            <select value={paymentMethod} onChange={(event) => onPaymentMethodChange(event.target.value)}>
              {paymentMethods.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </label>

          <label className="input-group">
            Amount Paid
            <input
              type="number"
              min="0"
              step="0.01"
              value={amountPaid}
              onChange={(event) => onAmountPaidChange(event.target.value)}
              autoFocus
            />
          </label>

          <div className="checkout-breakdown">
            <div>
              <span>Subtotal</span>
              <strong>{totals.subtotal.toFixed(2)}</strong>
            </div>
            <div>
              <span>Discount</span>
              <strong>{totals.discountTotal.toFixed(2)}</strong>
            </div>
            <div>
              <span>Tax</span>
              <strong>{totals.taxAmount.toFixed(2)}</strong>
            </div>
            <div>
              <span>Amount Paid</span>
              <strong>{totals.amountPaid.toFixed(2)}</strong>
            </div>
            <div>
              <span>Change</span>
              <strong>{totals.changeAmount.toFixed(2)}</strong>
            </div>
            <div>
              <span>Balance</span>
              <strong>{totals.balance.toFixed(2)}</strong>
            </div>
          </div>

          <div className="modal-actions">
            <button className="secondary-button" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary-action-button checkout-submit" type="submit" disabled={isSubmitting}>
              <CreditCard size={18} />
              <span>{isSubmitting ? 'Submitting...' : 'Submit Sale'}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default CheckoutModal;
