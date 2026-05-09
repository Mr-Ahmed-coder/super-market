import { Plus, Trash2, X } from 'lucide-react';

const formatMoney = (value) => Number(value || 0).toFixed(2);

function PurchaseModal({
  mode,
  formData,
  suppliers,
  products,
  totals,
  error,
  isSaving,
  onChange,
  onItemChange,
  onAddItem,
  onRemoveItem,
  onClose,
  onSubmit
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="purchase-modal" role="dialog" aria-modal="true" aria-labelledby="purchase-modal-title">
        <div className="modal-header">
          <div>
            <p className="eyebrow">{mode === 'add' ? 'Create' : 'Edit'}</p>
            <h2 id="purchase-modal-title">{mode === 'add' ? 'Add Purchase Invoice' : 'Edit Purchase Invoice'}</h2>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {error && <div className="form-error">{error}</div>}

        <form className="purchase-form" onSubmit={onSubmit}>
          <div className="form-grid-two">
            <label className="input-group">
              <span>Supplier</span>
              <select name="supplier" value={formData.supplier} onChange={onChange} required>
                <option value="">Select supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier._id} value={supplier._id}>
                    {supplier.name} {supplier.companyName ? `- ${supplier.companyName}` : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="input-group">
              <span>Purchase Date</span>
              <input type="date" name="purchaseDate" value={formData.purchaseDate} onChange={onChange} />
            </label>
          </div>

          <div className="purchase-items-panel">
            <div className="purchase-items-header">
              <h3>Items</h3>
              <button className="secondary-button purchase-add-row" type="button" onClick={onAddItem}>
                <Plus size={16} />
                <span>Add Row</span>
              </button>
            </div>

            {formData.items.map((item, index) => (
              <div className="purchase-item-row" key={index}>
                <label className="input-group">
                  <span>Product</span>
                  <select value={item.product} onChange={(event) => onItemChange(index, 'product', event.target.value)} required>
                    <option value="">Select product</option>
                    {products.map((product) => (
                      <option key={product._id} value={product._id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="input-group">
                  <span>Qty</span>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(event) => onItemChange(index, 'quantity', event.target.value)}
                    required
                  />
                </label>
                <label className="input-group">
                  <span>Buying Price</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.buyingPrice}
                    onChange={(event) => onItemChange(index, 'buyingPrice', event.target.value)}
                    required
                  />
                </label>
                <div className="purchase-line-total">
                  <span>Total</span>
                  <strong>{formatMoney(Number(item.quantity || 0) * Number(item.buyingPrice || 0))}</strong>
                </div>
                <button
                  className="table-icon-button danger"
                  type="button"
                  onClick={() => onRemoveItem(index)}
                  disabled={formData.items.length === 1}
                  title="Remove row"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="form-grid-two">
            <label className="input-group">
              <span>Discount</span>
              <input type="number" min="0" step="0.01" name="discount" value={formData.discount} onChange={onChange} />
            </label>
            <label className="input-group">
              <span>Amount Paid</span>
              <input type="number" min="0" step="0.01" name="amountPaid" value={formData.amountPaid} onChange={onChange} />
            </label>
          </div>

          <label className="input-group">
            <span>Notes</span>
            <textarea name="notes" value={formData.notes} onChange={onChange} rows="3" />
          </label>

          <div className="purchase-summary">
            <div>
              <span>Subtotal</span>
              <strong>{formatMoney(totals.subtotal)}</strong>
            </div>
            <div>
              <span>Grand Total</span>
              <strong>{formatMoney(totals.grandTotal)}</strong>
            </div>
            <div>
              <span>Amount Paid</span>
              <strong>{formatMoney(totals.amountPaid)}</strong>
            </div>
            <div>
              <span>Balance</span>
              <strong>{formatMoney(totals.balance)}</strong>
            </div>
          </div>

          <div className="modal-actions">
            <button className="secondary-button" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary-button compact" type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Purchase'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default PurchaseModal;
