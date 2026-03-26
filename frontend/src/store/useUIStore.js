/**
 * UI Store — Zustand
 * Manages sidebar state, dark mode, and global UI settings.
 * Both sidebar and darkMode are persisted in localStorage.
 */
import { create } from 'zustand';

const useUIStore = create((set) => ({
  sidebarOpen: localStorage.getItem('sidebarOpen') !== 'false',
  darkMode: localStorage.getItem('darkMode') === 'true',

  toggleSidebar: () =>
    set((s) => {
      const next = !s.sidebarOpen;
      localStorage.setItem('sidebarOpen', String(next));
      return { sidebarOpen: next };
    }),
  closeSidebar: () => {
    localStorage.setItem('sidebarOpen', 'false');
    return set({ sidebarOpen: false });
  },
  openSidebar: () => {
    localStorage.setItem('sidebarOpen', 'true');
    return set({ sidebarOpen: true });
  },

  toggleDarkMode: () =>
    set((s) => {
      const next = !s.darkMode;
      localStorage.setItem('darkMode', String(next));
      return { darkMode: next };
    }),
}));

export default useUIStore;
