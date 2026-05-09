import { useEffect, useMemo, useState } from 'react';
import { CreditCard, Edit, Plus, Power, PowerOff, Search, Trash2 } from 'lucide-react';
import CustomerModal from '../components/CustomerModal.jsx';
import CustomerPaymentHistory from '../components/CustomerPaymentHistory.jsx';
import CustomerPaymentModal from '../components/CustomerPaymentModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  createCustomer,
  getCustomers,
  softDeleteCustomer,
  toggleCustomerStatus,
  updateCustomer
} from '../services/customerService.js';
import {
  createCustomerPayment,
  getCustomerPayments
} from '../services/customerPaymentService.js';

const initialForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
  openingBalance: 0,
  currentBalance: 0,
  creditLimit: 0,
  isActive: true,
  notes: ''
};

const initialPaymentForm = {
  amount: '',
  paymentMethod: 'cash',
  notes: ''
};

const formatMoney = (value) => Number(value || 0).toFixed(2);

function Customers() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPaymentSaving, setIsPaymentSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [modalMode, setModalMode] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentCustomer, setPaymentCustomer] = useState(null);
  const [formData, setFormData] = useState(initialForm);
  const [paymentForm, setPaymentForm] = useState(initialPaymentForm);

  const canManageCustomers = ['admin', 'manager'].includes(user?.role);
  const canRecordPayment = ['admin', 'manager', 'cashier'].includes(user?.role);
  const isModalOpen = Boolean(modalMode);

  const counts = useMemo(
    () => ({
      total: customers.length,
      active: customers.filter((customer) => customer.isActive).length,
      balance: customers.reduce((sum, customer) => sum + Number(customer.currentBalance || 0), 0)
    }),
    [customers]
  );

  const loadCustomers = async (search = searchQuery) => {
    setIsLoading(true);
    setError('');

    try {
      const data = await getCustomers(search.trim());
      setCustomers(data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load customers.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPayments = async () => {
    try {
      const data = await getCustomerPayments();
      setPayments(data);
    } catch {
      setPayments([]);
    }
  };

  useEffect(() => {
    loadCustomers('');
    loadPayments();
  }, []);

  const openAddModal = () => {
    setSelectedCustomer(null);
    setFormData(initialForm);
    setModalError('');
    setModalMode('add');
  };

  const openEditModal = (customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      openingBalance: customer.openingBalance ?? 0,
      currentBalance: customer.currentBalance ?? 0,
      creditLimit: customer.creditLimit ?? 0,
      isActive: customer.isActive,
      notes: customer.notes || ''
    });
    setModalError('');
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedCustomer(null);
    setFormData(initialForm);
    setModalError('');
  };

  const openPaymentModal = (customer) => {
    setPaymentCustomer(customer);
    setPaymentForm(initialPaymentForm);
    setPaymentError('');
  };

  const handleChange = (event) => {
    const { name, type, checked, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePaymentChange = (event) => {
    const { name, value } = event.target;
    setPaymentForm((current) => ({ ...current, [name]: value }));
  };

  const handleSearchSubmit = async (event) => {
    event.preventDefault();
    await loadCustomers();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setModalError('');

    try {
      const openingBalance = Number(formData.openingBalance || 0);
      const payload = {
        ...formData,
        openingBalance,
        currentBalance: modalMode === 'add' ? openingBalance : Number(formData.currentBalance || 0),
        creditLimit: Number(formData.creditLimit || 0)
      };

      if (modalMode === 'add') {
        await createCustomer(payload);
      } else {
        await updateCustomer(selectedCustomer._id, payload);
      }

      closeModal();
      await loadCustomers();
    } catch (requestError) {
      setModalError(requestError.response?.data?.message || 'Unable to save customer.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePaymentSubmit = async (event) => {
    event.preventDefault();
    setIsPaymentSaving(true);
    setPaymentError('');

    try {
      await createCustomerPayment({
        customer: paymentCustomer._id,
        amount: Number(paymentForm.amount),
        paymentMethod: paymentForm.paymentMethod,
        notes: paymentForm.notes
      });

      setPaymentCustomer(null);
      setPaymentForm(initialPaymentForm);
      await loadCustomers();
      await loadPayments();
    } catch (requestError) {
      setPaymentError(requestError.response?.data?.message || 'Unable to record customer payment.');
    } finally {
      setIsPaymentSaving(false);
    }
  };

  const handleToggleStatus = async (customer) => {
    try {
      await toggleCustomerStatus(customer._id);
      await loadCustomers();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update customer status.');
    }
  };

  const handleSoftDelete = async (customer) => {
    try {
      await softDeleteCustomer(customer._id);
      await loadCustomers();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to delete customer.');
    }
  };

  return (
    <div className="page-stack">
      <section className="page-header page-header-actions">
        <div>
          <p className="eyebrow">Customers</p>
          <h1>Customer Management</h1>
          <p>Manage customer credit limits, balances, and payments.</p>
        </div>
        {canManageCustomers && (
          <button className="primary-action-button" type="button" onClick={openAddModal}>
            <Plus size={18} />
            <span>Add Customer</span>
          </button>
        )}
      </section>

      <section className="user-summary-grid">
        <article>
          <span>Total Customers</span>
          <strong>{counts.total}</strong>
        </article>
        <article>
          <span>Active</span>
          <strong>{counts.active}</strong>
        </article>
        <article>
          <span>Total Credit</span>
          <strong>{formatMoney(counts.balance)}</strong>
        </article>
        <article>
          <span>Access</span>
          <strong>{canManageCustomers ? 'Manage' : 'View'}</strong>
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
              placeholder="Search customer name or phone"
            />
          </div>
          <button className="primary-button compact" type="submit">
            Search
          </button>
        </form>
      </section>

      {error && <div className="form-error">{error}</div>}

      <section className="panel-card users-panel">
        <div className="table-header">
          <div>
            <h2>Customer List</h2>
            <p>Deleted customers are hidden by default.</p>
          </div>
        </div>

        <div className="table-scroll">
          <table className="users-table customer-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Balance</th>
                <th>Credit Limit</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6">Loading customers...</td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="6">No customers found.</td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer._id}>
                    <td>
                      <strong>{customer.name}</strong>
                      <span className="table-subtext">{customer.address || 'No address'}</span>
                    </td>
                    <td>
                      {customer.phone || '-'}
                      <span className="table-subtext">{customer.email || 'No email'}</span>
                    </td>
                    <td>{formatMoney(customer.currentBalance)}</td>
                    <td>{formatMoney(customer.creditLimit)}</td>
                    <td>
                      <span className={`status-badge ${customer.isActive ? 'success' : 'muted'}`}>
                        {customer.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        {canRecordPayment && (
                          <button className="table-icon-button" type="button" onClick={() => openPaymentModal(customer)} title="Record payment">
                            <CreditCard size={16} />
                          </button>
                        )}
                        {canManageCustomers && (
                          <>
                            <button className="table-icon-button" type="button" onClick={() => openEditModal(customer)} title="Edit customer">
                              <Edit size={16} />
                            </button>
                            <button className="table-icon-button" type="button" onClick={() => handleToggleStatus(customer)} title="Toggle customer">
                              {customer.isActive ? <PowerOff size={16} /> : <Power size={16} />}
                            </button>
                            <button className="table-icon-button danger" type="button" onClick={() => handleSoftDelete(customer)} title="Delete customer">
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

      <CustomerPaymentHistory payments={payments} />

      {isModalOpen && (
        <CustomerModal
          mode={modalMode}
          formData={formData}
          error={modalError}
          isSaving={isSaving}
          onChange={handleChange}
          onClose={closeModal}
          onSubmit={handleSubmit}
        />
      )}

      {paymentCustomer && (
        <CustomerPaymentModal
          customer={paymentCustomer}
          formData={paymentForm}
          error={paymentError}
          isSaving={isPaymentSaving}
          onChange={handlePaymentChange}
          onClose={() => setPaymentCustomer(null)}
          onSubmit={handlePaymentSubmit}
        />
      )}
    </div>
  );
}

export default Customers;
