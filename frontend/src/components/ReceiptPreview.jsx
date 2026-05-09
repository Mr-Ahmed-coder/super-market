import { Printer, X } from 'lucide-react';

const formatMoney = (value) => Number(value || 0).toFixed(2);

const formatPaymentMethod = (method) =>
  String(method || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatDateTime = (value) => {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString();
};

function ReceiptPreview({ sale, settings, onClose }) {
  if (!sale) {
    return null;
  }

  const cashierName =
    typeof sale.cashier === 'string'
      ? sale.cashier
      : sale.cashier?.name || sale.cashier?.email || 'Cashier';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop receipt-preview-backdrop">
      <section className="receipt-preview-modal">
        <div className="modal-header receipt-preview-header">
          <div>
            <p className="eyebrow">Receipt</p>
            <h2>Receipt Preview</h2>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Close receipt preview">
            <X size={18} />
          </button>
        </div>

        <div className="receipt-preview-scroll">
          <article className="receipt-print-area" aria-label="Printable sale receipt">
            <header className="receipt-store-header">
              {settings?.logo && (
                <img className="receipt-logo" src={settings.logo} alt={settings.supermarketName || 'Store logo'} />
              )}
              <h1>{settings?.supermarketName || 'Supermarket'}</h1>
              {settings?.address && <p>{settings.address}</p>}
              {settings?.phone && <p>Tel: {settings.phone}</p>}
            </header>

            <div className="receipt-divider" />

            <section className="receipt-meta">
              <div>
                <span>Receipt:</span>
                <strong>{sale.saleNumber}</strong>
              </div>
              <div>
                <span>Cashier:</span>
                <strong>{cashierName}</strong>
              </div>
              <div>
                <span>Date:</span>
                <strong>{formatDateTime(sale.createdAt)}</strong>
              </div>
              <div>
                <span>Payment:</span>
                <strong>{formatPaymentMethod(sale.paymentMethod)}</strong>
              </div>
            </section>

            <div className="receipt-divider" />

            <table className="receipt-items">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {sale.items?.map((item, index) => (
                  <tr key={`${item.product || item.productName}-${index}`}>
                    <td>
                      <strong>{item.productName}</strong>
                      {item.barcode && <span>{item.barcode}</span>}
                    </td>
                    <td>{item.quantity}</td>
                    <td>{formatMoney(item.unitPrice)}</td>
                    <td>{formatMoney(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="receipt-divider" />

            <section className="receipt-totals">
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
              <div className="receipt-grand-total-row">
                <span>Grand Total</span>
                <strong>{formatMoney(sale.grandTotal)}</strong>
              </div>
              <div>
                <span>Amount Paid</span>
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
            </section>

            <div className="receipt-divider" />

            <footer className="receipt-footer">
              <p>{settings?.receiptFooter || 'Thank you for shopping with us.'}</p>
            </footer>
          </article>
        </div>

        <div className="modal-actions receipt-preview-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            Close
          </button>
          <button className="primary-action-button receipt-print-button" type="button" onClick={handlePrint}>
            <Printer size={18} />
            <span>Print Receipt</span>
          </button>
        </div>
      </section>
    </div>
  );
}

export default ReceiptPreview;
