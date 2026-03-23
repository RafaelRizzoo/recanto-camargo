import { Container, Row, Col, Nav, Card } from 'react-bootstrap';
import { useState } from 'react';
import '../CSS/style.css';

// Importações das imagens reais (Verifique se os caminhos estão corretos)
import BanheiroImg from "../assets/img/comodos/Banheiro.png";
import ChurrasqueiraImg from "../assets/img/comodos/Churrasqueira.png";
import CozinhaImg from "../assets/img/comodos/Cozinha.png";
import FrenteImg from "../assets/img/comodos/Frente.png";
import JardimImg from "../assets/img/comodos/JardimInverno.png";
import Quarto2Img from "../assets/img/comodos/QuartoDois.png";
import Quarto1Img from "../assets/img/comodos/QuartoUm.png";
import SalaImg from "../assets/img/comodos/Sala.png";

// Placeholder para o vídeo tour (Se você não tiver uma imagem de capa, use esta do Unsplash)
const CapaVideoTour = "https://images.unsplash.com/photo-1616486029423-aaa4789e8c9a?q=80&w=600&auto=format&fit=crop";

// Componente para o Card de Foto (com efeito hover)
const CardFotoGaleria = ({ src, alt, categoria }) => (
    <Col lg={4} md={6} className="mb-4">
        <Card className="card-foto-galeria border-0 shadow-sm h-100">
            <div className="img-galeria-container">
                <Card.Img variant="top" src={src} alt={alt} />
                <div className="overlay-galeria">
                    <span className="badge-categoria-galeria">{categoria}</span>
                    <i className="bi bi-search fs-2 text-white"></i>
                </div>
            </div>
        </Card>
    </Col>
);

function Fotos() {
    // Estado para controlar qual filtro está ativo
    const [filtroAtivo, setFiltroAtivo] = useState('Todos');

    // Categorias de filtros (IDs e Rótulos)
    const categorias = [
        { id: 'Todos', label: 'Ver Todas', icone: 'bi-grid-fill' },
        { id: 'Quartos', label: 'Quartos', icone: 'bi-door-closed' },
        { id: 'Banheiros', label: 'Banheiros', icone: 'bi-droplet' },
        { id: 'Cozinha', label: 'Cozinha', icone: 'bi-egg-fried' },
        { id: 'Sala', label: 'Sala de Estar', icone: 'bi-tv' },
        { id: 'Externa', label: 'Área Externa', icone: 'bi-tree' },
        { id: 'Videos', label: 'Vídeos', icone: 'bi-camera-video' }
    ];

    // O BANCO DE FOTOS CORRIGIDO (Organizado por categoria e usando as importações)
    const midias = [
        // FRENTE/FACHADA
        { id: 1, categoria: 'Externa', src: FrenteImg, alt: 'Fachada do Recanto Camargo' },

        // QUARTOS
        { id: 2, categoria: 'Quartos', src: Quarto1Img, alt: 'Quarto Um confortável' },
        { id: 3, categoria: 'Quartos', src: Quarto2Img, alt: 'Quarto Dois aconchegante' },

        // BANHEIROS
        { id: 4, categoria: 'Banheiros', src: BanheiroImg, alt: 'Banheiro limpo e equipado' },

        // COZINHA
        { id: 5, categoria: 'Cozinha', src: CozinhaImg, alt: 'Cozinha completa para os hóspedes' },

        // SALA
        { id: 6, categoria: 'Sala', src: SalaImg, alt: 'Sala de estar acolhedora com TV' },

        // EXTERNA (Churrasqueira/Jardim)
        { id: 7, categoria: 'Externa', src: ChurrasqueiraImg, alt: 'Área gourmet com churrasqueira' },
        { id: 8, categoria: 'Externa', src: JardimImg, alt: 'Lindo jardim de inverno' },

        // VÍDEOS (Exemplo de Placeholder)
        { id: 9, categoria: 'Videos', src: CapaVideoTour, alt: 'Vídeo tour completo da casa', ehVideo: true }
    ];

    // Lógica para filtrar as mídias
    const midiasFiltradas = filtroAtivo === 'Todos'
        ? midias
        : midias.filter(item => item.categoria === filtroAtivo);

    return (
        <div className="pagina-galeria py-5" style={{ backgroundColor: '#f0f4f8', minHeight: '100vh' }}>
            <Container className="mt-5 pt-5">
                <div className="text-center mb-5 titulo-container-galeria">
                    <span className="badge-topo mb-2" style={{ backgroundColor: '#f37321', color: 'white' }}>
                        Álbum do Recanto
                    </span>
                    <h2 className="titulo-secao-azul">Cada cantinho do seu conforto</h2>
                    <p className="text-muted fs-5 mx-auto" style={{ maxWidth: '700px' }}>
                        Explore nossa casa através de fotos reais. Ambientes limpos, organizados e prontos para te receber em Aparecida.
                    </p>
                </div>

                {/* FILTROS (Nav Tabs Modernas) */}
                <Nav variant="pills" className="justify-content-center mb-5 flex-wrap filtros-galeria-container shadow-sm p-2 bg-white rounded-pill">
                    {categorias.map(cat => (
                        <Nav.Item key={cat.id} className="mx-1 my-1">
                            <Nav.Link
                                className={`filtro-galeria-link d-flex align-items-center gap-2 rounded-pill px-4 py-2 ${filtroAtivo === cat.id ? 'active' : ''}`}
                                onClick={() => setFiltroAtivo(cat.id)}
                            >
                                <i className={`bi ${cat.icone}`}></i>
                                <span>{cat.label}</span>
                            </Nav.Link>
                        </Nav.Item>
                    ))}
                </Nav>

                {/* MURAL DE FOTOS/VÍDEOS */}
                <Row className="gy-4">
                    {midiasFiltradas.length > 0 ? (
                        midiasFiltradas.map((item) => {
                            if (item.ehVideo) {
                                // LAYOUT PARA VÍDEO (Pode ser um placeholder ou embed)
                                return (
                                    <Col lg={4} md={6} key={item.id} className="mb-4">
                                        <Card className="card-foto-galeria border-0 shadow-sm h-100">
                                            <div className="img-galeria-container position-relative">
                                                <Card.Img variant="top" src={item.src} alt={item.alt} />
                                                <div className="overlay-galeria opacity-1 d-flex flex-column align-items-center justify-content-center text-white bg-dark-overlay">
                                                    <i className="bi bi-play-circle-fill fs-1 text-orange-whats mb-2"></i>
                                                    <span className="fw-bold">Assistir Tour</span>
                                                    <span className="badge-categoria-galeria">Vídeo</span>
                                                </div>
                                            </div>
                                        </Card>
                                    </Col>
                                );
                            } else {
                                // LAYOUT PARA FOTO
                                return (
                                    <CardFotoGaleria
                                        key={item.id}
                                        src={item.src} // Passando a variável importada diretamente
                                        alt={item.alt}
                                        categoria={item.categoria}
                                    />
                                );
                            }
                        })
                    ) : (
                        // MENSAGEM SE NÃO HOUVER FOTOS NA CATEGORIA
                        <Col className="text-center py-5">
                            <i className="bi bi-image fs-1 text-muted mb-3 d-block"></i>
                            <h5 className="text-muted">Ainda estamos preparando as fotos deste cômodo.</h5>
                        </Col>
                    )}
                </Row>
            </Container>
        </div>
    );
}

export default Fotos;