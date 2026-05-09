import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { getSettings, updateSettings } from '../services/settingsService.js';

const initialSettings = {
  supermarketName: '',
  logo: '',
  phone: '',
  address: '',
  currency: 'USD',
  taxPercentage: 0,
  receiptFooter: '',
  lowStockLimit: 10
};

function SettingsPage() {
  const [settings, setSettings] = useState(initialSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      setError('');

      try {
        const data = await getSettings();
        setSettings({
          supermarketName: data.supermarketName || '',
          logo: data.logo || '',
          phone: data.phone || '',
          address: data.address || '',
          currency: data.currency || 'USD',
          taxPercentage: data.taxPercentage ?? 0,
          receiptFooter: data.receiptFooter || '',
          lowStockLimit: data.lowStockLimit ?? 10
        });
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to load settings.');
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleChange = (event) => {
    const { name, value, type } = event.target;
    setSettings((current) => ({
      ...current,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const updatedSettings = await updateSettings(settings);
      setSettings(updatedSettings);
      setSuccess('Settings updated successfully.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>System Settings</h1>
          <p>Manage store identity, receipts, tax, currency, and low-stock controls.</p>
        </div>
      </section>

      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}

      <section className="panel-card settings-panel">
        {isLoading ? (
          <p className="muted-copy">Loading settings...</p>
        ) : (
          <form className="settings-form" onSubmit={handleSubmit}>
            <label className="input-group">
              <span>Supermarket Name</span>
              <input
                name="supermarketName"
                value={settings.supermarketName}
                onChange={handleChange}
                required
              />
            </label>

            <label className="input-group">
              <span>Logo URL</span>
              <input name="logo" value={settings.logo} onChange={handleChange} placeholder="https://..." />
            </label>

            <label className="input-group">
              <span>Phone</span>
              <input name="phone" value={settings.phone} onChange={handleChange} />
            </label>

            <label className="input-group">
              <span>Address</span>
              <textarea name="address" value={settings.address} onChange={handleChange} rows="3" />
            </label>

            <div className="form-grid-two">
              <label className="input-group">
                <span>Currency</span>
                <input name="currency" value={settings.currency} onChange={handleChange} required />
              </label>

              <label className="input-group">
                <span>Tax Percentage</span>
                <input
                  type="number"
                  name="taxPercentage"
                  value={settings.taxPercentage}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                />
              </label>
            </div>

            <label className="input-group">
              <span>Receipt Footer</span>
              <textarea name="receiptFooter" value={settings.receiptFooter} onChange={handleChange} rows="3" />
            </label>

            <label className="input-group">
              <span>Low Stock Limit</span>
              <input
                type="number"
                name="lowStockLimit"
                value={settings.lowStockLimit}
                onChange={handleChange}
                min="0"
              />
            </label>

            <div className="settings-actions">
              <button className="primary-action-button" type="submit" disabled={isSaving}>
                <Save size={18} />
                <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

export default SettingsPage;
