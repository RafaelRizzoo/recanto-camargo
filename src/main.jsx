import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ContextoAutenticacao } from './context/ContextoAutenticacao'
import { ContextoPreferencias } from './context/ContextoPreferencias'
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './CSS/style.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ContextoPreferencias>
      <ContextoAutenticacao>
        <App />
      </ContextoAutenticacao>
    </ContextoPreferencias>
  </React.StrictMode>,
)
