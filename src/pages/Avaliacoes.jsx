import { Container, Row, Col } from 'react-bootstrap';
import { useState } from 'react';
import { depoimentos } from '../data/conteudoSite';

const CardDepoimento = ({ item }) => {
    const [expandido, setExpandido] = useState(false);

    return (
        <Col lg={4} md={6}>
            <div className={`card-depoimento-pagina h-100 p-4 shadow-sm bg-white ${expandido ? 'expandido' : ''}`}>
                <div className="estrelas-douradas mb-3">
                    {[...Array(item.estrelas)].map((_, i) => (
                        <i key={i} className="bi bi-star-fill me-1"></i>
                    ))}
                    <span className="small text-muted ms-2">• {item.local}</span>
                </div>

                <div className={expandido ? "texto-completo" : "container-texto-cortado"}>
                    <p className="texto-depoimento-pagina">
                        {item.texto}
                    </p>
                </div>

                <button
                    className="btn-ver-mais mb-3"
                    onClick={() => setExpandido(!expandido)}
                >
                    {expandido ? "Mostrar menos" : "Mostrar mais"}
                </button>

                <div className="info-autor-avaliacoes mt-auto">
                    <div className="avatar-avaliacoes">
                        {item.nome.charAt(0)}
                    </div>
                    <div>
                        <h6 className="nome-autor-avaliacoes">{item.nome}</h6>
                        <small className="text-muted">Hóspede Recanto Camargo</small>
                    </div>
                </div>
            </div>
        </Col>
    );
};

function Avaliacoes() {
    return (
        <div className="pagina-avaliacoes py-5">
            <Container>
                <div className="text-center mb-5 titulo-container-avaliacoes">
                    <h2 className="titulo-secao-azul">O que nossos hóspedes dizem</h2>
                    <p className="text-muted">Experiências reais de quem já se hospedou no Recanto Camargo</p>
                </div>

                <Row className="gy-4">
                    {depoimentos.map((item) => (
                        <CardDepoimento key={item.id} item={item} />
                    ))}
                </Row>
            </Container>
        </div>
    );
}

export default Avaliacoes;
