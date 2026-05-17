import { NavLink } from 'react-router-dom';
import { Store, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { roleMenus } from '../../data/roleMenus.js';

function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();
  const menuItems = roleMenus[user?.role] || [];

  return (
    <>
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">
            <Store size={22} />
          </div>
          <div>
            <span className="brand-title">HeX Supermarket</span>
            <span className="brand-subtitle">Enterprise retail suite</span>
          </div>
          <button className="sidebar-close" type="button" onClick={onClose} aria-label="Close sidebar">
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                key={item.path}
                to={item.path}
                onClick={onClose}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
      {isOpen && <button className="sidebar-overlay" type="button" aria-label="Close sidebar" onClick={onClose} />}
    </>
  );
}

export default Sidebar;
