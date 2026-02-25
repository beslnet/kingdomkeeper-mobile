import api from './api';

export const getMyProfile = async () => {
  const res = await api.get('/api/auth/me/');
  return res.data;
};

export const updateProfile = async (data: { nombre?: string; apellidos?: string }) => {
  const res = await api.patch('/api/auth/me/', data);
  return res.data;
};

export const getMyMemberData = async () => {
  const res = await api.get('/api/perfil/mis-datos/');
  return res.data;
};

export const updateMyMemberData = async (data: {
  telefono?: string;
  tipo_documento?: string;
  documento_identidad?: string;
  fecha_nacimiento?: string;
  genero?: string;
}) => {
  const res = await api.patch('/api/perfil/mis-datos/', data);
  return res.data;
};

export const changePassword = async (currentPassword: string, newPassword: string) => {
  const res = await api.post('/api/auth/cambiar-contrasena/', {
    current_password: currentPassword,
    new_password: newPassword,
  });
  return res.data;
};

export const uploadProfilePhoto = async (formData: FormData) => {
  const res = await api.post('/api/perfil/upload-foto/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};
