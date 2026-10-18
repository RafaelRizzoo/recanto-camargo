import { lazy, Suspense, useEffect } from "react";
import { HashRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import HeaderSite from "./components/home/HeaderSite";
import Footer from "./components/footer";
import Home from "./pages/Home";
import BotaoWhats from "./components/UI/BotaoWhats";
import { useAutenticacao } from './hooks/useAutenticacao';
import { usePreferencias } from './hooks/usePreferencias';

const Login                  = lazy(() => import("./pages/Login"));
const Cadastro               = lazy(() => import("./pages/Cadastro"));
const RecuperarSenha         = lazy(() => import("./pages/RecuperarSenha"));
const Configuracoes          = lazy(() => import("./pages/Configuracoes"));
const Reserva                = lazy(() => import("./pages/Reserva"));
const Avaliacoes             = lazy(() => import("./pages/Avaliacoes"));
const Fotos                  = lazy(() => import("./pages/Fotos"));
const DashboardAdministrador = lazy(() => import("./pages/DashboardAdministrador"));
const DashboardCliente       = lazy(() => import("./pages/DashboardCliente"));
const ReservaConcluida       = lazy(() => import("./pages/ReservaConcluida"));
const TermosDeUso             = lazy(() => import("./pages/TermosDeUso"));
const Privacidade             = lazy(() => import("./pages/Privacidade"));

// Páginas que já têm tema escuro (as demais continuam sempre claras).
const ROTAS_COM_TEMA = [
  '/',
  '/fotos',
  '/reserva',
  '/avaliacoes',
  '/login',
  '/cadastro',
  '/recuperarsenha',
  '/reservaconcluida',
  '/dashboardcliente',
];

const ROTAS_SEM_LAYOUT = [
  '/Login',
  '/Cadastro',
  '/RecuperarSenha',
  '/DashboardAdministrador',
  '/DashboardCliente',
  '/ReservaConcluida'
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

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
    const rootEl = document.getElementById('root');
    if (rootEl) rootEl.scrollTop = 0;
  }, [pathname]);

  return null;
}

function AppContent() {
  const location = useLocation();
  const mostrarLayout = !ROTAS_SEM_LAYOUT.some(rota => location.pathname.startsWith(rota));
  // Cabeçalho único: transparente sobre o Hero na Home, sólido nas demais páginas.
  const ehHome = location.pathname === '/';

  const { tema } = usePreferencias();
  const caminho = location.pathname.toLowerCase();
  const temaDisponivel = ROTAS_COM_TEMA.some(r => (r === '/' ? caminho === '/' : caminho.startsWith(r)));
  useEffect(() => {
    document.documentElement.dataset.theme = temaDisponivel && tema === 'escuro' ? 'dark' : 'light';
  }, [tema, temaDisponivel]);

  return (
    <div className="app-shell">
      <ScrollToTop />
      {mostrarLayout && <HeaderSite emHome={ehHome} mostrarTema={temaDisponivel} />}

      <div className="app-main flex-grow-1">
        <Suspense fallback={<CarregandoPagina />}>
          <Routes>
            <Route path="/"                       element={<Home />} />
            <Route path="/Cadastro"               element={<Cadastro />} />
            <Route path="/Login"                  element={<Login />} />
            <Route path="/RecuperarSenha"         element={<RecuperarSenha />} />
            <Route path="/ReservaConcluida/:id"   element={<ReservaConcluida />} />
            <Route path="/Configuracoes"          element={<RotaProtegida elemento={<Configuracoes />} />} />
            <Route path="/Reserva"                element={<Reserva />} />
            <Route path="/Avaliacoes"             element={<Avaliacoes />} />
            <Route path="/Fotos"                  element={<Fotos />} />
            <Route path="/TermosDeUso"            element={<TermosDeUso />} />
            <Route path="/termosdeuso"            element={<Navigate to="/TermosDeUso" replace />} />
            <Route path="/Privacidade"            element={<Privacidade />} />
            <Route path="/privacidade"            element={<Navigate to="/Privacidade" replace />} />
            <Route path="/DashboardAdministrador" element={<RotaProtegida elemento={<DashboardAdministrador />} tipoRequerido="proprietario" />} />
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
      <AppContent />
    </HashRouter>
  );
}

export default App;
