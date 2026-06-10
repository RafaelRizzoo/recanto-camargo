import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import './Lightbox.css';

function Lightbox({ midias, indiceInicial, aoFechar }) {
  const [indice, setIndice] = useState(indiceInicial);
  const [animando, setAnimando] = useState(false);
  const [direcao, setDirecao] = useState(0);

  useEffect(() => {
    // Trava o scroll do body
    document.body.style.overflow = 'hidden';
    
    const handleKey = (e) => {
      if (e.key === 'Escape') aoFechar();
      if (e.key === 'ArrowLeft') navegar(-1);
      if (e.key === 'ArrowRight') navegar(1);
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleKey);
    };
  }, [aoFechar]);

  const navegar = (dir) => {
    if (animando) return;
    setDirecao(dir);
    setAnimando(true);
    setIndice(p => (p + dir + midias.length) % midias.length);
    setTimeout(() => setAnimando(false), 300); // tempo da animação
  };

  const midia = midias[indice];
  if (!midia) return null;

  const modalContent = (
    <div className="lightbox-overlay" onClick={aoFechar}>
      
      {/* Topbar Premium */}
      <div className="lightbox-topbar" onClick={e => e.stopPropagation()}>
        <div className="lightbox-counter">
          {indice + 1} / {midias.length}
        </div>
        <button className="lightbox-close-btn" onClick={aoFechar} aria-label="Fechar">
          <i className="bi bi-x-lg"></i>
        </button>
      </div>

      {/* Navegação Lateral */}
      <button 
        className="lightbox-nav-btn lightbox-prev-btn" 
        onClick={(e) => { e.stopPropagation(); navegar(-1); }}
      >
        <i className="bi bi-chevron-left"></i>
      </button>
      
      <button 
        className="lightbox-nav-btn lightbox-next-btn" 
        onClick={(e) => { e.stopPropagation(); navegar(1); }}
      >
        <i className="bi bi-chevron-right"></i>
      </button>

      {/* Container da Mídia */}
      <div className="lightbox-content-area" onClick={e => e.stopPropagation()}>
        <div className={`lightbox-media-container ${animando ? (direcao > 0 ? 'slide-left' : 'slide-right') : ''}`}>
          {midia.ehVideo ? (
            <div className={`lightbox-video-wrapper${midia.ehShort ? ' short' : ''}`}>
              <iframe
                key={midia.youtubeId}
                src={`https://www.youtube.com/embed/${midia.youtubeId}?autoplay=1&rel=0&modestbranding=1&controls=1&hd=1`}
                title={midia.alt}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <img key={indice} src={midia.src} alt={midia.alt} className="lightbox-img" />
          )}
        </div>

        {/* Informações da foto (opcional) */}
        <div className="lightbox-caption">
          <span className="lightbox-badge">{midia.categoria}</span>
          <span className="lightbox-desc">{midia.alt}</span>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

Lightbox.propTypes = {
  midias: PropTypes.array.isRequired,
  indiceInicial: PropTypes.number.isRequired,
  aoFechar: PropTypes.func.isRequired,
};

export default Lightbox;