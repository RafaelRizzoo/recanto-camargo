import BanheiroImg from "../assets/img/comodos/Banheiro.png";
import ChurrasqueiraImg from "../assets/img/comodos/Churrasqueira.png";
import CozinhaImg from "../assets/img/comodos/Cozinha.png";
import FrenteImg from "../assets/img/comodos/Frente.png";
import JardimImg from "../assets/img/comodos/JardimInverno.png";
import Quarto2Img from "../assets/img/comodos/QuartoDois.png";
import Quarto1Img from "../assets/img/comodos/QuartoUm.png";
import SalaImg from "../assets/img/comodos/Sala.png";

import BasilicaTurismo from "../assets/img/turismo/BasilicaTurismo.png";
import CruzeiroTurismo from "../assets/img/turismo/CruzeiroTurismo.png";
import FeiraTurismo from "../assets/img/turismo/FeiraTurismo.png";
import PassarelaTurismo from "../assets/img/turismo/PassarelaTurismo.png";
import PortoTurismo from "../assets/img/turismo/PortoTurismo.png";
import RosarioTurismo from "../assets/img/turismo/RosarioTurismo.png";

export const imagensCarrosselHome = [
  { src: FrenteImg, alt: "Frente do Recanto Camargo" },
  { src: SalaImg, alt: "Sala de estar" },
  { src: Quarto1Img, alt: "Quarto 1" },
  { src: Quarto2Img, alt: "Quarto 2" },
  { src: BanheiroImg, alt: "Banheiro" },
  { src: JardimImg, alt: "Jardim de inverno" },
  { src: CozinhaImg, alt: "Cozinha" },
  { src: ChurrasqueiraImg, alt: "Churrasqueira" },
];

export const comodidades = [
  { id: "localizacao", icone: "bi-geo-alt-fill", titulo: "Localização" },
  { id: "wifi", icone: "bi-wifi", titulo: "Wi-Fi Grátis" },
  { id: "garagem", icone: "bi-car-front-fill", titulo: "Garagem" },
  { id: "churrasqueira", icone: "bi-fire", titulo: "Churrasqueira" },
  { id: "pets", icone: "bi-heart-fill", titulo: "Aceitamos Pets" },
  { id: "tv", icone: "bi-tv", titulo: "Smart TVs" },
  { id: "cozinha", icone: "bi-egg-fried", titulo: "Cozinha Completa" },
  { id: "enxoval", icone: "bi-stars", titulo: "Enxoval Incluso" },
];

export const pontosTuristicos = [
  {
    id: "basilica",
    titulo: "Santuário Nacional",
    descricao: "A maior basílica dedicada a Maria no mundo.",
    tempo: "5 min",
    imagem: BasilicaTurismo,
    alt: "Santuário Nacional",
  },
  {
    id: "passarela",
    titulo: "Passarela da Fé",
    descricao: "Caminho que liga a Basílica Velha ao Santuário.",
    tempo: "6 min",
    imagem: PassarelaTurismo,
    alt: "Passarela da Fé",
  },
  {
    id: "cruzeiro",
    titulo: "Morro do Cruzeiro",
    descricao: "Vista privilegiada de toda a cidade e da Basílica.",
    tempo: "9 min",
    imagem: CruzeiroTurismo,
    alt: "Morro do Cruzeiro",
  },
  {
    id: "rosario",
    titulo: "Caminho do Rosário",
    descricao: "Cenários que retratam os mistérios do Rosário.",
    tempo: "5 min",
    imagem: RosarioTurismo,
    alt: "Caminho do Rosário",
  },
  {
    id: "porto",
    titulo: "Porto Itaguaçu",
    descricao: "Local onde a imagem da Padroeira foi encontrada.",
    tempo: "7 min",
    imagem: PortoTurismo,
    alt: "Porto Itaguaçu",
  },
  {
    id: "feira",
    titulo: "Feira Livre",
    descricao: "O ponto ideal para compras e artigos religiosos.",
    tempo: "4 min",
    imagem: FeiraTurismo,
    alt: "Feira Livre",
  },
];

export const categoriasGaleria = [
  { id: "Todos", label: "Ver Todas", icone: "bi-grid-fill" },
  { id: "Quartos", label: "Quartos", icone: "bi-door-closed" },
  { id: "Banheiros", label: "Banheiros", icone: "bi-droplet" },
  { id: "Cozinha", label: "Cozinha", icone: "bi-egg-fried" },
  { id: "Sala", label: "Sala de Estar", icone: "bi-tv" },
  { id: "Externa", label: "Área Externa", icone: "bi-tree" },
  { id: "Videos", label: "Vídeos", icone: "bi-camera-video" },
];

export const midiasGaleria = [
  { id: 1, categoria: "Externa", src: FrenteImg, alt: "Fachada do Recanto Camargo" },
  { id: 2, categoria: "Quartos", src: Quarto1Img, alt: "Quarto um confortável" },
  { id: 3, categoria: "Quartos", src: Quarto2Img, alt: "Quarto dois aconchegante" },
  { id: 4, categoria: "Banheiros", src: BanheiroImg, alt: "Banheiro limpo e equipado" },
  { id: 5, categoria: "Cozinha", src: CozinhaImg, alt: "Cozinha completa para os hóspedes" },
  { id: 6, categoria: "Sala", src: SalaImg, alt: "Sala de estar acolhedora com TV" },
  { id: 7, categoria: "Externa", src: ChurrasqueiraImg, alt: "Área gourmet com churrasqueira" },
  { id: 8, categoria: "Externa", src: JardimImg, alt: "Jardim de inverno" },
  {
    id: 9,
    categoria: "Videos",
    src: "https://images.unsplash.com/photo-1616486029423-aaa4789e8c9a?q=80&w=600&auto=format&fit=crop",
    alt: "Vídeo tour completo da casa",
    ehVideo: true,
  },
];

export const depoimentos = [
  {
    id: 1,
    nome: "Kelly",
    local: "janeiro de 2026",
    estrelas: 5,
    texto:
      "Quando chegamos fomos recepcionadas pela mãe do Rafael, a dona Sônia, super gentil, educada e prestativa. A casa estava limpinha, é super confortável, toda equipada, chuveiro com água quente, cama boa para descansar. Quando eu voltar em Aparecida, com certeza ficarei novamente nessa casa. Rafael respondeu todas minhas mensagens com clareza e rapidez.",
  },
  {
    id: 2,
    nome: "Lidiane",
    local: "3 semanas atrás",
    estrelas: 5,
    texto:
      "Eu e minha família fomos bem recebidos, amamos a casa, a limpeza nota 1000, perto da igreja, lugar muito tranquilo, Rafael sempre disposto a ajudar, me senti em casa.",
  },
  {
    id: 3,
    nome: "Leonardo",
    local: "fevereiro de 2026",
    estrelas: 5,
    texto:
      "Nossa estadia foi excelente! O anfitrião Rafael é um cara muito bacana, sempre atencioso, e a casa é linda, exatamente como nas fotos. Tudo organizado, confortável e acolhedor. Com certeza voltaríamos e recomendamos sem medo!",
  },
  {
    id: 4,
    nome: "Tayane",
    local: "fevereiro de 2026",
    estrelas: 5,
    texto:
      "Adoramos a casa, Rafael e sua mãe super atenciosos casa muito completa correspondia a todas descrições do anúncio, casa pertinho do santuário. Adoramos a estadia e com certeza alugaríamos com eles novamente.",
  },
  {
    id: 5,
    nome: "Camila",
    local: "janeiro de 2026",
    estrelas: 5,
    texto:
      "A estadia foi muito boa! O espaço é confortável e atendeu muito bem às nossas expectativas. Os anfitriões são extremamente simpáticos, prestativos e sempre disponíveis para ajudar. A localização é excelente, perto de tudo.",
  },
  {
    id: 6,
    nome: "Leandro",
    local: "janeiro de 2026",
    estrelas: 5,
    texto:
      "Casa excelente, igual ao anúncio. Limpeza excelente, roupas de cama e banho cheirosas, cozinha completa. Camas e colchões muito bons. Bem próxima à Basílica, acessível para ir a pé. A anfitriã Sônia foi muito gentil e solícita.",
  },
  {
    id: 7,
    nome: "Weldon",
    local: "janeiro de 2026",
    estrelas: 5,
    texto:
      "A acomodação entrega tudo que é visto no anúncio, muito bem organizada, arrumada e prática. Rafael foi muito proativo em todo processo e muito prestativo. Ótimo custo-benefício e fácil acesso à Basílica e arredores.",
  },
  {
    id: 8,
    nome: "Luana",
    local: "janeiro de 2026",
    estrelas: 5,
    texto:
      "Minha experiência foi maravilhosa! O lugar é muito aconchegante, limpo e bem organizado. Fui muito bem recebida e me senti em casa. Com certeza voltarei e recomendo para quem busca conforto e tranquilidade.",
  },
  {
    id: 9,
    nome: "Roberta Kelly Melo",
    local: "janeiro de 2026",
    estrelas: 5,
    texto:
      "Eu e minha família adoramos nosso período de estadia na acomodação. Fomos super bem recebidos pela dona Sônia, além de todo o suporte do Rafael por mensagem. Casa muito limpa, aconchegante e espaçosa, em ótima localização e bem pertinho do Santuário.",
  },
];

export const linksFooter = [
  { id: "inicio", label: "Início", to: "/" },
  { id: "fotos", label: "Fotos da Casa", to: "/Fotos" },
  { id: "avaliacoes", label: "Avaliações", to: "/Avaliacoes" },
  { id: "reserva", label: "Reservar", to: "/Reserva" },
];
