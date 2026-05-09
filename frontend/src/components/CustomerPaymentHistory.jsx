const formatMoney = (value) => Number(value || 0).toFixed(2);

function CustomerPaymentHistory({ payments }) {
  return (
    <section className="panel-card users-panel">
      <div className="table-header">
        <div>
          <h2>Customer Payment History</h2>
          <p>Latest payments received from customers.</p>
        </div>
      </div>

      <div className="table-scroll">
        <table className="users-table customer-payment-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer</th>
              <th>Sale</th>
              <th>Method</th>
              <th>Amount</th>
              <th>Received By</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan="6">No payments found.</td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment._id}>
                  <td>{new Date(payment.createdAt).toLocaleString()}</td>
                  <td>{payment.customer?.name || '-'}</td>
                  <td>{payment.sale?.saleNumber || '-'}</td>
                  <td>{String(payment.paymentMethod).replace(/_/g, ' ')}</td>
                  <td>{formatMoney(payment.amount)}</td>
                  <td>{payment.receivedBy?.name || payment.receivedBy?.email || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default CustomerPaymentHistory;
