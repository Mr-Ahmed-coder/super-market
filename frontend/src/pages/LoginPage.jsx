import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LockKeyhole, Mail, Store } from 'lucide-react';
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
        <div className="login-brand">
          <div className="login-brand-icon">
            <Store size={30} />
          </div>
          <div>
            <h1>HeX Supermarket</h1>
            <p>Modern supermarket management dashboard</p>
          </div>
        </div>

        <form className="login-card" onSubmit={handleSubmit}>
          <div className="form-heading">
            <h2>Welcome back</h2>
            <p>Sign in to continue to your workspace.</p>
          </div>

          {error && <div className="form-error">{error}</div>}

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

          <button className="primary-button" type="submit" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </section>
    </main>
  );
}

export default LoginPage;
