import { Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import useAuthStore from '../store/useAuthStore';

export default function ProtectedRoute({ children, requiredRole, requiredPermission }) {
  const { isAuthenticated, loading, role, permissions } = useAuthStore();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // For development: allow access without authentication
  // TODO: Remove this bypass for production
  if (!isAuthenticated && import.meta.env.PROD) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && role !== requiredRole && role !== 'admin') {
    return <Navigate to="/platform/dashboard" replace />;
  }

  if (requiredPermission && role !== 'admin' && !permissions?.includes(requiredPermission)) {
    return <Navigate to="/platform/dashboard" replace />;
  }

  return children;
}
