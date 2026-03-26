import { Box, Typography, Button } from '@mui/material';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ textAlign: 'center', py: 10 }}>
      <SearchOffIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        404
      </Typography>
      <Typography variant="h6" color="text.secondary" gutterBottom>
        Página no encontrada
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
        La página que buscas no existe o fue movida. Verifica la URL o regresa al dashboard.
      </Typography>
      <Button variant="contained" onClick={() => navigate('/platform/dashboard')}>
        Ir al Dashboard
      </Button>
    </Box>
  );
}
