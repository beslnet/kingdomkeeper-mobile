import api from './api';

type RegisterPushDevicePayload = {
  token: string;
  device_type: 'android' | 'ios';
  device_name?: string;
};

export const registerPushDevice = async (payload: RegisterPushDevicePayload) => {
  const res = await api.post('/api/notificaciones/device-tokens/register/', payload);
  return res.data;
};

export const unregisterPushDeviceToken = async (token: string) => {
  const res = await api.post('/api/notificaciones/device-tokens/unregister/', { token });
  return res.data;
};
