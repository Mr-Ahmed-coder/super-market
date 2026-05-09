import { X } from 'lucide-react';

const formatMoney = (value) => Number(value || 0).toFixed(2);
const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '-');
const formatLabel = (value) => String(value || '-').replace(/_/g, ' ');

function PurchaseDetailsModal({ purchase, onClose }) {
  if (!purchase) {
    return null;
  }

  return (
    <div className="modal-backdrop no-print">
      <section className="purchase-details-modal">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Purchase Invoice</p>
            <h2>{purchase.purchaseNumber}</h2>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Close purchase details">
            <X size={18} />
          </button>
        </div>

        <div className="sale-detail-grid">
          <div>
            <span>Supplier</span>
            <strong>{purchase.supplier?.name || '-'}</strong>
          </div>
          <div>
            <span>Date</span>
            <strong>{formatDate(purchase.purchaseDate)}</strong>
          </div>
          <div>
            <span>Payment</span>
            <strong>{formatLabel(purchase.paymentStatus)}</strong>
          </div>
          <div>
            <span>Created By</span>
            <strong>{purchase.createdBy?.name || purchase.createdBy?.email || '-'}</strong>
          </div>
        </div>

        <div className="table-scroll sale-detail-table-wrap">
          <table className="users-table purchase-detail-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Buying Price</th>
                <th>Line Total</th>
              </tr>
            </thead>
            <tbody>
              {purchase.items?.map((item, index) => (
                <tr key={`${item.product || item.productName}-${index}`}>
                  <td>
                    <strong>{item.productName}</strong>
                  </td>
                  <td>{item.quantity}</td>
                  <td>{formatMoney(item.buyingPrice)}</td>
                  <td>{formatMoney(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="sale-detail-summary">
          <div>
            <span>Subtotal</span>
            <strong>{formatMoney(purchase.subtotal)}</strong>
          </div>
          <div>
            <span>Discount</span>
            <strong>{formatMoney(purchase.discount)}</strong>
          </div>
          <div>
            <span>Grand Total</span>
            <strong>{formatMoney(purchase.grandTotal)}</strong>
          </div>
          <div>
            <span>Amount Paid</span>
            <strong>{formatMoney(purchase.amountPaid)}</strong>
          </div>
          <div>
            <span>Balance</span>
            <strong>{formatMoney(purchase.balance)}</strong>
          </div>
        </div>

        {purchase.notes && <p className="purchase-notes">{purchase.notes}</p>}

        <div className="modal-actions">
          <button className="primary-button compact" type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </section>
    </div>
  );
}

export default PurchaseDetailsModal;
