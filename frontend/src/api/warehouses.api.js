/**
 * Warehouses API — CRUD for bodegas/locations
 */
import axiosClient from './axiosClient';

const _cache = {};
const CACHE_TTL = 5 * 60 * 1000;

function getCached(key, fetcher) {
  const entry = _cache[key];
  if (entry && Date.now() - entry.ts < CACHE_TTL) {
    return Promise.resolve(entry.data);
  }
  return fetcher().then((data) => {
    _cache[key] = { data, ts: Date.now() };
    return data;
  });
}

function invalidateCache(prefix) {
  Object.keys(_cache).forEach((k) => {
    if (k.startsWith(prefix)) delete _cache[k];
  });
}

const warehousesApi = {
  getWarehouses: (params = {}) => {
    const hasFilters = Object.values(params).some((v) => v !== undefined && v !== null && v !== '');
    if (hasFilters) {
      return axiosClient.get('/api/warehouses', { params }).then((r) => r.data);
    }
    return getCached('wh:list', () =>
      axiosClient.get('/api/warehouses').then((r) => r.data)
    );
  },

  getWarehouseById: (id) =>
    axiosClient.get(`/api/warehouses/${id}`).then((r) => r.data),

  createWarehouse: (data) =>
    axiosClient.post('/api/warehouses', data).then((r) => r.data)
      .then((res) => { invalidateCache('wh:'); return res; }),

  updateWarehouse: (id, data) =>
    axiosClient.put(`/api/warehouses/${id}`, data).then((r) => r.data)
      .then((res) => { invalidateCache('wh:'); return res; }),

  bulkAction: (actionData) =>
    axiosClient.post('/api/warehouses/bulk', actionData).then((r) => r.data)
      .then((res) => { invalidateCache('wh:'); return res; }),
};

export default warehousesApi;
