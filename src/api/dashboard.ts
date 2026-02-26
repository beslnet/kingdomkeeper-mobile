import api from './api';

export const getDashboard = async () => {
  const { data } = await api.get('/api/dashboard/');
  return data;
};
