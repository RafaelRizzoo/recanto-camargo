import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../components/home/home.css";
import HeroHome from "../components/home/HeroHome";
import EscolhaHospedagem from "../components/home/EscolhaHospedagem";
import Experiencia from "../components/home/Experiencia";
import GaleriaHome from "../components/home/GaleriaHome";
import ComodidadesHome from "../components/home/ComodidadesHome";
import LocalizacaoHome from "../components/home/LocalizacaoHome";
import ExploreAparecida from "../components/home/ExploreAparecida";
import DepoimentosHome from "../components/home/DepoimentosHome";
import BlocoReserva from "../components/home/BlocoReserva";
import BarraMobile from "../components/home/BarraMobile";
import { useConsultaDisponibilidade } from "../components/home/useConsultaDisponibilidade";
import { useRevelar } from "../components/home/useRevelar";
import { irPara } from "../components/home/links";

function Home() {
  const consulta = useConsultaDisponibilidade();
  const [unidadeGaleria, setUnidadeGaleria] = useState(1);

  useRevelar();

  // Vindo de outra página (ex.: "Localização" no cabeçalho), rola até a seção pedida.
  const location = useLocation();
  const navigate = useNavigate();
  const destino = location.state?.ir;
  useEffect(() => {
    if (!destino) return undefined;
    const t = setTimeout(() => {
      irPara(destino);
      navigate(location.pathname, { replace: true, state: null });
    }, 120);
    return () => clearTimeout(t);
  }, [destino, navigate, location.pathname]);

  // Marca o body para que o CSS esconda o botão flutuante do WhatsApp no mobile
  // (a barra inferior da Home já oferece o mesmo acesso).
  useEffect(() => {
    document.body.classList.add("rc-home-ativo");
    return () => document.body.classList.remove("rc-home-ativo");
  }, []);

  return (
    <div className="rc-home">
      <main>
        <HeroHome consulta={consulta} />
        <EscolhaHospedagem
          onVerGaleria={setUnidadeGaleria}
          onVerDatas={(id) => consulta.atualizar({ unidade: String(id) })}
        />
        <Experiencia />
        <GaleriaHome unidade={unidadeGaleria} onMudarUnidade={setUnidadeGaleria} />
        <ComodidadesHome />
        <LocalizacaoHome />
        <ExploreAparecida />
        <DepoimentosHome />
        <BlocoReserva consulta={consulta} />
      </main>
      <BarraMobile />
    </div>
  );
}

export default Home;
