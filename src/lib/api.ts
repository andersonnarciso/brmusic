/**
 * Resolução da URL da API local.
 *
 * Na versão web o app é servido pelo próprio servidor (http://127.0.0.1:4328),
 * então as rotas /api/* são relativas à origem e funcionam.
 *
 * No app desktop (Electron) a interface é carregada via file:// e não existe
 * servidor de arquivos por trás. Nesse caso o processo principal sobe o backend
 * local em uma porta livre e injeta a URL http:// dele no preload
 * (--brmusic-api-url=...). Sem essa correção, todo fetch('/api/...') vira
 * file:///api/... e falha silenciosamente: o app continua funcionando, mas
 * nunca fala com o servidor.
 */

export function apiBase(): string {
  if (typeof window === 'undefined') return '';
  return window.desktop?.apiUrl ?? '';
}

/** URL absoluta de uma rota da API, pronta para o fetch. */
export function apiUrl(path: string): string {
  const base = apiBase();
  return base ? `${base}${path}` : path;
}

/**
 * fetch com a URL da API já resolvida.
 * O content-type só é enviado quando há corpo, para não disparar preflight
 * desnecessário em requisições simples.
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers ?? {});
  if (init?.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  return fetch(apiUrl(path), { ...init, headers });
}

/** Lê o corpo de uma resposta como JSON, tolerando resposta vazia. */
export async function readJson<T>(response: Response): Promise<T | null> {
  try {
    const text = await response.text();
    if (!text.trim()) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
