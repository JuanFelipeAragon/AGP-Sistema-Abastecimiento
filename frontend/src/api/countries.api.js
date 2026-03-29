/**
 * Countries API client — CRUD for countries + product availability.
 */
import axiosClient from './axiosClient';

// ── Simple in-memory cache ──
const cache = {};
const CACHE_TTL = 5 * 60 * 1000;

function cached(key, fetcher) {
  const entry = cache[key];
  if (entry && Date.now() - entry.ts < CACHE_TTL) return Promise.resolve(entry.data);
  return fetcher().then((data) => { cache[key] = { data, ts: Date.now() }; return data; });
}

function invalidate(prefix) {
  for (const k of Object.keys(cache)) if (k.startsWith(prefix)) delete cache[k];
}

// ── Countries CRUD ──
const countriesApi = {
  getCountries: (includeInactive = true) =>
    cached(`countries:${includeInactive}`, () =>
      axiosClient.get('/api/countries', { params: { include_inactive: includeInactive } }).then(r => r.data)
    ),

  getCountriesSimple: () =>
    cached('countries:simple', () =>
      axiosClient.get('/api/countries/simple').then(r => r.data)
    ),

  getCountry: (id) =>
    axiosClient.get(`/api/countries/${id}`).then(r => r.data),

  createCountry: (data) =>
    axiosClient.post('/api/countries', data).then(r => { invalidate('countries'); return r.data; }),

  updateCountry: (id, data) =>
    axiosClient.put(`/api/countries/${id}`, data).then(r => { invalidate('countries'); return r.data; }),

  // ── Product Availability ──
  getAvailability: ({ productId, countryId } = {}) =>
    axiosClient.get('/api/countries/availability/list', {
      params: { product_id: productId, country_id: countryId },
    }).then(r => r.data),

  getProductCountries: (productId) =>
    axiosClient.get(`/api/countries/availability/product/${productId}`).then(r => r.data),

  bulkAssign: (data) =>
    axiosClient.post('/api/countries/availability/assign', data).then(r => { invalidate('countries'); return r.data; }),

  bulkRemove: (data) =>
    axiosClient.post('/api/countries/availability/remove', data).then(r => { invalidate('countries'); return r.data; }),
};

export default countriesApi;
