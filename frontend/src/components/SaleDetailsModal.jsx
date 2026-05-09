import { RotateCcw, Printer, X } from 'lucide-react';

const formatMoney = (value) => Number(value || 0).toFixed(2);
const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '-');
const formatLabel = (value) => String(value || '-').replace(/_/g, ' ');

function SaleDetailsModal({ sale, canRefund, onClose, onReprint, onRefund }) {
  if (!sale) {
    return null;
  }

  const cashierName =
    typeof sale.cashier === 'string'
      ? sale.cashier
      : sale.cashier?.name || sale.cashier?.email || 'Cashier';

  return (
    <div className="modal-backdrop no-print">
      <section className="sale-details-modal">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Sale Details</p>
            <h2>{sale.saleNumber}</h2>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Close sale details">
            <X size={18} />
          </button>
        </div>

        <div className="sale-detail-grid">
          <div>
            <span>Cashier</span>
            <strong>{cashierName}</strong>
          </div>
          <div>
            <span>Date</span>
            <strong>{formatDateTime(sale.createdAt)}</strong>
          </div>
          <div>
            <span>Payment</span>
            <strong>{formatLabel(sale.paymentMethod)}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>{formatLabel(sale.saleStatus)}</strong>
          </div>
        </div>

        <div className="table-scroll sale-detail-table-wrap">
          <table className="users-table sale-detail-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Discount</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.items?.map((item, index) => (
                <tr key={`${item.product || item.productName}-${index}`}>
                  <td>
                    <strong>{item.productName}</strong>
                    <span className="table-subtext">{item.barcode || 'No barcode'}</span>
                  </td>
                  <td>{item.quantity}</td>
                  <td>{formatMoney(item.unitPrice)}</td>
                  <td>{formatMoney(item.discount)}</td>
                  <td>{formatMoney(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="sale-detail-summary">
          <div>
            <span>Subtotal</span>
            <strong>{formatMoney(sale.subtotal)}</strong>
          </div>
          <div>
            <span>Discount</span>
            <strong>{formatMoney(sale.discountTotal)}</strong>
          </div>
          <div>
            <span>Tax</span>
            <strong>{formatMoney(sale.taxAmount)}</strong>
          </div>
          <div>
            <span>Grand Total</span>
            <strong>{formatMoney(sale.grandTotal)}</strong>
          </div>
          <div>
            <span>Paid</span>
            <strong>{formatMoney(sale.amountPaid)}</strong>
          </div>
          <div>
            <span>Change</span>
            <strong>{formatMoney(sale.changeAmount)}</strong>
          </div>
          <div>
            <span>Balance</span>
            <strong>{formatMoney(sale.balance)}</strong>
          </div>
        </div>

        {sale.refundHistory?.length > 0 && (
          <section className="refund-history-panel">
            <h3>Refund History</h3>
            {sale.refundHistory.map((refund, index) => (
              <div className="refund-history-row" key={`${refund.product}-${refund.refundedAt}-${index}`}>
                <span>
                  <strong>{refund.productName}</strong>
                  <small>
                    Qty {refund.quantity} - {formatDateTime(refund.refundedAt)}
                  </small>
                </span>
                <span>
                  <strong>{formatMoney(refund.amount)}</strong>
                  <small>{refund.reason}</small>
                </span>
              </div>
            ))}
          </section>
        )}

        <div className="modal-actions">
          {canRefund && sale.saleStatus !== 'refunded' && sale.saleStatus !== 'cancelled' && (
            <button className="secondary-button sale-modal-action" type="button" onClick={() => onRefund(sale)}>
              <RotateCcw size={17} />
              <span>Refund</span>
            </button>
          )}
          <button className="primary-action-button sale-modal-action" type="button" onClick={() => onReprint(sale)}>
            <Printer size={17} />
            <span>Reprint Receipt</span>
          </button>
        </div>
      </section>
    </div>
  );
}

export default SaleDetailsModal;
