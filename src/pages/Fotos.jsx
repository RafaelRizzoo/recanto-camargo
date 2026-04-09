import { Container, Row, Col, Nav, Card } from 'react-bootstrap';
import { useState } from 'react';
import '../CSS/style.css';
import { categoriasGaleria, midiasGaleria } from '../data/conteudoSite';

const CardFotoGaleria = ({ src, alt, categoria }) => (
    <Col lg={4} md={6} className="mb-4">
        <Card className="card-foto-galeria border-0 shadow-sm h-100">
            <div className="img-galeria-container">
                <Card.Img variant="top" src={src} alt={alt} loading="lazy" decoding="async" />
                <div className="overlay-galeria">
                    <span className="badge-categoria-galeria">{categoria}</span>
                    <i className="bi bi-search fs-2 text-white"></i>
                </div>
            </div>
        </Card>
    </Col>
);

function Fotos() {
    const [filtroAtivo, setFiltroAtivo] = useState('Todos');
    const midiasFiltradas = filtroAtivo === 'Todos'
        ? midiasGaleria
        : midiasGaleria.filter(item => item.categoria === filtroAtivo);

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

                <Nav variant="pills" className="justify-content-center mb-5 flex-wrap filtros-galeria-container shadow-sm p-2 bg-white rounded-pill">
                    {categoriasGaleria.map(cat => (
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

                <Row className="gy-4">
                    {midiasFiltradas.length > 0 ? (
                        midiasFiltradas.map((item) => {
                            if (item.ehVideo) {
                                return (
                                    <Col lg={4} md={6} key={item.id} className="mb-4">
                                        <Card className="card-foto-galeria border-0 shadow-sm h-100">
                                            <div className="img-galeria-container position-relative">
                                                <Card.Img variant="top" src={item.src} alt={item.alt} loading="lazy" decoding="async" />
                                                <div className="overlay-galeria opacity-1 d-flex flex-column align-items-center justify-content-center text-white bg-dark-overlay">
                                                    <i className="bi bi-play-circle-fill fs-1 text-orange mb-2"></i>
                                                    <span className="fw-bold">Assistir Tour</span>
                                                    <span className="badge-categoria-galeria">Vídeo</span>
                                                </div>
                                            </div>
                                        </Card>
                                    </Col>
                                );
                            }

                            return (
                                <CardFotoGaleria
                                    key={item.id}
                                    src={item.src}
                                    alt={item.alt}
                                    categoria={item.categoria}
                                />
                            );
                        })
                    ) : (
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
