import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import './styles/global.css';
import { loadEngineExtensions } from './engines/loadExtensions';

void loadEngineExtensions().then(() => createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
));
