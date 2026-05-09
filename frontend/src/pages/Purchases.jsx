import { useEffect, useMemo, useState } from 'react';
import { Edit, Eye, Plus, Search, Trash2 } from 'lucide-react';
import PurchaseDetailsModal from '../components/PurchaseDetailsModal.jsx';
import PurchaseModal from '../components/PurchaseModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getProducts } from '../services/productService.js';
import { createPurchase, getPurchases, softDeletePurchase, updatePurchase } from '../services/purchaseService.js';
import { getSuppliers } from '../services/supplierService.js';

const today = () => new Date().toISOString().slice(0, 10);

const blankItem = { product: '', quantity: 1, buyingPrice: '' };

const initialForm = {
  supplier: '',
  purchaseDate: today(),
  items: [{ ...blankItem }],
  discount: 0,
  amountPaid: 0,
  notes: ''
};

const formatMoney = (value) => Number(value || 0).toFixed(2);
const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '-');

const getProductId = (item) => (typeof item.product === 'string' ? item.product : item.product?._id || item.product);

function Purchases() {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [modalMode, setModalMode] = useState(null);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [detailsPurchase, setDetailsPurchase] = useState(null);
  const [formData, setFormData] = useState(initialForm);

  const canManagePurchases = ['admin', 'manager', 'stock_keeper'].includes(user?.role);
  const isModalOpen = Boolean(modalMode);

  const totals = useMemo(() => {
    const subtotal = formData.items.reduce(
      (sum, item) => sum + Number(item.quantity || 0) * Number(item.buyingPrice || 0),
      0
    );
    const discount = Math.min(Number(formData.discount || 0), subtotal);
    const grandTotal = Math.max(subtotal - discount, 0);
    const amountPaid = Number(formData.amountPaid || 0);
    const balance = amountPaid < grandTotal ? grandTotal - amountPaid : 0;

    return { subtotal, grandTotal, amountPaid, balance };
  }, [formData]);

  const summary = useMemo(
    () => ({
      count: purchases.length,
      total: purchases.reduce((sum, purchase) => sum + Number(purchase.grandTotal || 0), 0),
      balance: purchases.reduce((sum, purchase) => sum + Number(purchase.balance || 0), 0)
    }),
    [purchases]
  );

  const loadPurchases = async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await getPurchases({
        ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
        ...(paymentStatus ? { paymentStatus } : {})
      });
      setPurchases(data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load purchases.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadLookups = async () => {
    try {
      const [supplierData, productData] = await Promise.all([getSuppliers(), getProducts()]);
      setSuppliers(supplierData.filter((supplier) => supplier.isActive));
      setProducts(productData.filter((product) => product.isActive));
    } catch {
      setSuppliers([]);
      setProducts([]);
    }
  };

  useEffect(() => {
    loadPurchases();
    loadLookups();
  }, []);

  const resetForm = () => {
    setFormData(initialForm);
    setSelectedPurchase(null);
    setModalError('');
  };

  const openAddModal = () => {
    resetForm();
    setModalMode('add');
  };

  const openEditModal = (purchase) => {
    setSelectedPurchase(purchase);
    setFormData({
      supplier: purchase.supplier?._id || purchase.supplier || '',
      purchaseDate: purchase.purchaseDate ? new Date(purchase.purchaseDate).toISOString().slice(0, 10) : today(),
      items: purchase.items.map((item) => ({
        product: getProductId(item),
        quantity: item.quantity,
        buyingPrice: item.buyingPrice
      })),
      discount: purchase.discount || 0,
      amountPaid: purchase.amountPaid || 0,
      notes: purchase.notes || ''
    });
    setModalError('');
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    resetForm();
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    setFormData((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        const nextItem = { ...item, [field]: value };
        if (field === 'product') {
          const product = products.find((candidate) => candidate._id === value);
          nextItem.buyingPrice = product?.buyingPrice ?? '';
        }
        return nextItem;
      })
    }));
  };

  const addItem = () => {
    setFormData((current) => ({ ...current, items: [...current.items, { ...blankItem }] }));
  };

  const removeItem = (index) => {
    setFormData((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index)
    }));
  };

  const buildPayload = () => ({
    supplier: formData.supplier,
    purchaseDate: formData.purchaseDate,
    discount: Number(formData.discount || 0),
    amountPaid: Number(formData.amountPaid || 0),
    notes: formData.notes,
    items: formData.items.map((item) => ({
      product: item.product,
      quantity: Number(item.quantity),
      buyingPrice: Number(item.buyingPrice)
    }))
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setModalError('');

    try {
      const payload = buildPayload();
      if (modalMode === 'add') {
        await createPurchase(payload);
      } else {
        await updatePurchase(selectedPurchase._id, payload);
      }

      closeModal();
      await loadPurchases();
      await loadLookups();
    } catch (requestError) {
      setModalError(requestError.response?.data?.message || 'Unable to save purchase.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (purchase) => {
    setError('');

    try {
      await softDeletePurchase(purchase._id);
      await loadPurchases();
      await loadLookups();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to delete purchase.');
    }
  };

  const handleFilterSubmit = async (event) => {
    event.preventDefault();
    await loadPurchases();
  };

  return (
    <div className="page-stack">
      <section className="page-header page-header-actions">
        <div>
          <p className="eyebrow">Inventory</p>
          <h1>Purchase Invoices</h1>
          <p>Record supplier invoices, update stock, and track unpaid balances.</p>
        </div>
        {canManagePurchases && (
          <button className="primary-action-button" type="button" onClick={openAddModal}>
            <Plus size={18} />
            <span>Add Purchase</span>
          </button>
        )}
      </section>

      <section className="user-summary-grid">
        <article>
          <span>Purchases</span>
          <strong>{summary.count}</strong>
        </article>
        <article>
          <span>Total Value</span>
          <strong>{formatMoney(summary.total)}</strong>
        </article>
        <article>
          <span>Outstanding</span>
          <strong>{formatMoney(summary.balance)}</strong>
        </article>
        <article>
          <span>Access</span>
          <strong>{canManagePurchases ? 'Manage' : 'View'}</strong>
        </article>
      </section>

      <section className="panel-card search-panel">
        <form className="product-search-form" onSubmit={handleFilterSubmit}>
          <div className="navbar-search product-search">
            <Search size={18} />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search purchase number"
            />
          </div>
          <select className="purchase-status-filter" value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}>
            <option value="">All payments</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="unpaid">Unpaid</option>
          </select>
          <button className="primary-button compact" type="submit">
            Filter
          </button>
        </form>
      </section>

      {error && <div className="form-error">{error}</div>}

      <section className="panel-card users-panel">
        <div className="table-header">
          <div>
            <h2>Purchase List</h2>
            <p>Deleted purchase invoices are hidden by default.</p>
          </div>
        </div>

        <div className="table-scroll">
          <table className="users-table purchase-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Date</th>
                <th>Supplier</th>
                <th>Payment</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="8">Loading purchases...</td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan="8">No purchases found.</td>
                </tr>
              ) : (
                purchases.map((purchase) => (
                  <tr key={purchase._id}>
                    <td>
                      <strong>{purchase.purchaseNumber}</strong>
                      <span className="table-subtext">{purchase.items?.length || 0} items</span>
                    </td>
                    <td>{formatDate(purchase.purchaseDate)}</td>
                    <td>{purchase.supplier?.name || '-'}</td>
                    <td>
                      <span className={`status-badge purchase-payment-${purchase.paymentStatus}`}>
                        {purchase.paymentStatus}
                      </span>
                    </td>
                    <td>{formatMoney(purchase.grandTotal)}</td>
                    <td>{formatMoney(purchase.amountPaid)}</td>
                    <td>{formatMoney(purchase.balance)}</td>
                    <td>
                      <div className="table-actions">
                        <button className="table-icon-button" type="button" onClick={() => setDetailsPurchase(purchase)} title="View purchase">
                          <Eye size={16} />
                        </button>
                        {canManagePurchases && (
                          <>
                            <button className="table-icon-button" type="button" onClick={() => openEditModal(purchase)} title="Edit purchase">
                              <Edit size={16} />
                            </button>
                            <button className="table-icon-button danger" type="button" onClick={() => handleDelete(purchase)} title="Delete purchase">
                              <Trash2 size={16} />
                            </button>
                          </>
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

      {isModalOpen && (
        <PurchaseModal
          mode={modalMode}
          formData={formData}
          suppliers={suppliers}
          products={products}
          totals={totals}
          error={modalError}
          isSaving={isSaving}
          onChange={handleChange}
          onItemChange={handleItemChange}
          onAddItem={addItem}
          onRemoveItem={removeItem}
          onClose={closeModal}
          onSubmit={handleSubmit}
        />
      )}

      {detailsPurchase && <PurchaseDetailsModal purchase={detailsPurchase} onClose={() => setDetailsPurchase(null)} />}
    </div>
  );
}

export default Purchases;
