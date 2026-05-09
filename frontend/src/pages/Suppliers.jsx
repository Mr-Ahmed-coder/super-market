import { useEffect, useMemo, useState } from 'react';
import { CreditCard, Edit, Plus, Power, PowerOff, Search, Trash2 } from 'lucide-react';
import SupplierPaymentModal from '../components/SupplierPaymentModal.jsx';
import SupplierModal from '../components/SupplierModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  createSupplier,
  getSuppliers,
  softDeleteSupplier,
  toggleSupplierStatus,
  updateSupplier
} from '../services/supplierService.js';
import { getPurchases } from '../services/purchaseService.js';
import { createSupplierPayment } from '../services/supplierPaymentService.js';

const initialForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
  companyName: '',
  openingBalance: 0,
  currentBalance: 0,
  notes: '',
  isActive: true
};

const initialPaymentForm = {
  supplier: '',
  purchase: '',
  amount: '',
  paymentMethod: 'cash',
  reference: '',
  notes: ''
};

const formatMoney = (value) => Number(value || 0).toFixed(2);

const buildSupplierPayload = (formData, mode) => {
  const openingBalance = Number(formData.openingBalance || 0);
  const currentBalance = Number(formData.currentBalance || 0);

  return {
    ...formData,
    openingBalance,
    currentBalance: mode === 'add' ? openingBalance : currentBalance
  };
};

function Suppliers() {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [modalMode, setModalMode] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [formData, setFormData] = useState(initialForm);
  const [paymentSupplier, setPaymentSupplier] = useState(null);
  const [paymentForm, setPaymentForm] = useState(initialPaymentForm);
  const [paymentError, setPaymentError] = useState('');
  const [isPaymentSaving, setIsPaymentSaving] = useState(false);

  const canManageSuppliers = ['admin', 'manager'].includes(user?.role);
  const canCreateSupplierPayment = ['admin', 'manager', 'accountant'].includes(user?.role);
  const canUseSupplierActions = canManageSuppliers || canCreateSupplierPayment;
  const isModalOpen = Boolean(modalMode);

  const counts = useMemo(
    () => ({
      total: suppliers.length,
      active: suppliers.filter((supplier) => supplier.isActive).length,
      balance: suppliers.reduce((sum, supplier) => sum + Number(supplier.currentBalance || 0), 0)
    }),
    [suppliers]
  );

  const loadSuppliers = async (search = searchQuery) => {
    setIsLoading(true);
    setError('');

    try {
      const data = await getSuppliers(search.trim());
      setSuppliers(data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load suppliers.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers('');
    loadPurchases();
  }, []);

  const loadPurchases = async () => {
    try {
      const data = await getPurchases();
      setPurchases(data);
    } catch {
      setPurchases([]);
    }
  };

  const openAddModal = () => {
    setSelectedSupplier(null);
    setFormData(initialForm);
    setModalError('');
    setModalMode('add');
  };

  const openEditModal = (supplier) => {
    setSelectedSupplier(supplier);
    setFormData({
      name: supplier.name || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      companyName: supplier.companyName || '',
      openingBalance: supplier.openingBalance ?? 0,
      currentBalance: supplier.currentBalance ?? 0,
      notes: supplier.notes || '',
      isActive: supplier.isActive
    });
    setModalError('');
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedSupplier(null);
    setFormData(initialForm);
    setModalError('');
  };

  const handleChange = (event) => {
    const { name, type, checked, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSearchSubmit = async (event) => {
    event.preventDefault();
    await loadSuppliers();
  };

  const handleClearSearch = async () => {
    setSearchQuery('');
    await loadSuppliers('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setModalError('');

    try {
      const payload = buildSupplierPayload(formData, modalMode);

      if (payload.openingBalance < 0 || payload.currentBalance < 0) {
        setModalError('Supplier balances cannot be negative.');
        return;
      }

      if (modalMode === 'add') {
        await createSupplier(payload);
      } else {
        await updateSupplier(selectedSupplier._id, payload);
      }

      closeModal();
      await loadSuppliers();
    } catch (requestError) {
      setModalError(requestError.response?.data?.message || 'Unable to save supplier.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (supplier) => {
    setError('');

    try {
      await toggleSupplierStatus(supplier._id);
      await loadSuppliers();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update supplier status.');
    }
  };

  const handleSoftDelete = async (supplier) => {
    setError('');

    try {
      await softDeleteSupplier(supplier._id);
      await loadSuppliers();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to delete supplier.');
    }
  };

  const openPaymentModal = (supplier) => {
    setPaymentSupplier(supplier);
    setPaymentForm({
      ...initialPaymentForm,
      supplier: supplier._id,
      amount: supplier.currentBalance > 0 ? Number(supplier.currentBalance).toFixed(2) : ''
    });
    setPaymentError('');
  };

  const handlePaymentChange = (event) => {
    const { name, value } = event.target;
    setPaymentForm((current) => ({
      ...current,
      [name]: value,
      ...(name === 'supplier' ? { purchase: '' } : {})
    }));
  };

  const handlePaymentSubmit = async (event) => {
    event.preventDefault();
    setIsPaymentSaving(true);
    setPaymentError('');

    try {
      await createSupplierPayment({
        supplier: paymentForm.supplier,
        purchase: paymentForm.purchase || null,
        amount: Number(paymentForm.amount),
        paymentMethod: paymentForm.paymentMethod,
        reference: paymentForm.reference,
        notes: paymentForm.notes
      });

      setPaymentSupplier(null);
      setPaymentForm(initialPaymentForm);
      await loadSuppliers();
      await loadPurchases();
    } catch (requestError) {
      setPaymentError(requestError.response?.data?.message || 'Unable to record supplier payment.');
    } finally {
      setIsPaymentSaving(false);
    }
  };

  return (
    <div className="page-stack">
      <section className="page-header page-header-actions">
        <div>
          <p className="eyebrow">Inventory</p>
          <h1>Suppliers</h1>
          <p>Manage supplier profiles, balances, contacts, and status for purchase workflows.</p>
        </div>
        {canManageSuppliers && (
          <button className="primary-action-button" type="button" onClick={openAddModal}>
            <Plus size={18} />
            <span>Add Supplier</span>
          </button>
        )}
      </section>

      <section className="user-summary-grid">
        <article>
          <span>Total Suppliers</span>
          <strong>{counts.total}</strong>
        </article>
        <article>
          <span>Active</span>
          <strong>{counts.active}</strong>
        </article>
        <article>
          <span>Total Balance</span>
          <strong>{formatMoney(counts.balance)}</strong>
        </article>
        <article>
          <span>Access</span>
          <strong>{canManageSuppliers ? 'Manage' : 'View'}</strong>
        </article>
      </section>

      <section className="panel-card search-panel">
        <form className="product-search-form" onSubmit={handleSearchSubmit}>
          <div className="navbar-search product-search">
            <Search size={18} />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search supplier name, phone, or company"
            />
          </div>
          <button className="primary-button compact" type="submit">
            Search
          </button>
          <button className="secondary-button" type="button" onClick={handleClearSearch}>
            Clear
          </button>
        </form>
      </section>

      {error && <div className="form-error">{error}</div>}

      <section className="panel-card users-panel">
        <div className="table-header">
          <div>
            <h2>Supplier List</h2>
            <p>Deleted suppliers are hidden by default.</p>
          </div>
        </div>

        <div className="table-scroll">
          <table className="users-table supplier-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Company</th>
                <th>Contact</th>
                <th>Opening</th>
                <th>Balance</th>
                <th>Status</th>
                {canUseSupplierActions && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={canUseSupplierActions ? 7 : 6}>Loading suppliers...</td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={canUseSupplierActions ? 7 : 6}>No suppliers found.</td>
                </tr>
              ) : (
                suppliers.map((supplier) => (
                  <tr key={supplier._id}>
                    <td>
                      <strong>{supplier.name}</strong>
                      <span className="table-subtext">{supplier.address || 'No address'}</span>
                    </td>
                    <td>{supplier.companyName || '-'}</td>
                    <td>
                      {supplier.phone || '-'}
                      <span className="table-subtext">{supplier.email || 'No email'}</span>
                    </td>
                    <td>{formatMoney(supplier.openingBalance)}</td>
                    <td>
                      <strong>{formatMoney(supplier.currentBalance)}</strong>
                    </td>
                    <td>
                      <span className={`status-badge ${supplier.isActive ? 'success' : 'muted'}`}>
                        {supplier.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {canUseSupplierActions && (
                      <td>
                        <div className="table-actions">
                          {canCreateSupplierPayment && (
                            <button className="table-icon-button" type="button" onClick={() => openPaymentModal(supplier)} title="Record supplier payment">
                              <CreditCard size={16} />
                            </button>
                          )}
                          {canManageSuppliers && (
                            <>
                              <button className="table-icon-button" type="button" onClick={() => openEditModal(supplier)} title="Edit supplier">
                                <Edit size={16} />
                              </button>
                              <button
                                className="table-icon-button"
                                type="button"
                                onClick={() => handleToggleStatus(supplier)}
                                title={supplier.isActive ? 'Deactivate supplier' : 'Activate supplier'}
                              >
                                {supplier.isActive ? <PowerOff size={16} /> : <Power size={16} />}
                              </button>
                              <button className="table-icon-button danger" type="button" onClick={() => handleSoftDelete(supplier)} title="Soft delete supplier">
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen && (
        <SupplierModal
          mode={modalMode}
          formData={formData}
          error={modalError}
          isSaving={isSaving}
          onChange={handleChange}
          onClose={closeModal}
          onSubmit={handleSubmit}
        />
      )}

      {paymentSupplier && (
        <SupplierPaymentModal
          supplier={paymentSupplier}
          suppliers={suppliers}
          purchases={purchases}
          formData={paymentForm}
          error={paymentError}
          isSaving={isPaymentSaving}
          onChange={handlePaymentChange}
          onClose={() => setPaymentSupplier(null)}
          onSubmit={handlePaymentSubmit}
        />
      )}
    </div>
  );
}

export default Suppliers;
