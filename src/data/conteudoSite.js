import R2Fachada from "../assets/img/recanto2/fachada.webp";
import R2Sala from "../assets/img/recanto2/sala.webp";
import R2Cozinha from "../assets/img/recanto2/cozinha.webp";
import R2Quarto1 from "../assets/img/recanto2/quarto1.webp";
import R2Quarto2 from "../assets/img/recanto2/quarto2.webp";
import R2Varanda from "../assets/img/recanto2/varanda.webp";
import R2Gourmet from "../assets/img/recanto2/gourmet.webp";
import R2Banheiro from "../assets/img/recanto2/banheiro.webp";
import R2Escada from "../assets/img/recanto2/escada.webp";
import R2Estar from "../assets/img/recanto2/estar.webp";
import BasilicaArte from "../assets/img/artes/basilica.webp";

import BanheiroImg from "../assets/img/comodos/Banheiro.webp";
import ChurrasqueiraImg from "../assets/img/comodos/Churrasqueira.webp";
import CozinhaImg from "../assets/img/comodos/Cozinha.webp";
import FrenteImg from "../assets/img/comodos/Frente.webp";
import JardimImg from "../assets/img/comodos/JardimInverno.webp";
import Quarto2Img from "../assets/img/comodos/QuartoDois.webp";
import Quarto1Img from "../assets/img/comodos/QuartoUm.webp";
import SalaImg from "../assets/img/comodos/Sala.webp";

import BasilicaTurismo from "../assets/img/turismo/BasilicaTurismo.webp";
import CruzeiroTurismo from "../assets/img/turismo/CruzeiroTurismo.webp";
import FeiraTurismo from "../assets/img/turismo/FeiraTurismo.webp";
import PassarelaTurismo from "../assets/img/turismo/PassarelaTurismo.webp";
import PortoTurismo from "../assets/img/turismo/PortoTurismo.webp";
import RosarioTurismo from "../assets/img/turismo/RosarioTurismo.webp";

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
    categoria: "Fé",
    titulo: "Santuário Nacional",
    descricao: "A maior basílica dedicada a Maria no mundo.",
    tempo: "5 min",
    imagem: BasilicaTurismo,
    alt: "Santuário Nacional",
    linkMaps: "https://www.google.com/maps/dir/?api=1&origin=Recanto+Camargo,+Aparecida+-+SP&destination=Santuário+Nacional+de+Aparecida",
  },
  {
    id: "passarela",
    categoria: "Fé",
    titulo: "Passarela da Fé",
    descricao: "Caminho que liga a Basílica Velha ao Santuário.",
    tempo: "6 min",
    imagem: PassarelaTurismo,
    alt: "Passarela da Fé",
    linkMaps: "https://www.google.com/maps/dir/?api=1&origin=Recanto+Camargo,+Aparecida+-+SP&destination=Passarela+da+Fé,+Aparecida+-+SP",
  },
  {
    id: "cruzeiro",
    categoria: "Passeios",
    titulo: "Morro do Cruzeiro",
    descricao: "Vista privilegiada de toda a cidade e da Basílica.",
    tempo: "9 min",
    imagem: CruzeiroTurismo,
    alt: "Morro do Cruzeiro",
    linkMaps: "https://www.google.com/maps/dir/?api=1&origin=Recanto+Camargo,+Aparecida+-+SP&destination=Morro+do+Cruzeiro,+Aparecida+-+SP",
  },
  {
    id: "rosario",
    categoria: "Fé",
    titulo: "Caminho do Rosário",
    descricao: "Cenários que retratam os mistérios do Rosário.",
    tempo: "5 min",
    imagem: RosarioTurismo,
    alt: "Caminho do Rosário",
    linkMaps: "https://www.google.com/maps/dir/?api=1&origin=Recanto+Camargo,+Aparecida+-+SP&destination=Caminho+do+Rosário,+Aparecida+-+SP",
  },
  {
    id: "porto",
    categoria: "Passeios",
    titulo: "Porto Itaguaçu",
    descricao: "Local onde a imagem da Padroeira foi encontrada.",
    tempo: "7 min",
    imagem: PortoTurismo,
    alt: "Porto Itaguaçu",
    linkMaps: "https://www.google.com/maps/dir/?api=1&origin=Recanto+Camargo,+Aparecida+-+SP&destination=Porto+Itaguaçu,+Aparecida+-+SP",
  },
  {
    id: "feira",
    categoria: "Compras",
    titulo: "Feira Livre",
    descricao: "O ponto ideal para compras e artigos religiosos.",
    tempo: "4 min",
    imagem: FeiraTurismo,
    alt: "Feira Livre",
    linkMaps: "https://www.google.com/maps/dir/?api=1&origin=Recanto+Camargo,+Aparecida+-+SP&destination=Feira+Livre+Aparecida+-+SP",
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
    src: "",
    alt: "Vídeo de Boas Vindas ao Recanto Camargo",
    ehVideo: true,
    youtubeId: "Mzjjki2eTAQ",
    ehShort: true,
  },
  {
    id: 10,
    categoria: "Videos",
    src: "",
    alt: "Trajeto até o Santuário de Aparecida",
    ehVideo: true,
    youtubeId: "6sMnHbr-Lsk",
    ehShort: true,
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
  { id: "termos", label: "Termos de Uso", to: "/TermosDeUso" },
  { id: "privacidade", label: "Privacidade (LGPD)", to: "/Privacidade" },
];

export const contato = {
  whatsapp: "5512992126734",
  telefone: "(12) 99212-6734",
  endereco: "Rua José Ourives, 76 - Ponte Alta",
  cidade: "Aparecida, SP",
  instagram: "https://www.instagram.com/recantocamargoaparecida/",
  airbnb: "https://airbnb.com.br/h/recantocamargo",
  google: "https://maps.app.goo.gl/yaAmQ3iSwUPoX5Pi9",
  mensagemPadrao: "Olá! Gostaria de saber mais sobre a disponibilidade do Recanto Camargo.",
};

export const MAX_HOSPEDES = 10;

export const mapaEmbedSrc =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1279.723618367829!2d-45.23822072662757!3d-22.84648000473076!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94ccc3d5a125211b%3A0x240324a5c110d090!2sRecanto%20Camargo!5e0!3m2!1sen!2sbr!4v1774143793114!5m2!1sen!2sbr";

export const fotoBasilica = BasilicaArte;

// consultaOnline: só o imóvel 1 existe na API de disponibilidade atual
export const unidades = [
  {
    id: 1,
    nome: "Recanto Camargo 1",
    selo: "Recanto 1",
    cor: "#FF751F",
    foto: SalaImg,
    alt: "Sala de estar do Recanto Camargo 1",
    resumo:
      "Casa completa para a família ou o grupo: sala, cozinha equipada, banheiro e área gourmet com churrasqueira.",
    destaques: [
      { icone: "bi-people", texto: "Até 10 hóspedes" },
      { icone: "bi-door-closed", texto: "2 quartos" },
      { icone: "bi-fire", texto: "Churrasqueira" },
      { icone: "bi-car-front", texto: "Garagem" },
    ],
    consultaOnline: true,
  },
  {
    id: 2,
    nome: "Recanto Camargo 2",
    selo: "Recanto 2",
    cor: "#003366",
    foto: R2Fachada,
    alt: "Fachada do Recanto Camargo 2",
    resumo:
      "Casa completa, com sala, cozinha equipada, quartos com ventilador de teto e área gourmet com churrasqueira no terraço.",
    destaques: [
      { icone: "bi-people", texto: "Até 10 hóspedes" },
      { icone: "bi-door-closed", texto: "2 quartos" },
      { icone: "bi-fire", texto: "Churrasqueira" },
      { icone: "bi-sun", texto: "Varanda" },
    ],
    consultaOnline: false,
  },
];

export const galeriaPorUnidade = {
  1: [
    { src: SalaImg, alt: "Sala de estar", categoria: "Sala" },
    { src: FrenteImg, alt: "Fachada", categoria: "Área externa" },
    { src: Quarto1Img, alt: "Quarto 1", categoria: "Quartos" },
    { src: CozinhaImg, alt: "Cozinha", categoria: "Cozinha" },
    { src: ChurrasqueiraImg, alt: "Área gourmet", categoria: "Área externa" },
    { src: Quarto2Img, alt: "Quarto 2", categoria: "Quartos" },
    { src: BanheiroImg, alt: "Banheiro", categoria: "Banheiros" },
    { src: JardimImg, alt: "Jardim de inverno", categoria: "Área externa" },
  ],
  2: [
    { src: R2Sala, alt: "Sala de estar", categoria: "Sala" },
    { src: R2Fachada, alt: "Fachada", categoria: "Área externa" },
    { src: R2Quarto1, alt: "Quarto 1", categoria: "Quartos" },
    { src: R2Cozinha, alt: "Cozinha", categoria: "Cozinha" },
    { src: R2Gourmet, alt: "Área gourmet", categoria: "Área externa" },
    { src: R2Quarto2, alt: "Quarto 2", categoria: "Quartos" },
    { src: R2Varanda, alt: "Varanda", categoria: "Área externa" },
    { src: R2Banheiro, alt: "Banheiro", categoria: "Banheiros" },
    { src: R2Escada, alt: "Escada e corredor", categoria: "Outros ambientes" },
    { src: R2Estar, alt: "Área de estar", categoria: "Sala" },
  ],
};

export const fotosHero = { src: ChurrasqueiraImg, alt: "Área gourmet com churrasqueira do Recanto Camargo 1" };
export const fotosExperiencia = [
  { src: ChurrasqueiraImg, alt: "Área gourmet com churrasqueira" },
  { src: CozinhaImg, alt: "Cozinha equipada" },
];

export const numerosExperiencia = [
  { valor: "10", texto: "hóspedes por unidade" },
  { valor: "2", texto: "quartos com enxoval incluso" },
  { valor: "1", texto: "cozinha completa para toda a família" },
  { valor: "+", texto: "área gourmet com churrasqueira" },
];

export const comodidadesGrupos = [
  {
    id: "dormir",
    titulo: "Dormir bem",
    itens: [
      { icone: "bi-stars", texto: "Enxoval incluso" },
      { icone: "bi-wind", texto: "Ventilador de teto" },
    ],
  },
  {
    id: "cozinhar",
    titulo: "Cozinhar e conviver",
    itens: [
      { icone: "bi-egg-fried", texto: "Cozinha equipada" },
      { icone: "bi-cup-hot", texto: "Utensílios domésticos" },
      { icone: "bi-fire", texto: "Churrasqueira" },
    ],
  },
  {
    id: "conforto",
    titulo: "Conforto e praticidade",
    itens: [
      { icone: "bi-wifi", texto: "Wi-Fi" },
      { icone: "bi-tv", texto: "Smart TVs" },
      { icone: "bi-car-front", texto: "Garagem" },
      { icone: "bi-heart", texto: "Aceitamos pets" },
    ],
  },
];

export const depoimentosDestaque = [3, 6, 2];

// rota: destino quando o link é usado fora da Home
export const linksNavegacaoHome = [
  { id: "topo", label: "Início", rota: "/" },
  { id: "hospedagens", label: "Hospedagens" },
  { id: "galeria", label: "Galeria", rota: "/Fotos" },
  { id: "localizacao", label: "Localização" },
  { id: "avaliacoes", label: "Avaliações", rota: "/Avaliacoes" },
];
