import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import './Lightbox.css';

function Lightbox({ midias, indiceInicial, aoFechar }) {
  const [indice, setIndice] = useState(indiceInicial);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') aoFechar();
      if (e.key === 'ArrowLeft') navegar(-1);
      if (e.key === 'ArrowRight') navegar(1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [aoFechar]);

  const navegar = (dir) => {
    setIndice(p => (p + dir + midias.length) % midias.length);
  };

  const midia = midias[indice];
  if (!midia) return null;

  return (
    <div className="lightbox-overlay" onClick={aoFechar}>
      <div className="lightbox-box" onClick={e => e.stopPropagation()}>
        <button className="lb-btn lb-close" onClick={aoFechar} aria-label="Fechar">&times;</button>
        <button className="lb-btn lb-nav lb-prev" onClick={() => navegar(-1)} aria-label="Anterior">&#10094;</button>
        <button className="lb-btn lb-nav lb-next" onClick={() => navegar(1)} aria-label="Próxima">&#10095;</button>

        <div className="lb-media">
          {midia.ehVideo ? (
            <iframe src={midia.src} title={midia.alt} allowFullScreen loading="lazy" />
          ) : (
            <img key={indice} src={midia.src} alt={midia.alt} />
          )}
        </div>

        <div className="lb-info">
          <span className="lb-badge">{midia.categoria}</span>
          <p className="lb-desc">{midia.alt}</p>
        </div>
      </div>
    </div>
  );
}

Lightbox.propTypes = {
  midias: PropTypes.array.isRequired,
  indiceInicial: PropTypes.number.isRequired,
  aoFechar: PropTypes.func.isRequired,
};

export default Lightbox;