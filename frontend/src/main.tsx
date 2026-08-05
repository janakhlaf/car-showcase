import React from 'react'; import ReactDOM from 'react-dom/client'; import axios from 'axios'; import './services/api'; import './globals.css'; import App from './App';
axios.defaults.withCredentials=true; document.documentElement.style.setProperty('--font-archivo','Archivo'); document.documentElement.style.setProperty('--font-manrope','Manrope'); document.documentElement.style.setProperty('--font-instrument','Instrument Serif');
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
