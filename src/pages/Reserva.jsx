import { Container, Row, Col, Form, Card } from 'react-bootstrap';
import Botao from '../components/UI/Botao';
import faixada from '../assets/img/comodos/Frente.png';

function Reserva() {
    return (
        <div className="reserva-page py-5">
            <Container>
                <h2 className="titulo-secao-azul mb-4">Finalizar sua Reserva</h2>

                <Row className="g-5 mt-4">
                    <Col lg={7}>
                        <div className="form-reserva-container p-4 shadow-sm bg-white">
                            <h4 className="fw-bold mb-4 text-azul">Seus Dados</h4>
                            <Form>
                                <Row>
                                    <Col md={6} className="mb-3">
                                        <Form.Label className="fw-bold">Nome Completo</Form.Label>
                                        <Form.Control type="text" placeholder="Ex: João Silva" />
                                    </Col>
                                    <Col md={6} className="mb-3">
                                        <Form.Label className="fw-bold">WhatsApp / Telefone</Form.Label>
                                        <Form.Control type="text" placeholder="(12) 99999-9999" />
                                    </Col>
                                </Row>

                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-bold">E-mail</Form.Label>
                                    <Form.Control type="email" placeholder="nome@email.com" />
                                </Form.Group>

                                <h4 className="fw-bold my-4 text-azul">Informações da Estadia</h4>
                                <Row>
                                    <Col md={6} className="mb-3">
                                        <Form.Label className="fw-bold">Check-in</Form.Label>
                                        <Form.Control type="date" />
                                    </Col>
                                    <Col md={6} className="mb-3">
                                        <Form.Label className="fw-bold">Check-out</Form.Label>
                                        <Form.Control type="date" />
                                    </Col>
                                </Row>

                                <Form.Group className="mb-4">
                                    <Form.Label className="fw-bold">Observações ou Pedidos Especiais</Form.Label>
                                    <Form.Control as="textarea" rows={3} placeholder="Ex: Preciso de berço, vou levar um pet..." />
                                </Form.Group>

                                <Botao larguraTotal variante="warning" className="py-3 fs-5">
                                    Confirmar e Solicitar Reserva
                                </Botao>
                                <p className="text-muted small text-center mt-3">
                                    <i className="bi bi-shield-lock me-2"></i>
                                    Seus dados estão seguros conosco.
                                </p>
                            </Form>
                        </div>
                    </Col>

                    <Col lg={5}>
                        <Card className="card-resumo border-0 shadow-lg sticky-top">
                            <div className="img-resumo-container">
                                <Card.Img
                                    variant="top"
                                    src={faixada}
                                    alt="Fachada do Recanto Camargo"
                                    loading="lazy"
                                    decoding="async"
                                />
                                <span className="badge-preco">R$ 250 / noite</span>
                            </div>
                            <Card.Body className="p-4">
                                <h5 className="fw-bold text-azul">Recanto Camargo</h5>
                                <p className="text-muted small mb-3">Ponte Alta, Aparecida - SP</p>

                                <hr />

                                <div className="d-flex justify-content-between mb-2">
                                    <span>3 Noites</span>
                                    <span className="fw-bold">R$ 750,00</span>
                                </div>
                                <div className="d-flex justify-content-between mb-2">
                                    <span>Taxa de Limpeza</span>
                                    <span className="fw-bold">R$ 80,00</span>
                                </div>

                                <hr />

                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <span className="fs-5 fw-bold">Total</span>
                                    <span className="fs-4 fw-bold text-success text-orange">R$ 830,00</span>
                                </div>

                                <div className="beneficios-reserva-direta">
                                    <div className="d-flex align-items-center mb-2 small text-muted">
                                        <i className="bi bi-check-circle-fill text-success me-2"></i>
                                        Cancelamento gratuito até 7 dias
                                    </div>
                                    <div className="d-flex align-items-center mb-2 small text-muted">
                                        <i className="bi bi-check-circle-fill text-success me-2"></i>
                                        Sem taxas extras do Airbnb
                                    </div>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </div>
    );
}

export default Reserva;
