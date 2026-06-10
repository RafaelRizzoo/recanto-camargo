import { useState, useEffect, useCallback } from 'react';

const PLACE_ID = 'ChIJGyElodXDzJQRkNAQwaUkAyQ';

// Singleton — evita carregar o SDK duas vezes
let sdkPromise = null;

function carregarSDK(chave) {
  if (sdkPromise) return sdkPromise;
  if (window.google?.maps?.places) {
    sdkPromise = Promise.resolve();
    return sdkPromise;
  }
  sdkPromise = new Promise((resolve, reject) => {
    const cb = '__googleMapsReady';
    window[cb] = () => { delete window[cb]; resolve(); };
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${chave}&libraries=places&callback=${cb}&language=pt-BR`;
    s.async = true;
    s.onerror = () => { sdkPromise = null; reject(new Error('Falha ao carregar Maps SDK')); };
    document.head.appendChild(s);
  });
  return sdkPromise;
}

// Converte o formato do SDK legado para o formato que os componentes já usam
function normalizar(reviews) {
  return (reviews ?? []).map(r => ({
    rating: r.rating,
    text: { text: r.text },
    publishTime: r.time ? new Date(r.time * 1000).toISOString() : null,
    authorAttribution: {
      displayName: r.author_name,
      photoUri: r.profile_photo_url ?? r.author_photo_url ?? null,
    },
  }));
}

export function useAvaliacoesGoogle() {
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [nota, setNota] = useState(null);
  const [total, setTotal] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const buscar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const chave = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
      if (!chave || chave === 'sua_chave_aqui') throw new Error('chave não configurada');

      await carregarSDK(chave);

      const place = await new Promise((resolve, reject) => {
        const service = new window.google.maps.places.PlacesService(document.createElement('div'));
        service.getDetails(
          { placeId: PLACE_ID, fields: ['rating', 'user_ratings_total', 'reviews'] },
          (result, status) => {
            status === window.google.maps.places.PlacesServiceStatus.OK
              ? resolve(result)
              : reject(new Error(`PlacesService: ${status}`));
          }
        );
      });

      console.log('[useAvaliacoesGoogle]', place);
      setNota(place.rating ?? null);
      setTotal(place.user_ratings_total ?? 0);
      setAvaliacoes(normalizar(place.reviews));
    } catch (err) {
      console.error('[useAvaliacoesGoogle] erro:', err.message);
      setErro('Não foi possível carregar as avaliações. Verifique sua conexão e tente novamente.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { buscar(); }, [buscar]);

  return { avaliacoes, nota, total, carregando, erro, tentar: buscar };
}
