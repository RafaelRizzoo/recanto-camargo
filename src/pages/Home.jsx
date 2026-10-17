import { useEffect, useState } from "react";
import "../components/home/home.css";
import HeaderHome from "../components/home/HeaderHome";
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

function Home() {
  const consulta = useConsultaDisponibilidade();
  const [unidadeGaleria, setUnidadeGaleria] = useState(1);

  useRevelar();

  // Marca o body para que o CSS esconda o botão flutuante do WhatsApp no mobile
  // (a barra inferior da Home já oferece o mesmo acesso).
  useEffect(() => {
    document.body.classList.add("rc-home-ativo");
    return () => document.body.classList.remove("rc-home-ativo");
  }, []);

  return (
    <div className="rc-home">
      <HeaderHome />
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
