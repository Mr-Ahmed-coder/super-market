import api from '../api/axios.js';

export const getUsers = async () => {
  const response = await api.get('/users');
  return response.data.data.users;
};

export const createUser = async (payload) => {
  const response = await api.post('/users', payload);
  return response.data.data.user;
};

export const updateUser = async (id, payload) => {
  const response = await api.patch(`/users/${id}`, payload);
  return response.data.data.user;
};

export const setUserActiveStatus = async (id, isActive) => {
  const response = await api.patch(`/users/${id}/active`, { isActive });
  return response.data.data.user;
};

export const setUserLockStatus = async (id, isLocked) => {
  const response = await api.patch(`/users/${id}/lock`, { isLocked });
  return response.data.data.user;
};

export const softDeleteUser = async (id) => {
  const response = await api.delete(`/users/${id}`);
  return response.data.data.user;
};
