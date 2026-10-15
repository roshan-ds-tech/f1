import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/app.css';
import App from './App';
import { readTheme } from './state/theme';

document.documentElement.dataset.theme = readTheme();
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
