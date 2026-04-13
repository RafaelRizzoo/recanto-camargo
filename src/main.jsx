import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ContextoAutenticacao } from './context/ContextoAutenticacao'
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './CSS/style.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ContextoAutenticacao>
      <App />
    </ContextoAutenticacao>
  </React.StrictMode>,
)