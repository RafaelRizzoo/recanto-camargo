import { Container } from 'react-bootstrap';

function Home() {
  return (
    <Container className="home-container" style={{ paddingTop: '100px' }}>
      <h1>Bem-vindo ao Recanto Camargo</h1>
      <p>Aqui mostraremos as fotos e pontos turísticos de Aparecida!</p>
    </Container>
  );
}

export default Home;