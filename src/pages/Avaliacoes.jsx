import { Container, Row, Col } from 'react-bootstrap';
import { useState } from 'react';
import '../CSS/style.css';

// Componente para o Card Individual (Gerencia o abrir/fechar)
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

                {/* A classe muda conforme o estado 'expandido' */}
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
    const depoimentos = [
        { id: 1, nome: "Kelly", local: "janeiro de 2026", estrelas: 5, texto: "Quando chegamos fomos recepcionadas pela mãe do Rafael, a dona Sônia, super gentil, educada e prestativa. A casa estava limpinha, é super confortável, toda equipada, chuveiro com água quente, cama boa para descansar. Quando eu voltar em Aparecida, com certeza ficarei novamente nessa casa. Rafael respondeu todas minhas mensagens com clareza e rapidez." },
        { id: 2, nome: "Lidiane", local: "3 semanas atrás", estrelas: 5, texto: "Eu e minha família fomos bem recebidos, amamos a casa, a limpeza nota 1000, perto da igreja, lugar muito tranquilo, Rafael sempre disposto a ajudar, me senti em casa 🥰" },
        { id: 3, nome: "Leonardo", local: "fevereiro de 2026", estrelas: 5, texto: "Nossa estadia foi excelente! O anfitrião Rafael é um cara muito bacana, sempre atencioso, e a casa é linda, exatamente como nas fotos. Tudo organizado, confortável e acolhedor. Com certeza voltaríamos e recomendamos sem medo!" },
        { id: 4, nome: "Tayane", local: "fevereiro de 2026", estrelas: 5, texto: "Adoramos a casa, Rafael e sua mãe super atenciosos casa muito completa correspondia a todas descrições do anúncio, casa pertinho do santuário. Adoramos à estadia se caso precisássemos alugar airbnb com certeza alugaríamos com eles novamente." },
        { id: 5, nome: "Camila", local: "janeiro de 2026", estrelas: 5, texto: "A estadia foi muito boa! O espaço é confortável e atendeu muito bem às nossas expectativas. Os anfitriões são extremamente simpáticos, prestativos e sempre disponíveis para ajudar. A localização é excelente, perto de tudo, o que facilitou muito a nossa estadia. Recomendo!" },
        { id: 6, nome: "Leandro", local: "janeiro de 2026", estrelas: 5, texto: "Casa excelente, igual o anúncio. Limpeza excelente, roupas de cama e banho cheirosas, cozinha completa. Camas e colchões muito bons. Bem próxima a Basílica, acessível para ir a pé. A anfitriã Sônia, mãe do Rafael muito gentil e solicita." },
        { id: 7, nome: "Weldon", local: "janeiro de 2026", estrelas: 5, texto: "A acomodação entrega tudo que é visto no anúncio, muito bem organizada, arrumada e prática. Rafael foi muito proativo em todo processo e muito prestativo. Ótimo custo benefício, fácil de visitar a Basílica e arredores, fácil de chegar com carro, possui garagem e o espaço é bem confortável." },
        { id: 8, nome: "Luana", local: "janeiro de 2026", estrelas: 5, texto: "Minha experiência foi maravilhosa! O lugar é muito aconchegante, limpo e bem organizado. Fui muito bem recebida e me senti em casa. Com certeza voltarei e recomendo para quem busca conforto e tranquilidade." },
        { id: 9, nome: "Roberta Kelly Melo", local: "janeiro de 2026", estrelas: 5, texto: "Eu e minha família adoramos nosso período de estadia na acomodação!!! Fomos super bem recebidos pela dona Sônia (mãe do Rafael) a qual nos apresentou a casa e se colocou a disposição. Além disso, o Rafael ficou muito disponível para retirar todas as minhas dúvidas por mensagem. Casa muito limpa, aconchegante e espaçosa. Localização ótima; fica bem pertinho da entrada do Santuário de Aparecida e da cidade do Romeiro. No final da estadia, ainda ganhamos mimos!! ❤️ Com certeza, voltaremos! Vale muito a pena." }
    ];

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