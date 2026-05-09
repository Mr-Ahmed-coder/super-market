import { useEffect, useMemo, useState } from 'react';
import { Edit, Lock, LockOpen, Plus, Power, PowerOff, Trash2, X } from 'lucide-react';
import {
  createUser,
  getUsers,
  setUserActiveStatus,
  setUserLockStatus,
  softDeleteUser,
  updateUser
} from '../services/userService.js';

const roles = ['admin', 'manager', 'cashier', 'stock_keeper', 'accountant'];

const initialForm = {
  name: '',
  email: '',
  password: '',
  role: 'cashier',
  isActive: true,
  isLocked: false
};

const formatRole = (role) => role.replace('_', ' ');

function UsersPage() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalMode, setModalMode] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState(initialForm);

  const isModalOpen = Boolean(modalMode);

  const userCounts = useMemo(
    () => ({
      total: users.length,
      active: users.filter((user) => user.isActive && !user.isDeleted).length,
      locked: users.filter((user) => user.isLocked).length,
      deleted: users.filter((user) => user.isDeleted).length
    }),
    [users]
  );

  const loadUsers = async () => {
    setIsLoading(true);
    setError('');

    try {
      const nextUsers = await getUsers();
      setUsers(nextUsers);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load users.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openAddModal = () => {
    setSelectedUser(null);
    setFormData(initialForm);
    setError('');
    setModalMode('add');
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      isActive: user.isActive,
      isLocked: user.isLocked
    });
    setError('');
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedUser(null);
    setFormData(initialForm);
  };

  const handleChange = (event) => {
    const { name, type, checked, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const replaceUser = (updatedUser) => {
    setUsers((current) => current.map((user) => (user._id === updatedUser._id ? updatedUser : user)));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      if (modalMode === 'add') {
        const createdUser = await createUser(formData);
        setUsers((current) => [createdUser, ...current]);
      } else {
        const payload = { ...formData };

        if (!payload.password) {
          delete payload.password;
        }

        const updatedUser = await updateUser(selectedUser._id, payload);
        replaceUser(updatedUser);
      }

      closeModal();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save user.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleActiveToggle = async (user) => {
    const updatedUser = await setUserActiveStatus(user._id, !user.isActive);
    replaceUser(updatedUser);
  };

  const handleLockToggle = async (user) => {
    const updatedUser = await setUserLockStatus(user._id, !user.isLocked);
    replaceUser(updatedUser);
  };

  const handleSoftDelete = async (user) => {
    const updatedUser = await softDeleteUser(user._id);
    replaceUser(updatedUser);
  };

  return (
    <div className="page-stack">
      <section className="page-header page-header-actions">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>User Management</h1>
          <p>Create staff accounts, manage access, and control operational permissions.</p>
        </div>
        <button className="primary-action-button" type="button" onClick={openAddModal}>
          <Plus size={18} />
          <span>Add User</span>
        </button>
      </section>

      <section className="user-summary-grid">
        <article>
          <span>Total Users</span>
          <strong>{userCounts.total}</strong>
        </article>
        <article>
          <span>Active</span>
          <strong>{userCounts.active}</strong>
        </article>
        <article>
          <span>Locked</span>
          <strong>{userCounts.locked}</strong>
        </article>
        <article>
          <span>Deleted</span>
          <strong>{userCounts.deleted}</strong>
        </article>
      </section>

      {error && !isModalOpen && <div className="form-error">{error}</div>}

      <section className="panel-card users-panel">
        <div className="table-header">
          <div>
            <h2>System Users</h2>
            <p>Admin-only user management for all supermarket staff roles.</p>
          </div>
        </div>

        <div className="table-scroll">
          <table className="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6">Loading users...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6">No users found.</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id} className={user.isDeleted ? 'deleted-row' : ''}>
                    <td>
                      <strong>{user.name}</strong>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className="role-pill">{formatRole(user.role)}</span>
                    </td>
                    <td>
                      <div className="status-badge-group">
                        <span className={`status-badge ${user.isActive ? 'success' : 'muted'}`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {user.isLocked && <span className="status-badge warning">Locked</span>}
                        {user.isDeleted && <span className="status-badge danger">Deleted</span>}
                      </div>
                    </td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="table-icon-button"
                          type="button"
                          onClick={() => openEditModal(user)}
                          disabled={user.isDeleted}
                          title="Edit user"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          className="table-icon-button"
                          type="button"
                          onClick={() => handleActiveToggle(user)}
                          disabled={user.isDeleted}
                          title={user.isActive ? 'Deactivate user' : 'Activate user'}
                        >
                          {user.isActive ? <PowerOff size={16} /> : <Power size={16} />}
                        </button>
                        <button
                          className="table-icon-button"
                          type="button"
                          onClick={() => handleLockToggle(user)}
                          disabled={user.isDeleted}
                          title={user.isLocked ? 'Unlock user' : 'Lock user'}
                        >
                          {user.isLocked ? <LockOpen size={16} /> : <Lock size={16} />}
                        </button>
                        <button
                          className="table-icon-button danger"
                          type="button"
                          onClick={() => handleSoftDelete(user)}
                          disabled={user.isDeleted}
                          title="Soft delete user"
                        >
                          <Trash2 size={16} />
                        </button>
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
        <div className="modal-backdrop" role="presentation">
          <section className="user-modal" role="dialog" aria-modal="true" aria-labelledby="user-modal-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">{modalMode === 'add' ? 'Create' : 'Edit'}</p>
                <h2 id="user-modal-title">{modalMode === 'add' ? 'Add User' : 'Edit User'}</h2>
              </div>
              <button className="modal-close" type="button" onClick={closeModal} aria-label="Close modal">
                <X size={20} />
              </button>
            </div>

            {error && <div className="form-error">{error}</div>}

            <form className="user-form" onSubmit={handleSubmit}>
              <label className="input-group">
                <span>Name</span>
                <input name="name" value={formData.name} onChange={handleChange} required />
              </label>

              <label className="input-group">
                <span>Email</span>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required />
              </label>

              <label className="input-group">
                <span>{modalMode === 'add' ? 'Password' : 'New password'}</span>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  minLength={8}
                  required={modalMode === 'add'}
                  placeholder={modalMode === 'edit' ? 'Leave blank to keep current password' : ''}
                />
              </label>

              <label className="input-group">
                <span>Role</span>
                <select name="role" value={formData.role} onChange={handleChange}>
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {formatRole(role)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="form-switches">
                <label>
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                  />
                  <span>Active</span>
                </label>
                <label>
                  <input
                    type="checkbox"
                    name="isLocked"
                    checked={formData.isLocked}
                    onChange={handleChange}
                  />
                  <span>Locked</span>
                </label>
              </div>

              <div className="modal-actions">
                <button className="secondary-button" type="button" onClick={closeModal}>
                  Cancel
                </button>
                <button className="primary-button compact" type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save User'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default UsersPage;
