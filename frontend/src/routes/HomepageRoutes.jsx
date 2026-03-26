import { Routes, Route } from 'react-router-dom';
import { Box, Typography, Button, Container, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';

function HomePage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      bgcolor: isDark ? 'background.default' : 'primary.dark',
      color: 'white',
    }}>
      <Container maxWidth="md" sx={{ textAlign: 'center' }}>
        <Typography variant="h2" fontWeight="bold" gutterBottom>AGP</Typography>
        <Typography variant="h5" sx={{ mb: 1, opacity: 0.9 }}>
          Aluminios y Perfiles de Colombia
        </Typography>
        <Typography variant="body1" sx={{ mb: 4, opacity: 0.7 }}>
          Sistema de Gestión de Abastecimiento e Inventario
        </Typography>
        <Button
          variant="contained"
          size="large"
          onClick={() => navigate('/platform/dashboard')}
          sx={{
            bgcolor: isDark ? 'primary.main' : 'white',
            color: isDark ? 'white' : 'primary.dark',
            '&:hover': {
              bgcolor: isDark ? 'primary.dark' : 'grey.100',
            },
            px: 4,
            py: 1.5,
            fontSize: '1rem',
          }}
        >
          Ingresar al Sistema
        </Button>
      </Container>
    </Box>
  );
}

export default function HomepageRoutes() {
  return (
    <Routes>
      <Route index element={<HomePage />} />
    </Routes>
  );
}
