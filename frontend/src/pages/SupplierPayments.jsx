import { useEffect, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import SupplierPaymentModal from '../components/SupplierPaymentModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getPurchases } from '../services/purchaseService.js';
import { getSuppliers } from '../services/supplierService.js';
import {
  createSupplierPayment,
  getSupplierPayments
} from '../services/supplierPaymentService.js';

const initialPaymentForm = {
  supplier: '',
  purchase: '',
  amount: '',
  paymentMethod: 'cash',
  reference: '',
  notes: ''
};

const formatMoney = (value) => Number(value || 0).toFixed(2);
const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '-');

function SupplierPayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [filters, setFilters] = useState({ supplier: '', paymentMethod: '' });
  const [formData, setFormData] = useState(initialPaymentForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');

  const canCreatePayment = ['admin', 'manager', 'accountant'].includes(user?.role);

  const totals = useMemo(
    () => ({
      count: payments.length,
      amount: payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
    }),
    [payments]
  );

  const loadPayments = async (nextFilters = filters) => {
    setIsLoading(true);
    setError('');

    try {
      const params = Object.fromEntries(Object.entries(nextFilters).filter(([, value]) => value));
      const data = await getSupplierPayments(params);
      setPayments(data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load supplier payments.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadLookups = async () => {
    try {
      const [supplierData, purchaseData] = await Promise.all([getSuppliers(), getPurchases()]);
      setSuppliers(supplierData.filter((supplier) => supplier.isActive));
      setPurchases(purchaseData);
    } catch {
      setSuppliers([]);
      setPurchases([]);
    }
  };

  useEffect(() => {
    loadPayments();
    loadLookups();
  }, []);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
      ...(name === 'supplier' ? { purchase: '' } : {})
    }));
  };

  const handleFilterSubmit = async (event) => {
    event.preventDefault();
    await loadPayments();
  };

  const openModal = () => {
    setFormData(initialPaymentForm);
    setModalError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(initialPaymentForm);
    setModalError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setModalError('');

    try {
      await createSupplierPayment({
        supplier: formData.supplier,
        purchase: formData.purchase || null,
        amount: Number(formData.amount),
        paymentMethod: formData.paymentMethod,
        reference: formData.reference,
        notes: formData.notes
      });

      closeModal();
      await loadPayments();
      await loadLookups();
    } catch (requestError) {
      setModalError(requestError.response?.data?.message || 'Unable to record supplier payment.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-stack">
      <section className="page-header page-header-actions">
        <div>
          <p className="eyebrow">Payments</p>
          <h1>Supplier Payments</h1>
          <p>Record payments against supplier balances and purchase invoices.</p>
        </div>
        {canCreatePayment && (
          <button className="primary-action-button" type="button" onClick={openModal}>
            <Plus size={18} />
            <span>Add Payment</span>
          </button>
        )}
      </section>

      <section className="user-summary-grid">
        <article>
          <span>Payments</span>
          <strong>{totals.count}</strong>
        </article>
        <article>
          <span>Total Paid</span>
          <strong>{formatMoney(totals.amount)}</strong>
        </article>
        <article>
          <span>Access</span>
          <strong>{canCreatePayment ? 'Create' : 'View'}</strong>
        </article>
        <article>
          <span>Methods</span>
          <strong>4</strong>
        </article>
      </section>

      <section className="panel-card search-panel">
        <form className="product-search-form" onSubmit={handleFilterSubmit}>
          <select className="purchase-status-filter" name="supplier" value={filters.supplier} onChange={handleFilterChange}>
            <option value="">All suppliers</option>
            {suppliers.map((supplier) => (
              <option key={supplier._id} value={supplier._id}>
                {supplier.name}
              </option>
            ))}
          </select>
          <select className="purchase-status-filter" name="paymentMethod" value={filters.paymentMethod} onChange={handleFilterChange}>
            <option value="">All methods</option>
            <option value="cash">Cash</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="bank">Bank</option>
            <option value="card">Card</option>
          </select>
          <button className="primary-button compact" type="submit">
            <Search size={16} />
            Filter
          </button>
        </form>
      </section>

      {error && <div className="form-error">{error}</div>}

      <section className="panel-card users-panel">
        <div className="table-header">
          <div>
            <h2>Payment History</h2>
            <p>Supplier payments are recorded as permanent ledger entries.</p>
          </div>
        </div>

        <div className="table-scroll">
          <table className="users-table supplier-payment-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Supplier</th>
                <th>Purchase</th>
                <th>Method</th>
                <th>Reference</th>
                <th>Amount</th>
                <th>Paid By</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="7">Loading supplier payments...</td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan="7">No supplier payments found.</td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment._id}>
                    <td>{formatDateTime(payment.createdAt)}</td>
                    <td>
                      <strong>{payment.supplier?.name || '-'}</strong>
                      <span className="table-subtext">Balance {formatMoney(payment.supplier?.currentBalance)}</span>
                    </td>
                    <td>{payment.purchase?.purchaseNumber || '-'}</td>
                    <td>{String(payment.paymentMethod).replace(/_/g, ' ')}</td>
                    <td>{payment.reference || '-'}</td>
                    <td>{formatMoney(payment.amount)}</td>
                    <td>{payment.paidBy?.name || payment.paidBy?.email || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen && (
        <SupplierPaymentModal
          suppliers={suppliers}
          purchases={purchases}
          formData={formData}
          error={modalError}
          isSaving={isSaving}
          onChange={handleFormChange}
          onClose={closeModal}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

export default SupplierPayments;
