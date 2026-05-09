import { X } from 'lucide-react';

function CategoryModal({
  mode,
  formData,
  error,
  isSaving,
  onChange,
  onClose,
  onSubmit
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="user-modal" role="dialog" aria-modal="true" aria-labelledby="category-modal-title">
        <div className="modal-header">
          <div>
            <p className="eyebrow">{mode === 'add' ? 'Create' : 'Edit'}</p>
            <h2 id="category-modal-title">{mode === 'add' ? 'Add Category' : 'Edit Category'}</h2>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {error && <div className="form-error">{error}</div>}

        <form className="user-form" onSubmit={onSubmit}>
          <label className="input-group">
            <span>Name</span>
            <input name="name" value={formData.name} onChange={onChange} required />
          </label>

          <label className="input-group">
            <span>Description</span>
            <textarea
              name="description"
              value={formData.description}
              onChange={onChange}
              rows="4"
              placeholder="Optional category notes"
            />
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
              {isSaving ? 'Saving...' : 'Save Category'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default CategoryModal;
