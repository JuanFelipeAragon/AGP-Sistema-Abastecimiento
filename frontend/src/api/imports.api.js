/**
 * Imports API — File upload endpoints
 */
import axiosClient from './axiosClient';

const importsApi = {
  upload: (file, type) => {
    const formData = new FormData();
    formData.append('file', file);
    if (type) formData.append('type', type);
    return axiosClient.post('/api/imports/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
};

export default importsApi;
