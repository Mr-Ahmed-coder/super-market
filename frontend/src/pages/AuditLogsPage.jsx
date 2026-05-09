import { useEffect, useMemo, useState } from 'react';
import { getAuditLogs } from '../services/auditLogService.js';

const formatRole = (role) => role?.replace('_', ' ') || 'unknown';

function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadLogs = async () => {
      setIsLoading(true);
      setError('');

      try {
        const data = await getAuditLogs();
        setLogs(data);
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to load audit logs.');
      } finally {
        setIsLoading(false);
      }
    };

    loadLogs();
  }, []);

  const counts = useMemo(
    () => ({
      total: logs.length,
      users: logs.filter((log) => log.module === 'User Management').length,
      settings: logs.filter((log) => log.module === 'Settings').length
    }),
    [logs]
  );

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Controls</p>
          <h1>Audit Logs</h1>
          <p>Review administrative activity across user management and system settings.</p>
        </div>
      </section>

      <section className="user-summary-grid">
        <article>
          <span>Total Logs</span>
          <strong>{counts.total}</strong>
        </article>
        <article>
          <span>User Actions</span>
          <strong>{counts.users}</strong>
        </article>
        <article>
          <span>Settings Actions</span>
          <strong>{counts.settings}</strong>
        </article>
        <article>
          <span>Visible Limit</span>
          <strong>200</strong>
        </article>
      </section>

      {error && <div className="form-error">{error}</div>}

      <section className="panel-card users-panel">
        <div className="table-header">
          <div>
            <h2>Activity Trail</h2>
            <p>Audit logs are append-only and are not hard deleted.</p>
          </div>
        </div>

        <div className="table-scroll">
          <table className="users-table audit-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>User</th>
                <th>Role</th>
                <th>Action</th>
                <th>Module</th>
                <th>Description</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="7">Loading audit logs...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="7">No audit logs found.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id}>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
                    <td>
                      <strong>{log.user?.name || 'Unknown user'}</strong>
                      <span className="table-subtext">{log.user?.email || 'No email available'}</span>
                    </td>
                    <td>
                      <span className="role-pill">{formatRole(log.user?.role)}</span>
                    </td>
                    <td>
                      <span className="status-badge success">{log.action.replaceAll('_', ' ')}</span>
                    </td>
                    <td>{log.module}</td>
                    <td>{log.description}</td>
                    <td>{log.ipAddress || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default AuditLogsPage;
