import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LockKeyhole, Mail, ShoppingCart, Sparkles, Store } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      await login(formData);
      navigate('/dashboard', { replace: true });
    } catch (loginError) {
      setError(loginError.response?.data?.message || 'Unable to sign in. Please check your details.');
    }
  };

  return (
    <main className="login-page">
      <section className="login-panel" aria-label="Login form">
        <aside className="login-visual-panel" aria-label="HeX Supermarket brand">
          <span className="login-glow login-glow-one" aria-hidden="true" />
          <span className="login-glow login-glow-two" aria-hidden="true" />
          <span className="login-dot-grid" aria-hidden="true" />

          <div className="login-brand">
            <div className="login-brand-icon">
              <ShoppingCart size={30} />
            </div>
            <div>
              <h1>HeX Supermarket</h1>
              <p>Enterprise retail suite</p>
            </div>
          </div>

          <div className="login-illustration" aria-hidden="true">
            <div className="login-illustration-frame">
              <div className="login-cart-orbit">
                <ShoppingCart size={112} strokeWidth={1.6} />
              </div>
              <span className="grocery-pill grocery-pill-one">Fresh</span>
              <span className="grocery-pill grocery-pill-two">Stock</span>
              <span className="grocery-pill grocery-pill-three">POS</span>
            </div>
          </div>

          <div className="login-visual-copy">
            <span className="login-kicker">
              <Sparkles size={16} />
              Smart Retail
            </span>
            <h2>Smart Shopping, Better Living</h2>
            <p>Manage sales, products, inventory, and customers from one premium supermarket workspace.</p>
          </div>
        </aside>

        <div className="login-form-panel">
          <form className="login-card" onSubmit={handleSubmit}>
            <div className="form-heading login-form-heading">
              <div className="login-form-mark">
                <Store size={22} />
              </div>
              <h2>Welcome Back!</h2>
              <p>Sign in to continue to your account.</p>
            </div>

            {error && <div className="form-error login-error">{error}</div>}

            <label className="input-group">
              <span>Email address</span>
              <div className="input-shell">
                <Mail size={18} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="admin@example.com"
                  autoComplete="email"
                  required
                />
              </div>
            </label>

            <label className="input-group">
              <span>Password</span>
              <div className="input-shell">
                <LockKeyhole size={18} />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
              </div>
            </label>

            <button className="primary-button login-submit" type="submit" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;
