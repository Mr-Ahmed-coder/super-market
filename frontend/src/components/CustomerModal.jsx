import { X } from 'lucide-react';

function CustomerModal({ mode, formData, error, isSaving, onChange, onClose, onSubmit }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="supplier-modal" role="dialog" aria-modal="true" aria-labelledby="customer-modal-title">
        <div className="modal-header">
          <div>
            <p className="eyebrow">{mode === 'add' ? 'Create' : 'Edit'}</p>
            <h2 id="customer-modal-title">{mode === 'add' ? 'Add Customer' : 'Edit Customer'}</h2>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {error && <div className="form-error">{error}</div>}

        <form className="user-form" onSubmit={onSubmit}>
          <div className="form-grid-two">
            <label className="input-group">
              <span>Name</span>
              <input name="name" value={formData.name} onChange={onChange} required />
            </label>
            <label className="input-group">
              <span>Phone</span>
              <input name="phone" value={formData.phone} onChange={onChange} />
            </label>
            <label className="input-group">
              <span>Email</span>
              <input type="email" name="email" value={formData.email} onChange={onChange} />
            </label>
            <label className="input-group">
              <span>Credit Limit</span>
              <input type="number" min="0" step="0.01" name="creditLimit" value={formData.creditLimit} onChange={onChange} />
            </label>
            <label className="input-group">
              <span>Opening Balance</span>
              <input type="number" min="0" step="0.01" name="openingBalance" value={formData.openingBalance} onChange={onChange} />
            </label>
            <label className="input-group">
              <span>Current Balance</span>
              <input type="number" min="0" step="0.01" name="currentBalance" value={formData.currentBalance} onChange={onChange} />
            </label>
          </div>

          <label className="input-group">
            <span>Address</span>
            <textarea name="address" value={formData.address} onChange={onChange} rows="3" />
          </label>

          <label className="input-group">
            <span>Notes</span>
            <textarea name="notes" value={formData.notes} onChange={onChange} rows="3" />
          </label>

          <div className="form-switches">
            <label>
              <input type="checkbox" name="isActive" checked={formData.isActive} onChange={onChange} />
              <span>Active</span>
            </label>
          </div>

          <div className="modal-actions">
            <button className="secondary-button" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary-button compact" type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default CustomerModal;
