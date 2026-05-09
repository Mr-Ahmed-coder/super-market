import { X } from 'lucide-react';

const unitTypes = ['piece', 'kg', 'gram', 'liter', 'ml', 'box', 'carton', 'packet', 'bottle'];

function ProductModal({
  mode,
  formData,
  categories,
  error,
  isSaving,
  onChange,
  onClose,
  onSubmit
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="user-modal product-modal" role="dialog" aria-modal="true" aria-labelledby="product-modal-title">
        <div className="modal-header">
          <div>
            <p className="eyebrow">{mode === 'add' ? 'Create' : 'Edit'}</p>
            <h2 id="product-modal-title">{mode === 'add' ? 'Add Product' : 'Edit Product'}</h2>
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
              <span>Barcode</span>
              <input name="barcode" value={formData.barcode} onChange={onChange} />
            </label>
          </div>

          <label className="input-group">
            <span>Category</span>
            <select name="category" value={formData.category} onChange={onChange} required>
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category._id} value={category._id} disabled={!category.isActive}>
                  {category.name}{category.isActive ? '' : ' (inactive)'}
                </option>
              ))}
            </select>
          </label>

          <div className="form-grid-two">
            <label className="input-group">
              <span>Buying Price</span>
              <input
                type="number"
                name="buyingPrice"
                value={formData.buyingPrice}
                onChange={onChange}
                min="0"
                step="0.01"
                required
              />
            </label>

            <label className="input-group">
              <span>Selling Price</span>
              <input
                type="number"
                name="sellingPrice"
                value={formData.sellingPrice}
                onChange={onChange}
                min="0"
                step="0.01"
                required
              />
            </label>
          </div>

          <div className="form-grid-two">
            <label className="input-group">
              <span>Stock Quantity</span>
              <input
                type="number"
                name="stockQuantity"
                value={formData.stockQuantity}
                onChange={onChange}
                min="0"
                required
              />
            </label>

            <label className="input-group">
              <span>Low Stock Limit</span>
              <input
                type="number"
                name="lowStockLimit"
                value={formData.lowStockLimit}
                onChange={onChange}
                min="0"
              />
            </label>
          </div>

          <div className="form-grid-two">
            <label className="input-group">
              <span>Expiry Date</span>
              <input type="date" name="expiryDate" value={formData.expiryDate} onChange={onChange} />
            </label>

            <label className="input-group">
              <span>Unit Type</span>
              <select name="unitType" value={formData.unitType} onChange={onChange}>
                {unitTypes.map((unitType) => (
                  <option key={unitType} value={unitType}>
                    {unitType}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="input-group">
            <span>Supplier</span>
            <input name="supplier" value={formData.supplier} onChange={onChange} />
          </label>

          <div className="modal-actions">
            <button className="secondary-button" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary-button compact" type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default ProductModal;
