import { useState, useCallback, useEffect, useRef } from 'react';

const STORAGE_PREFIX = 'agp_filters_';

/**
 * usePersistedFilters — persists filter state to localStorage.
 *
 * Survives navigation between modules AND full app restart.
 * Each module gets its own key (e.g., "agp_filters_productos_base").
 *
 * @param {string} moduleKey — unique key per module (e.g., "productos_base")
 * @param {object} defaultValues — initial filter values (e.g., { subcatFilter: '', tipoFilter: '' })
 * @returns {[object, function, function]} — [filters, setFilter, clearAll]
 *
 * Usage:
 *   const [filters, setFilter, clearFilters] = usePersistedFilters('productos_base', {
 *     categoriaFilter: '',
 *     subcatFilter: '',
 *     sistemaFilter: '',
 *     tipoFilter: '',
 *     groupBy: null,
 *   });
 *
 *   // Read:  filters.subcatFilter
 *   // Write: setFilter('subcatFilter', 'Perfiles')
 *   // Clear: clearFilters()
 */
export default function usePersistedFilters(moduleKey, defaultValues) {
  const storageKey = STORAGE_PREFIX + moduleKey;
  const defaultsRef = useRef(defaultValues);

  // Load from localStorage on mount
  const [filters, setFilters] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle new fields added after initial save
        return { ...defaultValues, ...parsed };
      }
    } catch (e) {
      // Corrupted data — reset
    }
    return { ...defaultValues };
  });

  // Persist to localStorage whenever filters change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(filters));
    } catch (e) {
      // Storage full or unavailable — fail silently
    }
  }, [storageKey, filters]);

  // Set a single filter value
  const setFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Clear all filters back to defaults
  const clearFilters = useCallback(() => {
    setFilters({ ...defaultsRef.current });
  }, []);

  return [filters, setFilter, clearFilters];
}
