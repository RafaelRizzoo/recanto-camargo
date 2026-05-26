import { lazy, Suspense } from "react";
import { HashRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import Menu from "./components/navbar";
import Footer from "./components/footer";
import Home from "./pages/Home";
import BotaoWhats from "./components/UI/BotaoWhats";
import { ContextoAutenticacao } from './context/ContextoAutenticacao';
import { useAutenticacao } from './hooks/useAutenticacao';

const Login                  = lazy(() => import("./pages/Login"));
const Cadastro               = lazy(() => import("./pages/Cadastro"));
const RecuperarSenha         = lazy(() => import("./pages/RecuperarSenha"));
const Configuracoes          = lazy(() => import("./pages/Configuracoes"));
const Reserva                = lazy(() => import("./pages/Reserva"));
const Avaliacoes             = lazy(() => import("./pages/Avaliacoes"));
const Fotos                  = lazy(() => import("./pages/Fotos"));
const DashboardAdministrador = lazy(() => import("./pages/DashboardAdministrador"));
const DashboardCliente       = lazy(() => import("./pages/DashboardCliente"));

const ROTAS_SEM_LAYOUT = [
  '/Login',
  '/Cadastro',
  '/RecuperarSenha',
  '/DashboardAdministrador',
  '/DashboardCliente',
];

function CarregandoPagina() {
  return (
    <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Carregando...</span>
      </div>
    </div>
  );
}

function RotaProtegida({ elemento, tipoRequerido }) {
  const { usuario } = useAutenticacao();

  if (!usuario) return <Navigate to="/Login" replace />;
  if (tipoRequerido && usuario.tipo !== tipoRequerido) return <Navigate to="/" replace />;

  return elemento;
}

function AppContent() {
  const location = useLocation();
  const mostrarLayout = !ROTAS_SEM_LAYOUT.includes(location.pathname);

  return (
    <div className="app-shell">
      {mostrarLayout && <Menu />}

      <div className="app-main flex-grow-1">
        <Suspense fallback={<CarregandoPagina />}>
          <Routes>
            <Route path="/"                       element={<Home />} />
            <Route path="/Cadastro"               element={<Cadastro />} />
            <Route path="/Login"                  element={<Login />} />
            <Route path="/RecuperarSenha"         element={<RecuperarSenha />} />
            <Route path="/Configuracoes"          element={<RotaProtegida elemento={<Configuracoes />} />} />
            <Route path="/Reserva"                element={<Reserva />} />
            <Route path="/Avaliacoes"             element={<Avaliacoes />} />
            <Route path="/Fotos"                  element={<Fotos />} />
            <Route path="/DashboardAdministrador" element={<RotaProtegida elemento={<DashboardAdministrador />} tipoRequerido="admin" />} />
            <Route path="/DashboardCliente"       element={<RotaProtegida elemento={<DashboardCliente />} tipoRequerido="hospede" />} />
            <Route path="*"                       element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>

      {mostrarLayout && <Footer />}
      {mostrarLayout && <BotaoWhats />}
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
