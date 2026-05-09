import { RotateCcw, X } from 'lucide-react';

const getProductId = (item) => (typeof item.product === 'string' ? item.product : item.product?._id || item.product);

const getRefundedQuantity = (sale, productId) =>
  sale.refundHistory
    ?.filter((refund) => String(refund.product) === String(productId) || String(refund.product?._id) === String(productId))
    .reduce((sum, refund) => sum + Number(refund.quantity || 0), 0) || 0;

function RefundModal({ sale, reason, refundType, quantities, isSubmitting, error, onReasonChange, onTypeChange, onQuantityChange, onClose, onSubmit }) {
  if (!sale) {
    return null;
  }

  return (
    <div className="modal-backdrop no-print">
      <section className="refund-modal">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Refund</p>
            <h2>{sale.saleNumber}</h2>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Close refund modal">
            <X size={18} />
          </button>
        </div>

        {error && <div className="form-error">{error}</div>}

        <form className="refund-form" onSubmit={onSubmit}>
          <div className="refund-type-control">
            <button
              className={refundType === 'full' ? 'active' : ''}
              type="button"
              onClick={() => onTypeChange('full')}
            >
              Full Refund
            </button>
            <button
              className={refundType === 'items' ? 'active' : ''}
              type="button"
              onClick={() => onTypeChange('items')}
            >
              Item Refund
            </button>
          </div>

          {refundType === 'items' && (
            <div className="refund-items-list">
              {sale.items?.map((item) => {
                const productId = getProductId(item);
                const refundedQuantity = getRefundedQuantity(sale, productId);
                const maxQuantity = Math.max(Number(item.quantity || 0) - refundedQuantity, 0);

                return (
                  <label className="refund-item-row" key={String(productId)}>
                    <span>
                      <strong>{item.productName}</strong>
                      <small>Available to refund: {maxQuantity}</small>
                    </span>
                    <input
                      type="number"
                      min="0"
                      max={maxQuantity}
                      value={quantities[productId] || ''}
                      onChange={(event) => onQuantityChange(productId, event.target.value)}
                      disabled={maxQuantity === 0}
                    />
                  </label>
                );
              })}
            </div>
          )}

          <label className="input-group">
            Refund Reason
            <textarea
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              placeholder="Enter refund reason"
              required
            />
          </label>

          <div className="modal-actions">
            <button className="secondary-button" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary-action-button sale-modal-action" type="submit" disabled={isSubmitting}>
              <RotateCcw size={17} />
              <span>{isSubmitting ? 'Processing...' : 'Process Refund'}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default RefundModal;
