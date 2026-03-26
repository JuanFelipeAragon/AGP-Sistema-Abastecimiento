import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Global styles reset
const style = document.createElement('style');
style.textContent = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
  #root { min-height: 100vh; }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
