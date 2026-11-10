import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';

// Note: no <StrictMode> — its dev-only double mount conflicts with drei's <Html> portals.
createRoot(document.getElementById('root')!).render(<App />);
