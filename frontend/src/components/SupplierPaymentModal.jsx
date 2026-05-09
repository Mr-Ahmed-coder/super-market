import { X } from 'lucide-react';

const formatMoney = (value) => Number(value || 0).toFixed(2);

function SupplierPaymentModal({
  supplier,
  suppliers,
  purchases,
  formData,
  error,
  isSaving,
  onChange,
  onClose,
  onSubmit
}) {
  const selectedSupplier = supplier || suppliers.find((item) => item._id === formData.supplier);
  const supplierPurchases = purchases.filter((purchase) => {
    const purchaseSupplierId = purchase.supplier?._id || purchase.supplier;
    return formData.supplier && purchaseSupplierId === formData.supplier && Number(purchase.balance || 0) > 0;
  });

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="supplier-payment-modal" role="dialog" aria-modal="true" aria-labelledby="supplier-payment-title">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Payment</p>
            <h2 id="supplier-payment-title">Record Supplier Payment</h2>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {selectedSupplier && (
          <p className="muted-copy">
            {selectedSupplier.name} balance: {formatMoney(selectedSupplier.currentBalance)}
          </p>
        )}

        {error && <div className="form-error">{error}</div>}

        <form className="user-form" onSubmit={onSubmit}>
          <label className="input-group">
            <span>Supplier</span>
            <select name="supplier" value={formData.supplier} onChange={onChange} disabled={Boolean(supplier)} required>
              <option value="">Select supplier</option>
              {suppliers.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.name} {item.companyName ? `- ${item.companyName}` : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="input-group">
            <span>Purchase Invoice</span>
            <select name="purchase" value={formData.purchase} onChange={onChange}>
              <option value="">General supplier balance</option>
              {supplierPurchases.map((purchase) => (
                <option key={purchase._id} value={purchase._id}>
                  {purchase.purchaseNumber} - Balance {formatMoney(purchase.balance)}
                </option>
              ))}
            </select>
          </label>

          <div className="form-grid-two">
            <label className="input-group">
              <span>Amount</span>
              <input type="number" min="0.01" step="0.01" name="amount" value={formData.amount} onChange={onChange} required />
            </label>
            <label className="input-group">
              <span>Payment Method</span>
              <select name="paymentMethod" value={formData.paymentMethod} onChange={onChange}>
                <option value="cash">Cash</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="bank">Bank</option>
                <option value="card">Card</option>
              </select>
            </label>
          </div>

          <label className="input-group">
            <span>Reference</span>
            <input name="reference" value={formData.reference} onChange={onChange} />
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

export default SupplierPaymentModal;
