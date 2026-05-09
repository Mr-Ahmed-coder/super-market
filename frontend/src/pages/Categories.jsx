import { useEffect, useMemo, useState } from 'react';
import { Edit, Plus, Power, PowerOff, Trash2 } from 'lucide-react';
import CategoryModal from '../components/CategoryModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  createCategory,
  getCategories,
  softDeleteCategory,
  toggleCategoryStatus,
  updateCategory
} from '../services/categoryService.js';

const initialForm = {
  name: '',
  description: '',
  isActive: true
};

function Categories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [modalMode, setModalMode] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [formData, setFormData] = useState(initialForm);

  const canManageCategories = ['admin', 'manager'].includes(user?.role);
  const isModalOpen = Boolean(modalMode);

  const counts = useMemo(
    () => ({
      total: categories.length,
      active: categories.filter((category) => category.isActive).length,
      inactive: categories.filter((category) => !category.isActive).length
    }),
    [categories]
  );

  const loadCategories = async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await getCategories();
      setCategories(data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load categories.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const openAddModal = () => {
    setFormData(initialForm);
    setSelectedCategory(null);
    setModalError('');
    setModalMode('add');
  };

  const openEditModal = (category) => {
    setFormData({
      name: category.name,
      description: category.description || '',
      isActive: category.isActive
    });
    setSelectedCategory(category);
    setModalError('');
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedCategory(null);
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setModalError('');

    try {
      if (modalMode === 'add') {
        await createCategory(formData);
      } else {
        await updateCategory(selectedCategory._id, formData);
      }

      closeModal();
      await loadCategories();
    } catch (requestError) {
      setModalError(requestError.response?.data?.message || 'Unable to save category.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (category) => {
    setError('');

    try {
      await toggleCategoryStatus(category._id);
      await loadCategories();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update category status.');
    }
  };

  const handleSoftDelete = async (category) => {
    setError('');

    try {
      await softDeleteCategory(category._id);
      await loadCategories();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to delete category.');
    }
  };

  return (
    <div className="page-stack">
      <section className="page-header page-header-actions">
        <div>
          <p className="eyebrow">Inventory</p>
          <h1>Categories</h1>
          <p>Organize products into clean, searchable supermarket departments.</p>
        </div>
        {canManageCategories && (
          <button className="primary-action-button" type="button" onClick={openAddModal}>
            <Plus size={18} />
            <span>Add Category</span>
          </button>
        )}
      </section>

      <section className="user-summary-grid">
        <article>
          <span>Total Categories</span>
          <strong>{counts.total}</strong>
        </article>
        <article>
          <span>Active</span>
          <strong>{counts.active}</strong>
        </article>
        <article>
          <span>Inactive</span>
          <strong>{counts.inactive}</strong>
        </article>
        <article>
          <span>Access</span>
          <strong>{canManageCategories ? 'Manage' : 'View'}</strong>
        </article>
      </section>

      {error && <div className="form-error">{error}</div>}

      <section className="panel-card users-panel">
        <div className="table-header">
          <div>
            <h2>Category List</h2>
            <p>Deleted categories are hidden by default.</p>
          </div>
        </div>

        <div className="table-scroll">
          <table className="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Status</th>
                <th>Created</th>
                {canManageCategories && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={canManageCategories ? 5 : 4}>Loading categories...</td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={canManageCategories ? 5 : 4}>No categories found.</td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr key={category._id}>
                    <td>
                      <strong>{category.name}</strong>
                    </td>
                    <td>{category.description || '-'}</td>
                    <td>
                      <span className={`status-badge ${category.isActive ? 'success' : 'muted'}`}>
                        {category.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{new Date(category.createdAt).toLocaleDateString()}</td>
                    {canManageCategories && (
                      <td>
                        <div className="table-actions">
                          <button
                            className="table-icon-button"
                            type="button"
                            onClick={() => openEditModal(category)}
                            title="Edit category"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            className="table-icon-button"
                            type="button"
                            onClick={() => handleToggleStatus(category)}
                            title={category.isActive ? 'Deactivate category' : 'Activate category'}
                          >
                            {category.isActive ? <PowerOff size={16} /> : <Power size={16} />}
                          </button>
                          <button
                            className="table-icon-button danger"
                            type="button"
                            onClick={() => handleSoftDelete(category)}
                            title="Soft delete category"
                          >
                            <Trash2 size={16} />
                          </button>
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
        <CategoryModal
          mode={modalMode}
          formData={formData}
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

export default Categories;
