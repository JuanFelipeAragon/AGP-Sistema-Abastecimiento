/**
 * Login Page — Simple authentication form
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, TextField, Button, Alert, InputAdornment, IconButton, useTheme,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import useAuthStore from '../../store/useAuthStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // TODO: Replace with actual Supabase auth
      await new Promise((r) => setTimeout(r, 800));

      // Mock login
      const mockUser = { id: '1', name: 'Admin AGP', email };
      localStorage.setItem('access_token', 'mock-token');
      setAuth({
        user: mockUser,
        role: 'admin',
        permissions: ['dashboard', 'products', 'inventory', 'sales', 'purchases', 'logistics', 'supply', 'users', 'settings'],
        token: 'mock-token',
      });
      navigate('/platform/dashboard');
    } catch {
      setError('Credenciales incorrectas. Intente de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const theme = useTheme();

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: theme.palette.mode === 'dark' ? 'background.default' : 'primary.dark',
      px: 2,
    }}>
      <Card sx={{ maxWidth: 420, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" fontWeight="bold" textAlign="center" sx={{ mb: 0.5 }}>
            AGP
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 4 }}>
            Sistema de Abastecimiento
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <TextField
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              required
              sx={{ mb: 2 }}
            />
            <TextField
              label="Contraseña"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
              sx={{ mb: 3 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <LoadingButton
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              loading={loading}
              sx={{ py: 1.5 }}
            >
              Iniciar Sesión
            </LoadingButton>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
