import { HashRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import Menu from "./components/navbar";
import Footer from "./components/footer";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import RecuperarSenha from "./pages/RecuperarSenha";
import Configuracoes from "./pages/Configuracoes";
import BotaoWhats from "./components/UI/BotaoWhats";
import Reserva from "./pages/Reserva";
import Avaliacoes from "./pages/Avaliacoes";
import Fotos from "./pages/Fotos";
import DashboardAdministrador from "./pages/DashboardAdministrador";
import { ContextoAutenticacao } from './context/ContextoAutenticacao';

const ROTAS_SEM_SHELL = [
  '/Login',
  '/Cadastro',
  '/RecuperarSenha',
  '/DashboardAdministrador',
  '/DashboardCliente',
];

function AppContent() {
  const location = useLocation();
  const mostrarShell = !ROTAS_SEM_SHELL.includes(location.pathname);

  return (
    <div className="app-shell">
      {mostrarShell && <Menu />}

      <div className="app-main flex-grow-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/Cadastro" element={<Cadastro />} />
          <Route path="/Login" element={<Login />} />
          <Route path="/RecuperarSenha" element={<RecuperarSenha />} />
          <Route path="/Configuracoes" element={<Configuracoes />} />
          <Route path="/Reserva" element={<Reserva />} />
          <Route path="/Avaliacoes" element={<Avaliacoes />} />
          <Route path="/Fotos" element={<Fotos />} />
          <Route path="/DashboardAdministrador" element={<DashboardAdministrador />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {mostrarShell && <Footer />}
      {mostrarShell && <BotaoWhats />}
    </div>
  );
}

function App() {
  return (
    <HashRouter>
      <ContextoAutenticacao>
        <AppContent />
      </ContextoAutenticacao>
    </HashRouter>
  );
}

export default App;