import { Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import './TermosPrivacidade.css';

function Privacidade() {
  return (
    <div className="politica-pagina-shell">
      {/* ── Hero Banner ── */}
      <section className="politica-hero text-center">
        <Container>
          <div className="politica-hero-tag">
            <i className="bi bi-shield-check" aria-hidden="true" />
            LGPD & Proteção de Dados
          </div>
          <h1 className="politica-hero-titulo">Aviso e Política de Privacidade</h1>
          <p className="politica-hero-sub">
            Conheça como tratamos, protegemos e garantimos a confidencialidade dos seus dados
            pessoais em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD).
          </p>
          <div className="politica-hero-meta">
            <span><i className="bi bi-shield-lock me-1" /> Em total conformidade com a LGPD</span>
            <span><i className="bi bi-clock-history me-1" /> Versão vigente: Setembro de 2026</span>
          </div>
        </Container>
      </section>

      {/* ── Conteúdo Principal ── */}
      <div className="politica-conteudo-wrapper">
        <Container>
          <div className="politica-card-principal">
            {/* Sumário */}
            <nav className="politica-sumario-box" aria-label="Sumário da Privacidade">
              <div className="politica-sumario-titulo">
                <i className="bi bi-list-check" aria-hidden="true" /> Seções da Política de Privacidade
              </div>
              <ul className="politica-sumario-lista">
                <li><a href="#controlador"><i className="bi bi-chevron-right" /> 1. Controlador de Dados</a></li>
                <li><a href="#dados"><i className="bi bi-chevron-right" /> 2. Dados Pessoais Coletados</a></li>
                <li><a href="#finalidades"><i className="bi bi-chevron-right" /> 3. Finalidades e Bases Legais</a></li>
                <li><a href="#compartilhamento"><i className="bi bi-chevron-right" /> 4. Compartilhamento de Dados</a></li>
                <li><a href="#seguranca"><i className="bi bi-chevron-right" /> 5. Segurança da Informação</a></li>
                <li><a href="#direitos"><i className="bi bi-chevron-right" /> 6. Direitos do Titular (LGPD)</a></li>
                <li><a href="#retencao"><i className="bi bi-chevron-right" /> 7. Tempo de Retenção</a></li>
                <li><a href="#dpo"><i className="bi bi-chevron-right" /> 8. Canal do Encarregado (DPO)</a></li>
              </ul>
            </nav>

            {/* 1. Controlador */}
            <section id="controlador" className="politica-secao">
              <div className="politica-secao-header">
                <div className="politica-secao-icone"><i className="bi bi-building-lock" /></div>
                <h2 className="politica-secao-titulo">1. Identificação do Controlador</h2>
              </div>
              <p>
                O <strong>Recanto Camargo</strong>, com sede no município de Aparecida, Estado de São Paulo,
                atua na qualidade de <strong>Controlador de Dados Pessoais</strong> nos termos do Art. 5º, VI
                da Lei nº 13.709/2018 (LGPD), sendo responsável pelas decisões referentes ao tratamento de dados
                fornecidos por hóspedes, usuários da plataforma web e visitantes.
              </p>
            </section>

            {/* 2. Dados Coletados */}
            <section id="dados" className="politica-secao">
              <div className="politica-secao-header">
                <div className="politica-secao-icone"><i className="bi bi-person-lines-fill" /></div>
                <h2 className="politica-secao-titulo">2. Dados Pessoais Coletados</h2>
              </div>
              <p>
                Coletamos apenas os dados estritamente necessários para a formalização, execução e segurança
                da sua estadia no chalé:
              </p>
              <ul>
                <li><strong>Dados de Identificação:</strong> Nome completo, CPF, RG ou documento de identidade oficial (exigido para conferência no check-in e segurança condominial/residencial).</li>
                <li><strong>Dados de Contato:</strong> Endereço de e-mail e número de telefone celular com WhatsApp (utilizados para envio de confirmações de reserva, vouchers e suporte ao viajante).</li>
                <li><strong>Dados da Estadia:</strong> Datas de check-in e check-out, número de ocupantes, eventuais observações de mobilidade e preferências informadas pelo hóspede.</li>
                <li><strong>Dados de Pagamento:</strong> Processados de forma tokenizada e criptografada por intermediadores de pagamento certificados (PCI-DSS); não armazenamos dados de cartão de crédito em nossos servidores locais.</li>
                <li><strong>Registros de Conexão:</strong> Endereço IP, data e hora de acesso, estritamente em cumprimento ao Art. 15 do Marco Civil da Internet (Lei 12.965/2014).</li>
              </ul>
            </section>

            {/* 3. Finalidades e Bases Legais */}
            <section id="finalidades" className="politica-secao">
              <div className="politica-secao-header">
                <div className="politica-secao-icone"><i className="bi bi-journal-check" /></div>
                <h2 className="politica-secao-titulo">3. Finalidades e Bases Legais do Tratamento</h2>
              </div>
              <p>
                Todo tratamento de dados pessoais realizado pelo Recanto Camargo apoia-se em hipóteses legais
                expressas no Artigo 7º da LGPD:
              </p>
              <table className="politica-tabela">
                <thead>
                  <tr>
                    <th>Finalidade do Tratamento</th>
                    <th>Dados Utilizados</th>
                    <th>Base Legal (LGPD)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Gerenciamento e confirmação de reservas do chalé</td>
                    <td>Nome, e-mail, telefone, datas e valor</td>
                    <td><strong>Execução de Contrato</strong> (Art. 7º, V)</td>
                  </tr>
                  <tr>
                    <td>Envio de orientações de check-in e suporte via WhatsApp</td>
                    <td>Nome, telefone celular</td>
                    <td><strong>Execução de Contrato & Legítimo Interesse</strong> (Art. 7º, V e IX)</td>
                  </tr>
                  <tr>
                    <td>Registro de hóspedes para exigências legais do turismo e segurança</td>
                    <td>Nome, CPF/RG, endereço</td>
                    <td><strong>Cumprimento de Obrigação Legal</strong> (Art. 7º, II)</td>
                  </tr>
                  <tr>
                    <td>Emissão de cupons e promoções exclusivas</td>
                    <td>Nome e e-mail</td>
                    <td><strong>Consentimento ou Legítimo Interesse</strong> (Art. 7º, I e IX)</td>
                  </tr>
                </tbody>
              </table>
            </section>

            {/* 4. Compartilhamento */}
            <section id="compartilhamento" className="politica-secao">
              <div className="politica-secao-header">
                <div className="politica-secao-icone"><i className="bi bi-share" /></div>
                <h2 className="politica-secao-titulo">4. Compartilhamento Restrito de Dados</h2>
              </div>
              <div className="politica-box-destaque">
                <strong>Compromisso de Não Comercialização:</strong> O Recanto Camargo <strong>jamais</strong> comercializa,
                aluga, repassa ou compartilha seus dados pessoais com terceiros para fins publicitários ou mercadológicos.
              </div>
              <p>
                O compartilhamento de dados ocorre exclusivamente nas seguintes hipóteses estritas:
              </p>
              <ul>
                <li>Provedores de infraestrutura tecnológica em nuvem e segurança de banco de dados com padrões rígidos de criptografia.</li>
                <li>Operadoras e gateways de pagamento para liquidação das diárias reservadas.</li>
                <li>Autoridades judiciais, policiais ou regulatórias, mediante ordem judicial formal ou expressa determinação legal.</li>
              </ul>
            </section>

            {/* 5. Segurança */}
            <section id="seguranca" className="politica-secao">
              <div className="politica-secao-header">
                <div className="politica-secao-icone"><i className="bi bi-shield-shaded" /></div>
                <h2 className="politica-secao-titulo">5. Segurança da Informação e Armazenamento</h2>
              </div>
              <p>
                Adotamos medidas técnicas, administrativas e organizacionais adequadas para proteger seus dados
                pessoais contra acessos não autorizados, situações acidentais ou ilícitas de destruição, perda,
                alteração ou comunicação indevida:
              </p>
              <ul>
                <li>Comunicação segura via protocolo HTTPS com certificado SSL/TLS de chave forte de 256 bits.</li>
                <li>Autenticação de administradores com controle rigoroso de privilégios de acesso aos dados dos hóspedes.</li>
                <li>Políticas de senhas criptografadas e proteção contra injeção e acessos indevidos.</li>
              </ul>
            </section>

            {/* 6. Direitos do Titular */}
            <section id="direitos" className="politica-secao">
              <div className="politica-secao-header">
                <div className="politica-secao-icone"><i className="bi bi-fingerprint" /></div>
                <h2 className="politica-secao-titulo">6. Direitos dos Titulares de Dados (Art. 18 da LGPD)</h2>
              </div>
              <p>
                Como titular de dados pessoais, você pode a qualquer momento exercer gratuitamente os seguintes
                direitos perante o Recanto Camargo:
              </p>
              <ul>
                <li><strong>Confirmação e Acesso:</strong> Confirmar a existência de tratamento e obter cópia dos dados que mantemos sobre você.</li>
                <li><strong>Correção:</strong> Solicitar a atualização ou retificação de dados incompletos, inexatos ou desatualizados.</li>
                <li><strong>Anonimização ou Eliminação:</strong> Requerer a exclusão de dados desnecessários ou tratados em desconformidade com a lei.</li>
                <li><strong>Revogação do Consentimento:</strong> Revogar a qualquer tempo autorizações concedidas para comunicações informativas ou promocionais.</li>
              </ul>
            </section>

            {/* 7. Retenção */}
            <section id="retencao" className="politica-secao">
              <div className="politica-secao-header">
                <div className="politica-secao-icone"><i className="bi bi-hourglass-split" /></div>
                <h2 className="politica-secao-titulo">7. Período de Retenção dos Dados</h2>
              </div>
              <p>
                Os dados pessoais serão retidos pelo período necessário para atingir as finalidades para as quais
                foram coletados, inclusive para fins de cumprimento de obrigações tributárias, fiscais,
                contábeis ou defesa em eventuais procedimentos judiciais (prazos prescricionais do Código Civil e
                do Código de Defesa do Consumidor). Findo o período aplicável, os dados serão descartados de forma
                segura e irreversível.
              </p>
            </section>

            {/* 8. Canal do DPO */}
            <section id="dpo" className="politica-secao">
              <div className="politica-secao-header">
                <div className="politica-secao-icone"><i className="bi bi-headset" /></div>
                <h2 className="politica-secao-titulo">8. Canal de Atendimento e Encarregado (DPO)</h2>
              </div>
              <p>
                Caso deseje esclarecer dúvidas sobre esta Política de Privacidade ou exercer quaisquer de seus
                direitos previstos na LGPD, nosso canal de atendimento está à disposição:
              </p>
              <div className="politica-box-destaque">
                <strong>Encarregado pelo Tratamento de Dados (DPO):</strong> Rafael Rizzo / Gestão Recanto Camargo<br />
                <strong>Local:</strong> Rua José Ourives, 76 - Ponte Alta, Aparecida - SP<br />
                <strong>Atendimento via WhatsApp:</strong> (12) 99999-9999<br />
                <strong>Prazo de Resposta:</strong> Em até 15 dias úteis, conforme estipulado pelo Art. 19 da LGPD.
              </div>
            </section>

            {/* Rodapé e Ação de Retorno */}
            <div className="politica-rodape-acoes">
              <Link to="/" className="btn-voltar-politica">
                <i className="bi bi-arrow-left" /> Voltar à Página Inicial
              </Link>
              <div className="d-flex gap-2">
                <Link to="/TermosDeUso" className="btn btn-outline-secondary btn-sm" style={{ borderRadius: '50px' }}>
                  <i className="bi bi-file-earmark-text me-1" /> Termos de Uso
                </Link>
                <Link to="/Reserva" className="btn btn-warning btn-sm fw-bold" style={{ borderRadius: '50px' }}>
                  <i className="bi bi-calendar-check me-1" /> Reservar Estadia
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </div>
    </div>
  );
}

export default Privacidade;
