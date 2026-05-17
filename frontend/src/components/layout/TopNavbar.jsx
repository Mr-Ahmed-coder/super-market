import { LogOut, Menu, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

function TopNavbar({ onMenuClick }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="top-navbar">
      <button className="icon-button menu-button" type="button" onClick={onMenuClick} aria-label="Open sidebar">
        <Menu size={22} />
      </button>

      <div className="navbar-title">
        <span>HeX Supermarket</span>
        <small>Management System</small>
      </div>

      <div className="navbar-search">
        <Search size={18} />
        <input type="search" placeholder="Search inventory, sales, users..." />
      </div>

      <div className="navbar-actions">
        <div className="user-chip">
          <span className="user-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
          <div>
            <span className="user-name">{user?.name || 'User'}</span>
            <span className="user-role">{user?.role?.replace('_', ' ') || 'staff'}</span>
          </div>
        </div>
        <button className="logout-button" type="button" onClick={handleLogout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}

export default TopNavbar;
