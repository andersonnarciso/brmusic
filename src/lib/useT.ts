import { useCallback } from 'react';
import { useApp } from './store';
import { translate } from './i18n';

/**
 * Retorna a funcao de traducao ligada ao idioma atual.
 * O texto de origem esta em portugues; quando o idioma e ingles, a traducao
 * e aplicada a partir do dicionario.
 */
export function useT() {
  const language = useApp((s) => s.language);
  return useCallback((text: string) => translate(text, language), [language]);
}
