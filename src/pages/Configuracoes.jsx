import { useState, useEffect } from 'react';
import { Container, Row, Col, Nav, Form, Card, Alert } from 'react-bootstrap';
import { useAutenticacao } from '../hooks/useAutenticacao';
import Botao from '../components/UI/Botao';
import EntradaSenha from '../components/UI/EntradaSenha';

function Configuracoes() {
  const { usuario, tipo } = useAutenticacao();
  const [abaAtiva, setAbaAtiva] = useState('perfil');
  const [feedback, setFeedback] = useState({ tipo: '', msg: '' });

  // Estados separados para simular dados diferentes
  const [perfil, setPerfil] = useState({
    nome: usuario?.nome || '',
    email: usuario?.email || '',
    telefone: usuario?.telefone || '',
    cpf: tipo === 'hospede' ? '' : undefined, // Campo só para cliente
    cnpj: tipo === 'admin' ? '' : undefined,  // Campo só para admin
  });

  const [senhas, setSenhas] = useState({ atual: '', nova: '', confirmar: '' });
  
  // Notificações diferentes para cada perfil
  const [notificacoes, setNotificacoes] = useState({
    emailReserva: true,
    whatsReserva: tipo === 'admin', // Admin prefere WhatsApp para agilidade
    lembreteCheckin: true,
    marketing: tipo === 'hospede', // Só cliente recebe ofertas
    novoPedido: tipo === 'admin', // Só admin recebe pedido
    pagamentoRecebido: tipo === 'admin'
  });

  const [preferencias, setPreferencias] = useState({
    observacaoPadrao: tipo === 'hospede' ? '' : undefined // Só cliente deixa observação
  });

  useEffect(() => {
    // Simula carregamento de dados do backend
    setPerfil(p => ({
      ...p,
      cpf: tipo === 'hospede' ? '123.456.789-00' : undefined,
      cnpj: tipo === 'admin' ? '12.345.678/0001-99' : undefined
    }));
  }, [tipo]);

  const mostrarFeedback = (tipo, msg) => {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback({ tipo: '', msg: '' }), 3000);
  };

  const salvarPerfil = (e) => {
    e.preventDefault();
    mostrarFeedback('sucesso', 'Perfil atualizado com sucesso!');
  };

  const alterarSenha = (e) => {
    e.preventDefault();
    if (senhas.nova !== senhas.confirmar) return mostrarFeedback('erro', 'Senhas não coincidem.');
    mostrarFeedback('sucesso', 'Senha alterada!');
    setSenhas({ atual: '', nova: '', confirmar: '' });
  };

  const salvarNotificacoes = () => {
    mostrarFeedback('sucesso', 'Preferências de notificação salvas!');
  };

  const salvarPreferencias = () => {
    mostrarFeedback('sucesso', 'Preferências atualizadas!');
  };

  // Define quais abas aparecem para quem
  const abas = [
    { id: 'perfil', label: 'Dados Cadastrais', icone: 'bi-person-vcard' },
    { id: 'seguranca', label: 'Senha e Acesso', icone: 'bi-shield-lock' },
    { id: 'notificacoes', label: 'Notificações', icone: 'bi-bell' },
    ...(tipo === 'hospede' ? [{ id: 'preferencias', label: 'Preferências de Estadia', icone: 'bi-suit-heart' }] : [])
  ];

  const renderConteudo = () => {
    switch (abaAtiva) {
      case 'perfil':
        return (
          <Card className="border-0 shadow-sm config-card">
            <Card.Body className="p-4">
              <h5 className="mb-1 text-azul">
                {tipo === 'admin' ? 'Dados da Empresa' : 'Dados Pessoais'}
              </h5>
              <p className="text-muted small mb-4">
                {tipo === 'admin' 
                  ? 'Informações fiscais e de contato do responsável pelo imóvel.' 
                  : 'Seus dados para identificação e contato durante a reserva.'}
              </p>
              
              <Form onSubmit={salvarPerfil}>
                <Row>
                  <Col md={6} className="mb-3">
                    <Form.Label className="label-config">Nome {tipo === 'admin' ? 'Fantasia / Proprietário' : 'Completo'}</Form.Label>
                    <Form.Control
                      type="text"
                      className="form-controle-config"
                      value={perfil.nome}
                      onChange={e => setPerfil(p => ({ ...p, nome: e.target.value }))}
                    />
                  </Col>
                  
                  {tipo === 'admin' ? (
                    <Col md={6} className="mb-3">
                      <Form.Label className="label-config">CNPJ</Form.Label>
                      <Form.Control
                        type="text"
                        className="form-controle-config"
                        value={perfil.cnpj || ''}
                        readOnly
                        disabled
                      />
                    </Col>
                  ) : (
                    <Col md={6} className="mb-3">
                      <Form.Label className="label-config">CPF</Form.Label>
                      <Form.Control
                        type="text"
                        className="form-controle-config"
                        value={perfil.cpf || ''}
                        readOnly
                        disabled
                      />
                    </Col>
                  )}

                  <Col md={6} className="mb-3">
                    <Form.Label className="label-config">Email de Acesso</Form.Label>
                    <Form.Control
                      type="email"
                      className="form-controle-config"
                      value={perfil.email}
                      onChange={tipo === 'hospede' ? e => setPerfil(p => ({ ...p, email: e.target.value })) : undefined}
                      readOnly={tipo === 'admin'}
                      disabled={tipo === 'admin'}
                    />
                    {tipo === 'admin' && (
                      <Form.Text className="text-muted">Email vinculado ao contrato de desenvolvimento.</Form.Text>
                    )}
                  </Col>

                  <Col md={6} className="mb-3">
                    <Form.Label className="label-config">Telefone / WhatsApp</Form.Label>
                    <Form.Control
                      type="tel"
                      className="form-controle-config"
                      value={perfil.telefone}
                      onChange={e => setPerfil(p => ({ ...p, telefone: e.target.value }))}
                      placeholder="(00) 00000-0000"
                    />
                  </Col>
                </Row>
                <Botao className="btn-config mt-2">Salvar alterações</Botao>
              </Form>
            </Card.Body>
          </Card>
        );

      case 'seguranca':
        return (
          <Card className="border-0 shadow-sm config-card">
            <Card.Body className="p-4">
              <h5 className="mb-1 text-azul">Alterar Senha</h5>
              <p className="text-muted small mb-4">
                {tipo === 'admin' 
                  ? 'Mantenha a segurança do painel administrativo.' 
                  : 'Proteja sua conta e suas reservas.'}
              </p>
              
              <Form onSubmit={alterarSenha}>
                <div className="mb-3">
                  <Form.Label className="label-config">Senha atual</Form.Label>
                  <EntradaSenha 
                    nome="senhaAtual" 
                    placeholder="Digite sua senha atual" 
                    valor={senhas.atual}
                    onChange={e => setSenhas(p => ({ ...p, atual: e.target.value }))}
                  />
                </div>
                <div className="mb-3">
                  <Form.Label className="label-config">Nova senha</Form.Label>
                  <EntradaSenha 
                    nome="novaSenha" 
                    placeholder="Mínimo 6 caracteres" 
                    valor={senhas.nova}
                    onChange={e => setSenhas(p => ({ ...p, nova: e.target.value }))}
                  />
                </div>
                <div className="mb-4">
                  <Form.Label className="label-config">Confirmar nova senha</Form.Label>
                  <EntradaSenha 
                    nome="confirmarSenha" 
                    placeholder="Repita a nova senha" 
                    valor={senhas.confirmar}
                    onChange={e => setSenhas(p => ({ ...p, confirmar: e.target.value }))}
                  />
                </div>
                <Botao className="btn-config">Atualizar senha</Botao>
              </Form>
            </Card.Body>
          </Card>
        );

      case 'notificacoes':
        return (
          <Card className="border-0 shadow-sm config-card">
            <Card.Body className="p-4">
              <h5 className="mb-1 text-azul">
                {tipo === 'admin' ? 'Alertas do Sistema' : 'Central de Notificações'}
              </h5>
              <p className="text-muted small mb-4">
                {tipo === 'admin' 
                  ? 'Configure onde deseja receber atualizações sobre reservas e pagamentos.' 
                  : 'Escolha como deseja receber atualizações sobre sua estadia.'}
              </p>
              
              <div className="mb-3 p-3 bg-light rounded-3">
                {tipo === 'admin' ? (
                  <>
                    <Form.Check 
                      type="switch" 
                      label=" Nova solicitação de reserva (WhatsApp)" 
                      checked={notificacoes.whatsReserva}
                      onChange={e => setNotificacoes(p => ({ ...p, whatsReserva: e.target.checked }))}
                      className="mb-2"
                    />
                    <Form.Check 
                      type="switch" 
                      label="Confirmação de Pagamento (Email)" 
                      checked={notificacoes.pagamentoRecebido}
                      onChange={e => setNotificacoes(p => ({ ...p, pagamentoRecebido: e.target.checked }))}
                      className="mb-2"
                    />
                    <Form.Check 
                      type="switch" 
                      label="Solicitação de Cancelamento" 
                      checked={notificacoes.lembreteCheckin}
                      onChange={e => setNotificacoes(p => ({ ...p, lembreteCheckin: e.target.checked }))}
                    />
                  </>
                ) : (
                  <>
                    <Form.Check 
                      type="switch" 
                      label="Confirmação de nova reserva (Email)" 
                      checked={notificacoes.emailReserva}
                      onChange={e => setNotificacoes(p => ({ ...p, emailReserva: e.target.checked }))}
                      className="mb-2"
                    />
                    <Form.Check 
                      type="switch" 
                      label="Detalhes da reserva (WhatsApp)" 
                      checked={notificacoes.whatsReserva}
                      onChange={e => setNotificacoes(p => ({ ...p, whatsReserva: e.target.checked }))}
                      className="mb-2"
                    />
                    <Form.Check 
                      type="switch" 
                      label="Lembrete 24h antes do check-in" 
                      checked={notificacoes.lembreteCheckin}
                      onChange={e => setNotificacoes(p => ({ ...p, lembreteCheckin: e.target.checked }))}
                      className="mb-2"
                    />
                    <hr className="my-3 opacity-25" />
                    <Form.Check 
                      type="switch" 
                      label="Ofertas e novidades do Recanto" 
                      checked={notificacoes.marketing}
                      onChange={e => setNotificacoes(p => ({ ...p, marketing: e.target.checked }))}
                    />
                  </>
                )}
              </div>
              <Botao className="btn-config" onClick={salvarNotificacoes}>Salvar notificações</Botao>
            </Card.Body>
          </Card>
        );

      case 'preferencias':
        return tipo === 'hospede' ? (
          <Card className="border-0 shadow-sm config-card">
            <Card.Body className="p-4">
              <h5 className="mb-1 text-azul">Preferências de Estadia</h5>
              <p className="text-muted small mb-4">Facilite suas próximas reservas deixando informações padrão.</p>
              
              <Form onSubmit={salvarPreferencias}>
                <Form.Group className="mb-4">
                  <Form.Label className="label-config">Observação padrão para reservas</Form.Label>
                  <Form.Control 
                    as="textarea" 
                    rows={3} 
                    className="form-controle-config"
                    placeholder="Ex: Chegada prevista para as 15h, preciso de berço, levarei meu pet..."
                    value={preferencias.observacaoPadrao}
                    onChange={e => setPreferencias(p => ({ ...p, observacaoPadrao: e.target.value }))}
                  />
                </Form.Group>
                <Botao className="btn-config">Salvar preferências</Botao>
              </Form>
            </Card.Body>
          </Card>
        ) : null;

      default:
        return null;
    }
  };

  return (
    <div className="pagina-configuracoes py-5">
      <Container className="mt-4 pt-4">
        <div className="mb-4">
          <h2 className="titulo-secao-azul mb-1">Configurações</h2>
          <p className="text-muted mb-0">Gerencie seus dados, segurança e preferências.</p>
        </div>

        {feedback.msg && (
          <Alert variant={feedback.tipo === 'sucesso' ? 'success' : 'danger'} className="mb-4 border-0 shadow-sm" style={{ borderRadius: '12px' }}>
            <i className={`bi ${feedback.tipo === 'sucesso' ? 'bi-check-circle' : 'bi-exclamation-triangle'} me-2`}></i>
            {feedback.msg}
          </Alert>
        )}

        <Row className="g-4">
          <Col lg={3}>
            <Nav variant="pills" className="flex-column bg-white rounded-3 p-2 shadow-sm nav-config">
              {abas.map(aba => (
                <Nav.Link
                  key={aba.id}
                  className={`d-flex align-items-center gap-2 mb-1 rounded-pill ${abaAtiva === aba.id ? 'active' : ''}`}
                  onClick={() => setAbaAtiva(aba.id)}
                >
                  <i className={`bi ${aba.icone}`}></i>
                  <span>{aba.label}</span>
                </Nav.Link>
              ))}
            </Nav>
          </Col>

          <Col lg={9}>
            {renderConteudo()}
            
            <Card className="border-0 shadow-sm config-card mt-4 bg-light border-warning">
              <Card.Body className="p-3 d-flex align-items-center gap-3">
                <i className="bi bi-shield-check text-warning fs-4"></i>
                <div>
                  <strong>Proteção de Dados (LGPD)</strong>
                  <p className="mb-0 small text-muted">Seus dados são criptografados e nunca compartilhados com terceiros.</p>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default Configuracoes;