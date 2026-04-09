import { HashRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

import Menu from "./components/navbar";
import Footer from "./components/footer";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import BotaoWhats from "./components/UI/BotaoWhats";
import Reserva from "./pages/Reserva";
import Avaliacoes from "./pages/Avaliacoes";
import Fotos from "./pages/Fotos";

function AppContent() {
  const location = useLocation();

  const mostrarMenu =
    location.pathname !== "/Login" && location.pathname !== "/Cadastro";

  return (
    <div className="app-shell">
      {mostrarMenu && <Menu />}

      <div className="app-main flex-grow-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/Cadastro" element={<Cadastro />} />
          <Route path="/Login" element={<Login />} />
          <Route path="/Reserva" element={<Reserva />} />
          <Route path="/Avaliacoes" element={<Avaliacoes />} />
          <Route path="/Fotos" element={<Fotos />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {mostrarMenu && <Footer />}
      {mostrarMenu && <BotaoWhats />}
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
