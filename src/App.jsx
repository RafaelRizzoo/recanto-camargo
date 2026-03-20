import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './CSS/style.css';

import Menu from './components/navbar';
import Home from './pages/Home';
import Login from './pages/Login';

// Criamos esse componente interno para poder usar o 'useLocation'
function AppContent() {
  const location = useLocation();

  // Se a rota for '/login', não mostra o Menu principal
  const mostrarMenuNormal = location.pathname !== '/login';

  return (
    <>
      {mostrarMenuNormal && <Menu />}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;