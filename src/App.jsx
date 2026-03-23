import { HashRouter, Routes, Route, useLocation } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./CSS/style.css";

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
    // Usamos um Flexbox aqui para garantir que o Footer fique sempre no pé da página
    <div
      style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
    >
      {mostrarMenu && <Menu />}

      {/* Esta div 'flex-grow-1' faz com que o conteúdo das páginas ocupe todo o espaço 
          disponível, empurrando o Footer para o final, mesmo que a página tenha pouco texto.
      */}
      <div className="flex-grow-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/Cadastro" element={<Cadastro />} />
          <Route path="/Login" element={<Login />} />
          <Route path="/Reserva" element={<Reserva />} />
          <Route path="/Avaliacoes" element={<Avaliacoes />} />
          <Route path="/Fotos" element={<Fotos />} />
        </Routes>
      </div>

      {/* O Footer agora respeita a ordem e só aparece se não for Login/Cadastro */}
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
