import { useContext } from 'react';
import { AuthContext } from '../context/ContextoAutenticacao';

export function useAutenticacao() {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error('useAutenticacao deve ser utilizado dentro de ContextoAutenticacao');
  }
  return contexto;
}