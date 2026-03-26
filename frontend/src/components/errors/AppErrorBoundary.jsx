import { Component } from 'react';
import { Box, Typography, Button, Container } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App-level error caught:', error, errorInfo);
    // Future: report to Sentry/LogRocket
  }

  handleReload = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#f5f5f5',
          }}
        >
          <Container maxWidth="sm" sx={{ textAlign: 'center' }}>
            <ErrorOutlineIcon sx={{ fontSize: 80, color: '#d32f2f', mb: 2 }} />
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Error inesperado en la aplicación
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
              Ha ocurrido un error que impide mostrar la aplicación.
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mb: 4 }}>
              El error ha sido registrado. Si el problema persiste, contacte al equipo técnico.
            </Typography>
            <Button variant="contained" size="large" onClick={this.handleReload}>
              Recargar Aplicación
            </Button>
          </Container>
        </Box>
      );
    }
    return this.props.children;
  }
}
