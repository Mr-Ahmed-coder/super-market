import { useEffect, useMemo, useState } from 'react';
import { Edit, Plus, Power, PowerOff, Search, Trash2 } from 'lucide-react';
import ProductModal from '../components/ProductModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getCategories } from '../services/categoryService.js';
import {
  createProduct,
  getProducts,
  searchProducts,
  softDeleteProduct,
  toggleProductStatus,
  updateProduct
} from '../services/productService.js';

const initialForm = {
  name: '',
  barcode: '',
  category: '',
  buyingPrice: '',
  sellingPrice: '',
  stockQuantity: 0,
  lowStockLimit: '',
  expiryDate: '',
  supplier: '',
  unitType: 'piece'
};

const formatDateForInput = (date) => {
  if (!date) {
    return '';
  }

  return new Date(date).toISOString().slice(0, 10);
};

const getCategoryName = (product) => {
  if (!product.category) {
    return '-';
  }

  return typeof product.category === 'string' ? product.category : product.category.name;
};

const buildProductPayload = (formData) => {
  const payload = {
    ...formData,
    buyingPrice: Number(formData.buyingPrice),
    sellingPrice: Number(formData.sellingPrice),
    stockQuantity: Number(formData.stockQuantity || 0),
    unitType: formData.unitType
  };

  if (!payload.barcode) {
    delete payload.barcode;
  }

  if (payload.lowStockLimit === '' || payload.lowStockLimit === null) {
    delete payload.lowStockLimit;
  } else {
    payload.lowStockLimit = Number(payload.lowStockLimit);
  }

  if (!payload.expiryDate) {
    payload.expiryDate = null;
  }

  return payload;
};

function Products() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [modalMode, setModalMode] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formData, setFormData] = useState(initialForm);

  const canManageProducts = ['admin', 'manager', 'stock_keeper'].includes(user?.role);
  const canDeleteProducts = ['admin', 'manager'].includes(user?.role);
  const isModalOpen = Boolean(modalMode);

  const counts = useMemo(
    () => ({
      total: products.length,
      active: products.filter((product) => product.isActive).length,
      lowStock: products.filter((product) => product.stockQuantity <= product.lowStockLimit).length
    }),
    [products]
  );

  const loadProducts = async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = searchQuery.trim()
        ? await searchProducts(searchQuery.trim())
        : await getProducts();
      setProducts(data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load products.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch {
      setCategories([]);
    }
  };

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const handleSearchSubmit = async (event) => {
    event.preventDefault();
    await loadProducts();
  };

  const handleClearSearch = async () => {
    setSearchQuery('');
    setIsLoading(true);
    setError('');

    try {
      const data = await getProducts();
      setProducts(data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load products.');
    } finally {
      setIsLoading(false);
    }
  };

  const openAddModal = () => {
    setSelectedProduct(null);
    setFormData({
      ...initialForm,
      category: categories.find((category) => category.isActive)?._id || ''
    });
    setModalError('');
    setModalMode('add');
  };

  const openEditModal = (product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name || '',
      barcode: product.barcode || '',
      category: typeof product.category === 'string' ? product.category : product.category?._id || '',
      buyingPrice: product.buyingPrice ?? '',
      sellingPrice: product.sellingPrice ?? '',
      stockQuantity: product.stockQuantity ?? 0,
      lowStockLimit: product.lowStockLimit ?? '',
      expiryDate: formatDateForInput(product.expiryDate),
      supplier: product.supplier || '',
      unitType: product.unitType || 'piece'
    });
    setModalError('');
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedProduct(null);
    setFormData(initialForm);
    setModalError('');
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setModalError('');

    try {
      const payload = buildProductPayload(formData);

      if (modalMode === 'add') {
        await createProduct(payload);
      } else {
        await updateProduct(selectedProduct._id, payload);
      }

      closeModal();
      await loadProducts();
    } catch (requestError) {
      setModalError(requestError.response?.data?.message || 'Unable to save product.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (product) => {
    setError('');

    try {
      await toggleProductStatus(product._id);
      await loadProducts();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update product status.');
    }
  };

  const handleSoftDelete = async (product) => {
    setError('');

    try {
      await softDeleteProduct(product._id);
      await loadProducts();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to delete product.');
    }
  };

  return (
    <div className="page-stack">
      <section className="page-header page-header-actions">
        <div>
          <p className="eyebrow">Inventory</p>
          <h1>Products</h1>
          <p>Manage product details, category assignment, pricing, stock levels, and expiry tracking.</p>
        </div>
        {canManageProducts && (
          <button className="primary-action-button" type="button" onClick={openAddModal}>
            <Plus size={18} />
            <span>Add Product</span>
          </button>
        )}
      </section>

      <section className="user-summary-grid">
        <article>
          <span>Total Products</span>
          <strong>{counts.total}</strong>
        </article>
        <article>
          <span>Active</span>
          <strong>{counts.active}</strong>
        </article>
        <article>
          <span>Low Stock</span>
          <strong>{counts.lowStock}</strong>
        </article>
        <article>
          <span>Access</span>
          <strong>{canManageProducts ? 'Manage' : 'View'}</strong>
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
              placeholder="Search product name, barcode, or supplier"
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
            <h2>Product List</h2>
            <p>Deleted products are hidden by default.</p>
          </div>
        </div>

        <div className="table-scroll">
          <table className="users-table product-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Barcode</th>
                <th>Category</th>
                <th>Buying</th>
                <th>Selling</th>
                <th>Stock</th>
                <th>Expiry</th>
                <th>Status</th>
                {(canManageProducts || canDeleteProducts) && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={(canManageProducts || canDeleteProducts) ? 9 : 8}>Loading products...</td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={(canManageProducts || canDeleteProducts) ? 9 : 8}>No products found.</td>
                </tr>
              ) : (
                products.map((product) => {
                  const isLowStock = product.stockQuantity <= product.lowStockLimit;

                  return (
                    <tr key={product._id}>
                      <td>
                        <strong>{product.name}</strong>
                        <span className="table-subtext">{product.unitType || 'piece'}</span>
                      </td>
                      <td>{product.barcode || '-'}</td>
                      <td>{getCategoryName(product)}</td>
                      <td>{Number(product.buyingPrice).toFixed(2)}</td>
                      <td>{Number(product.sellingPrice).toFixed(2)}</td>
                      <td>
                        <div className="status-badge-group">
                          <span className={`status-badge ${isLowStock ? 'warning' : 'success'}`}>
                            {product.stockQuantity}
                          </span>
                          {isLowStock && <span className="status-badge danger">Low stock</span>}
                        </div>
                      </td>
                      <td>{product.expiryDate ? new Date(product.expiryDate).toLocaleDateString() : '-'}</td>
                      <td>
                        <span className={`status-badge ${product.isActive ? 'success' : 'muted'}`}>
                          {product.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {(canManageProducts || canDeleteProducts) && (
                        <td>
                          <div className="table-actions">
                            {canManageProducts && (
                              <>
                                <button
                                  className="table-icon-button"
                                  type="button"
                                  onClick={() => openEditModal(product)}
                                  title="Edit product"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  className="table-icon-button"
                                  type="button"
                                  onClick={() => handleToggleStatus(product)}
                                  title={product.isActive ? 'Deactivate product' : 'Activate product'}
                                >
                                  {product.isActive ? <PowerOff size={16} /> : <Power size={16} />}
                                </button>
                              </>
                            )}
                            {canDeleteProducts && (
                              <button
                                className="table-icon-button danger"
                                type="button"
                                onClick={() => handleSoftDelete(product)}
                                title="Soft delete product"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen && (
        <ProductModal
          mode={modalMode}
          formData={formData}
          categories={categories}
          error={modalError}
          isSaving={isSaving}
          onChange={handleChange}
          onClose={closeModal}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

export default Products;
