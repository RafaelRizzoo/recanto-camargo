import { Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import './TermosPrivacidade.css';

function TermosDeUso() {
  return (
    <div className="politica-pagina-shell">
      {/* ── Hero Banner ── */}
      <section className="politica-hero text-center">
        <Container>
          <div className="politica-hero-tag">
            <i className="bi bi-file-earmark-text" aria-hidden="true" />
            Governança & Estadia
          </div>
          <h1 className="politica-hero-titulo">Termos e Condições de Uso</h1>
          <p className="politica-hero-sub">
            Regras de convivência, diretrizes de reserva, política de cancelamento e orientações
            para sua estadia acolhedora no Recanto Camargo em Aparecida-SP.
          </p>
          <div className="politica-hero-meta">
            <span><i className="bi bi-clock-history me-1" /> Atualizado em: Setembro de 2026</span>
            <span><i className="bi bi-geo-alt me-1" /> Aparecida, SP</span>
          </div>
        </Container>
      </section>

      {/* ── Conteúdo Principal ── */}
      <div className="politica-conteudo-wrapper">
        <Container>
          <div className="politica-card-principal">
            {/* Sumário Navegável */}
            <nav className="politica-sumario-box" aria-label="Sumário dos Termos">
              <div className="politica-sumario-titulo">
                <i className="bi bi-list-check" aria-hidden="true" /> Sumário das Cláusulas
              </div>
              <ul className="politica-sumario-lista">
                <li><a href="#objeto"><i className="bi bi-chevron-right" /> 1. Objeto da Locação</a></li>
                <li><a href="#horarios"><i className="bi bi-chevron-right" /> 2. Check-in e Check-out</a></li>
                <li><a href="#regras"><i className="bi bi-chevron-right" /> 3. Regras da Casa & Silêncio</a></li>
                <li><a href="#cancelamento"><i className="bi bi-chevron-right" /> 4. Política de Cancelamento</a></li>
                <li><a href="#patrimonio"><i className="bi bi-chevron-right" /> 5. Preservação & Danos</a></li>
                <li><a href="#pets"><i className="bi bi-chevron-right" /> 6. Política Pet-Friendly</a></li>
                <li><a href="#seguranca"><i className="bi bi-chevron-right" /> 7. Garagem & Segurança</a></li>
                <li><a href="#foro"><i className="bi bi-chevron-right" /> 8. Foro de Eleição</a></li>
              </ul>
            </nav>

            {/* 1. Objeto */}
            <section id="objeto" className="politica-secao">
              <div className="politica-secao-header">
                <div className="politica-secao-icone"><i className="bi bi-house-door" /></div>
                <h2 className="politica-secao-titulo">1. Objeto da Locação por Temporada</h2>
              </div>
              <p>
                O presente instrumento regula os termos, direitos e deveres para a locação por temporada do
                imóvel residencial <strong>Recanto Camargo</strong>, situado no município de Aparecida-SP,
                destinado exclusivamente a fins residenciais e turísticos de peregrinos e famílias.
              </p>
              <div className="politica-box-destaque">
                <strong>Capacidade Máxima:</strong> O chalé acomoda confortavelmente o número de pessoas
                declarado e aprovado no momento da confirmação da reserva. É estritamente vedada a
                permanência ou pernoite de pessoas não cadastradas na plataforma sem prévia autorização.
              </div>
            </section>

            {/* 2. Horários */}
            <section id="horarios" className="politica-secao">
              <div className="politica-secao-header">
                <div className="politica-secao-icone"><i className="bi bi-clock" /></div>
                <h2 className="politica-secao-titulo">2. Horários de Check-in e Check-out</h2>
              </div>
              <p>
                Para assegurar a higienização impecável e o acolhimento seguro de todos os hóspedes,
                estabelecem-se os seguintes horários padrão:
              </p>
              <ul>
                <li><strong>Check-in (Entrada):</strong> A partir das <strong>14:00h</strong> do dia previsto na reserva.</li>
                <li><strong>Check-out (Saída):</strong> Até às <strong>11:00h</strong> do dia final da estadia.</li>
              </ul>
              <p>
                Solicitações de antecipação (<em>early check-in</em>) ou prorrogação (<em>late check-out</em>)
                devem ser comunicadas com antecedência mínima de 24 horas e estão sujeitas à disponibilidade
                de calendário e eventuais taxas operacionais.
              </p>
            </section>

            {/* 3. Regras e Convivência */}
            <section id="regras" className="politica-secao">
              <div className="politica-secao-header">
                <div className="politica-secao-icone"><i className="bi bi-volume-mute" /></div>
                <h2 className="politica-secao-titulo">3. Regras de Convivência & Lei do Silêncio</h2>
              </div>
              <p>
                O Recanto Camargo está localizado em um bairro residencial tranquilo de Aparecida, ideal para
                descanso físico e espiritual após a visita ao Santuário Nacional. Por essa razão:
              </p>
              <ul>
                <li><strong>Horário de Silêncio:</strong> Vigora rigorosamente entre <strong>22:00h e 08:00h</strong>. É proibido som alto, instrumentos ou algazarra neste período.</li>
                <li><strong>Eventos e Festas:</strong> São terminantemente proibidas festas, eventos abertos, reuniões ruidosas ou comemorações com terceiros não autorizados.</li>
                <li><strong>Ambiente Livre de Fumo:</strong> É expressamente proibido fumar (cigarros tradicionais, eletrônicos, narguilés ou substâncias correlatas) no interior dos quartos, banheiros e salas. O fumo é permitido exclusivamente nas áreas externas descobertas, com descarte correto das cinzas.</li>
              </ul>
            </section>

            {/* 4. Política de Cancelamento */}
            <section id="cancelamento" className="politica-secao">
              <div className="politica-secao-header">
                <div className="politica-secao-icone"><i className="bi bi-calendar-x" /></div>
                <h2 className="politica-secao-titulo">4. Política de Cancelamento e Reembolso</h2>
              </div>
              <p>
                Compreendemos que imprevistos acontecem durante viagens e romarias. Nossa política de cancelamento
                busca harmonizar a segurança do anfitrião e a transparência para o hóspede:
              </p>
              <table className="politica-tabela">
                <thead>
                  <tr>
                    <th>Prazo do Pedido de Cancelamento</th>
                    <th>Percentual de Reembolso</th>
                    <th>Condições</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Até 7 dias corridos</strong> antes do check-in</td>
                    <td><span className="badge bg-success">100% de Reembolso</span></td>
                    <td>Reembolso integral do valor pago na reserva.</td>
                  </tr>
                  <tr>
                    <td><strong>Entre 6 e 2 dias</strong> antes do check-in</td>
                    <td><span className="badge bg-warning text-dark">50% de Reembolso</span></td>
                    <td>Retenção de 50% para cobertura de bloqueio de datas.</td>
                  </tr>
                  <tr>
                    <td><strong>Menos de 48h</strong> ou não comparecimento (<em>No-show</em>)</td>
                    <td><span className="badge bg-danger">Sem Reembolso</span></td>
                    <td>O valor integral da reserva é retido para cobrir o custo de indisponibilidade.</td>
                  </tr>
                </tbody>
              </table>
              <div className="politica-box-aviso">
                <i className="bi bi-info-circle-fill me-2" />
                Em situações comprovadas de caso fortuito ou força maior (como interdições de estradas por desastres
                naturais ou emergências médicas hospitalares documentadas), o anfitrião poderá avaliar a remarcação
                de datas sem cobrança de multas, mediante disponibilidade de calendário.
              </div>
            </section>

            {/* 5. Patrimônio e Danos */}
            <section id="patrimonio" className="politica-secao">
              <div className="politica-secao-header">
                <div className="politica-secao-icone"><i className="bi bi-shield-check" /></div>
                <h2 className="politica-secao-titulo">5. Preservação do Imóvel, Enxoval e Danos</h2>
              </div>
              <p>
                O hóspede recebe o chalé devidamente limpo, com mobília conservada, eletrodomésticos em pleno
                funcionamento e enxoval de cama e banho higienizado. O hóspede compromete-se a:
              </p>
              <ul>
                <li>Zelar pela conservação das instalações elétricas, hidráulicas, móveis, TV e utensílios de cozinha.</li>
                <li>Não utilizar toalhas de banho ou lençóis para limpeza de chão, veículos ou graxa. Manchas permanentes ensejarão cobrança de reposição.</li>
                <li>Comunicar imediatamente ao anfitrião qualquer falha, vazamento ou avaria preexistente identificada na entrada.</li>
                <li>Ressarcir custos de eventuais danos causados culposa ou dolosamente às dependências do chalé por quaisquer membros do seu grupo.</li>
              </ul>
            </section>

            {/* 6. Pets */}
            <section id="pets" className="politica-secao">
              <div className="politica-secao-header">
                <div className="politica-secao-icone"><i className="bi bi-heart" /></div>
                <h2 className="politica-secao-titulo">6. Política Pet-Friendly</h2>
              </div>
              <p>
                O Recanto Camargo ama receber animais de estimação! Para garantir o conforto de todos:
              </p>
              <ul>
                <li>A presença de animais de estimação deve ser informada previamente no momento da reserva.</li>
                <li>O tutor é responsável pelo recolhimento de dejetos e pela manutenção da higiene geral das áreas externas e internas.</li>
                <li>Não é permitido que os pets subam em sofás e camas ou fiquem sozinhos latindo ininterruptamente no imóvel.</li>
              </ul>
            </section>

            {/* 7. Garagem e Segurança */}
            <section id="seguranca" className="politica-secao">
              <div className="politica-secao-header">
                <div className="politica-secao-icone"><i className="bi bi-car-front" /></div>
                <h2 className="politica-secao-titulo">7. Garagem Privativa & Responsabilidades</h2>
              </div>
              <p>
                O imóvel disponibiliza vaga de garagem privativa e fechada. Recomenda-se manter o portão sempre
                fechado e travado ao entrar e sair. O Recanto Camargo não se responsabiliza por objetos de valor,
                joias ou quantias em dinheiro deixadas sem supervisão no interior do veículo ou do imóvel.
              </p>
            </section>

            {/* 8. Foro */}
            <section id="foro" className="politica-secao">
              <div className="politica-secao-header">
                <div className="politica-secao-icone"><i className="bi bi-bank" /></div>
                <h2 className="politica-secao-titulo">8. Legislação Aplicável e Foro de Eleição</h2>
              </div>
              <p>
                Este instrumento rege-se pelas leis da República Federativa do Brasil, em especial pela
                Lei nº 8.245/1991 (Lei do Inquilinato - Locação por Temporada) e subsidiariamente pelo Código
                Civil Brasileiro. Para dirimir qualquer controvérsia decorrente da interpretação ou execução
                deste contrato, fica eleito o <strong>Foro da Comarca de Aparecida, Estado de São Paulo</strong>.
              </p>
            </section>

            {/* Rodapé e Ação de Retorno */}
            <div className="politica-rodape-acoes">
              <Link to="/" className="btn-voltar-politica">
                <i className="bi bi-arrow-left" /> Voltar à Página Inicial
              </Link>
              <div className="d-flex gap-2">
                <Link to="/Privacidade" className="btn btn-outline-secondary btn-sm" style={{ borderRadius: '50px' }}>
                  <i className="bi bi-shield-lock me-1" /> Política de Privacidade (LGPD)
                </Link>
                <Link to="/Reserva" className="btn btn-warning btn-sm fw-bold" style={{ borderRadius: '50px' }}>
                  <i className="bi bi-calendar-check me-1" /> Fazer Reserva
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </div>
    </div>
  );
}

export default TermosDeUso;
