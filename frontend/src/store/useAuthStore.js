/**
 * Auth Store — Zustand
 * Manages user session, role, and permissions.
 */
import { create } from 'zustand';

const useAuthStore = create((set) => ({
  user: null,
  role: 'admin',
  permissions: ['dashboard', 'products', 'inventory', 'sales', 'purchases', 'logistics', 'supply', 'users', 'settings'],
  token: null,
  isAuthenticated: false,
  loading: true,

  setAuth: ({ user, role, permissions, token }) =>
    set({ user, role, permissions, token, isAuthenticated: true, loading: false }),

  logout: () => {
    localStorage.removeItem('access_token');
    set({
      user: null,
      role: 'visitor',
      permissions: [],
      token: null,
      isAuthenticated: false,
      loading: false,
    });
    // Navigate without full page reload to preserve SPA state
    // Use window.location only as fallback since stores can't access React Router
    if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
      window.location.replace('/');
    }
  },

  setLoading: (loading) => set({ loading }),

  initAuth: async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      set({ loading: false });
      return;
    }
    try {
      // TODO: Call GET /api/auth/me to validate token and get user data
      set({
        user: { id: '1', name: 'Admin AGP', email: 'admin@agp.com' },
        role: 'admin',
        permissions: ['dashboard', 'products', 'inventory', 'sales', 'purchases', 'logistics', 'supply', 'users', 'settings'],
        token,
        isAuthenticated: true,
        loading: false,
      });
    } catch {
      localStorage.removeItem('access_token');
      set({ loading: false });
    }
  },
}));

export default useAuthStore;
