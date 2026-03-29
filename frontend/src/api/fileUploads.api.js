/**
 * File Uploads API — Audit trail and file processing endpoints.
 */
import axiosClient from './axiosClient';

let cache = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

function invalidate() {
  cache = null;
  cacheTime = 0;
}

const fileUploadsApi = {
  getUploads: async (params = {}) => {
    const hasFilters = params.search || params.file_type || params.status;
    if (!hasFilters && cache && Date.now() - cacheTime < CACHE_TTL) return cache;
    const r = await axiosClient.get('/api/file-uploads', { params });
    const data = r.data;
    if (!hasFilters) { cache = data; cacheTime = Date.now(); }
    return data;
  },

  getUploadById: (id) =>
    axiosClient.get(`/api/file-uploads/${id}`).then((r) => r.data),

  getUploadDiff: (id) =>
    axiosClient.get(`/api/file-uploads/${id}/diff`).then((r) => r.data),

  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    invalidate();
    return axiosClient
      .post('/api/file-uploads/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  applySync: (id) => {
    invalidate();
    return axiosClient.post(`/api/file-uploads/${id}/apply`).then((r) => r.data);
  },

  deleteUpload: (id) => {
    invalidate();
    return axiosClient.delete(`/api/file-uploads/${id}`).then((r) => r.data);
  },
};

export default fileUploadsApi;
