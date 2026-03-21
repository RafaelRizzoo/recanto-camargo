import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './CSS/style.css';

import Menu from './components/navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';

// Criamos esse componente interno para poder usar o 'useLocation'
function AppContent() {
  const location = useLocation();

  // Se a rota for '/login', não mostra o Menu principal
  // Nota: com HashRouter, o pathname vem como /Login (sem o #)
  const mostrarMenuNormal = location.pathname !== '/Login' && location.pathname !== '/Cadastro';

  return (
    <>
      {mostrarMenuNormal && <Menu />}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/Cadastro" element={<Cadastro />} />
        <Route path="/Login" element={<Login />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}

export default App;