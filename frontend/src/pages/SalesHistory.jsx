import { useEffect, useMemo, useState } from 'react';
import { Eye, Printer, RotateCcw, Search } from 'lucide-react';
import api from '../api/axios.js';
import ReceiptPreview from '../components/ReceiptPreview.jsx';
import RefundModal from '../components/RefundModal.jsx';
import SaleDetailsModal from '../components/SaleDetailsModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getSettings } from '../services/settingsService.js';

const initialFilters = {
  startDate: '',
  endDate: '',
  cashier: '',
  paymentMethod: '',
  paymentStatus: '',
  saleStatus: '',
  search: ''
};

const formatMoney = (value) => Number(value || 0).toFixed(2);
const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '-');
const formatLabel = (value) => String(value || '-').replace(/_/g, ' ');

function SalesHistory() {
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [settings, setSettings] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);
  const [receiptSale, setReceiptSale] = useState(null);
  const [refundSale, setRefundSale] = useState(null);
  const [refundType, setRefundType] = useState('full');
  const [refundReason, setRefundReason] = useState('');
  const [refundQuantities, setRefundQuantities] = useState({});
  const [refundError, setRefundError] = useState('');
  const [isRefunding, setIsRefunding] = useState(false);

  const canRefund = ['admin', 'manager'].includes(user?.role);

  const totals = useMemo(
    () => ({
      count: sales.length,
      revenue: sales.reduce((sum, sale) => sum + Number(sale.grandTotal || 0), 0),
      refunded: sales.filter((sale) => ['refunded', 'partial_refund'].includes(sale.saleStatus)).length
    }),
    [sales]
  );

  const loadSales = async (nextFilters = filters) => {
    setIsLoading(true);
    setError('');

    try {
      const params = Object.fromEntries(
        Object.entries(nextFilters).filter(([, value]) => value !== '')
      );
      const response = await api.get('/sales', { params });
      setSales(response.data.data.sales);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load sales history.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const data = await getSettings();
      setSettings(data);
    } catch {
      setSettings(null);
    }
  };

  useEffect(() => {
    loadSales();
    loadSettings();
  }, []);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({
      ...current,
      [name]: value
    }));
  };

  const handleFilterSubmit = async (event) => {
    event.preventDefault();
    await loadSales();
  };

  const clearFilters = async () => {
    setFilters(initialFilters);
    await loadSales(initialFilters);
  };

  const openRefundModal = (sale) => {
    setSelectedSale(null);
    setRefundSale(sale);
    setRefundType('full');
    setRefundReason('');
    setRefundQuantities({});
    setRefundError('');
  };

  const handleRefundQuantityChange = (productId, value) => {
    setRefundQuantities((current) => ({
      ...current,
      [productId]: value
    }));
  };

  const handleRefundSubmit = async (event) => {
    event.preventDefault();
    setRefundError('');
    setSuccessMessage('');

    const payload = {
      refundType,
      reason: refundReason
    };

    if (refundType === 'items') {
      payload.items = Object.entries(refundQuantities)
        .map(([product, quantity]) => ({ product, quantity: Number(quantity) }))
        .filter((item) => Number.isFinite(item.quantity) && item.quantity > 0);

      if (payload.items.length === 0) {
        setRefundError('Enter at least one item quantity to refund.');
        return;
      }
    }

    setIsRefunding(true);

    try {
      const response = await api.post(`/sales/${refundSale._id}/refund`, payload);
      const updatedSale = response.data.data.sale;
      setSuccessMessage(`Refund processed for sale ${updatedSale.saleNumber}.`);
      setRefundSale(null);
      await loadSales();
    } catch (requestError) {
      setRefundError(requestError.response?.data?.message || 'Unable to process refund.');
    } finally {
      setIsRefunding(false);
    }
  };

  return (
    <div className="page-stack">
      <section className="page-header page-header-actions">
        <div>
          <p className="eyebrow">Sales</p>
          <h1>Sales History</h1>
          <p>Review completed sales, reprint receipts, and manage approved returns.</p>
        </div>
      </section>

      <section className="user-summary-grid">
        <article>
          <span>Sales Found</span>
          <strong>{totals.count}</strong>
        </article>
        <article>
          <span>Gross Total</span>
          <strong>{formatMoney(totals.revenue)}</strong>
        </article>
        <article>
          <span>Refunded Sales</span>
          <strong>{totals.refunded}</strong>
        </article>
        <article>
          <span>Access</span>
          <strong>{canRefund ? 'Refunds' : 'View'}</strong>
        </article>
      </section>

      <section className="panel-card sales-filter-panel">
        <form className="sales-filter-form" onSubmit={handleFilterSubmit}>
          <label className="input-group">
            Start Date
            <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
          </label>
          <label className="input-group">
            End Date
            <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
          </label>
          <label className="input-group">
            Cashier ID
            <input name="cashier" value={filters.cashier} onChange={handleFilterChange} placeholder="Cashier user ID" />
          </label>
          <label className="input-group">
            Payment Method
            <select name="paymentMethod" value={filters.paymentMethod} onChange={handleFilterChange}>
              <option value="">All</option>
              <option value="cash">Cash</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="card">Card</option>
              <option value="bank">Bank</option>
            </select>
          </label>
          <label className="input-group">
            Payment Status
            <select name="paymentStatus" value={filters.paymentStatus} onChange={handleFilterChange}>
              <option value="">All</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </label>
          <label className="input-group">
            Sale Status
            <select name="saleStatus" value={filters.saleStatus} onChange={handleFilterChange}>
              <option value="">All</option>
              <option value="completed">Completed</option>
              <option value="partial_refund">Partial Refund</option>
              <option value="refunded">Refunded</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <label className="input-group sales-search-filter">
            Sale Number
            <input name="search" value={filters.search} onChange={handleFilterChange} placeholder="Search sale number" />
          </label>
          <div className="sales-filter-actions">
            <button className="primary-action-button sale-modal-action" type="submit">
              <Search size={17} />
              <span>Filter</span>
            </button>
            <button className="secondary-button" type="button" onClick={clearFilters}>
              Clear
            </button>
          </div>
        </form>
      </section>

      {successMessage && <div className="form-success">{successMessage}</div>}
      {error && <div className="form-error">{error}</div>}

      <section className="panel-card users-panel">
        <div className="table-header">
          <div>
            <h2>Sales</h2>
            <p>Original sales are kept even after refunds.</p>
          </div>
        </div>

        <div className="table-scroll">
          <table className="users-table sales-history-table">
            <thead>
              <tr>
                <th>Sale Number</th>
                <th>Date</th>
                <th>Cashier</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="7">Loading sales...</td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan="7">No sales found.</td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale._id}>
                    <td>
                      <strong>{sale.saleNumber}</strong>
                      <span className="table-subtext">{sale.items?.length || 0} items</span>
                    </td>
                    <td>{formatDateTime(sale.createdAt)}</td>
                    <td>{sale.cashier?.name || sale.cashier?.email || '-'}</td>
                    <td>
                      <span className="status-badge muted">{formatLabel(sale.paymentMethod)}</span>
                    </td>
                    <td>
                      <span className={`status-badge sale-status-${sale.saleStatus}`}>
                        {formatLabel(sale.saleStatus)}
                      </span>
                    </td>
                    <td>{formatMoney(sale.grandTotal)}</td>
                    <td>
                      <div className="table-actions">
                        <button className="table-icon-button" type="button" onClick={() => setSelectedSale(sale)} title="View sale">
                          <Eye size={16} />
                        </button>
                        <button className="table-icon-button" type="button" onClick={() => setReceiptSale(sale)} title="Reprint receipt">
                          <Printer size={16} />
                        </button>
                        {canRefund && sale.saleStatus !== 'refunded' && sale.saleStatus !== 'cancelled' && (
                          <button className="table-icon-button" type="button" onClick={() => openRefundModal(sale)} title="Refund sale">
                            <RotateCcw size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedSale && (
        <SaleDetailsModal
          sale={selectedSale}
          canRefund={canRefund}
          onClose={() => setSelectedSale(null)}
          onReprint={(sale) => {
            setSelectedSale(null);
            setReceiptSale(sale);
          }}
          onRefund={openRefundModal}
        />
      )}

      {refundSale && (
        <RefundModal
          sale={refundSale}
          reason={refundReason}
          refundType={refundType}
          quantities={refundQuantities}
          isSubmitting={isRefunding}
          error={refundError}
          onReasonChange={setRefundReason}
          onTypeChange={setRefundType}
          onQuantityChange={handleRefundQuantityChange}
          onClose={() => setRefundSale(null)}
          onSubmit={handleRefundSubmit}
        />
      )}

      {receiptSale && (
        <ReceiptPreview sale={receiptSale} settings={settings} onClose={() => setReceiptSale(null)} />
      )}
    </div>
  );
}

export default SalesHistory;
