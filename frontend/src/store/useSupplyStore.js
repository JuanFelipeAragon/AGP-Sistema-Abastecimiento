/**
 * Supply Store — Zustand
 * Manages supply/procurement module state.
 */
import { create } from 'zustand';

const useSupplyStore = create((set) => ({
  decisions: [],
  dashboardSummary: null,
  parameters: {
    lead_time_months: 4,
    service_level_z: 1.65,
    coverage_months: 6,
  },
  loading: false,
  error: null,

  setDecisions: (decisions) => set({ decisions }),
  setDashboardSummary: (dashboardSummary) => set({ dashboardSummary }),
  setParameters: (parameters) => set({ parameters }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));

export default useSupplyStore;
