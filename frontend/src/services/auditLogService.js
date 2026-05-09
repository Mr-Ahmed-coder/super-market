import api from '../api/axios.js';

export const getAuditLogs = async () => {
  const response = await api.get('/audit-logs');
  return response.data.data.logs;
};
