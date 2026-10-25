/**
 * Geração de letra.
 *
 * Usa o LLM configurado no painel (via /api/lyrics no servidor local) e,
 * quando não há provedor ou servidor no ar, cai num gerador local simples
 * para o app continuar funcionando offline.
 */

const TEMPLATES = [
  {
    verse: [
      'Eu ando devagar pra não perder o tempo',
      'Deixando o passado falar baixinho',
      'Tem coisa que a gente não conta',
      'Tem strada que a gente não cheminhou',
    ],
    chorus: [
      'Vem comigo, deixa o mundo esperar',
      'A música já sabe o que fazer',
      'Se a noite cair, eu vou acender',
      'É só a gente e o que vier',
    ],
  },
  {
    verse: [
      'Guardei no bolso o que sobrou do dia',
      'E no refrão eu vou cantar mais alto',
      'A rua comprida me leva pra casa',
      'O som da madrugada é o meu lado',
    ],
    chorus: [
      'Levanta, levanta, que a vida não espera',
      'O que é seu fica, o que é dela se vai',
      'Se o mundo quiser, que venha na batida',
      'Eu já tô no meio do caminho',
    ],
  },
  {
    verse: [
      'Tem chuva na esquina e o tempo fechou',
      'Mas o meu peito bateu mais forte',
      'Não vim aqui pra pedir perdão',
      'Vim dizer que ainda existe razão',
    ],
    chorus: [
      'Não me pede pra esquecer o que foi',
      'A batida segue, o refrain segue',
      'Se a vida deu, a vida leva embora',
      'E o que fica é o que a gente escolhe',
    ],
  },
];

function pick<T>(list: T[], seed: number): T {
  return list[Math.abs(seed) % list.length];
}

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
  return h;
}

/** Gerador local de letra, usado quando não há LLM configurado. */
export function localLyrics(prompt: string, style: string): string {
  const seed = hash(`${prompt}|${style}`);
  const template = pick(TEMPLATES, seed);
  const topic = (prompt || 'a estrada').split(',')[0].trim() || 'a estrada';

  return [
    '[Intro]',
    `(${topic})`,
    '',
    '[Verse]',
    ...template.verse,
    '',
    '[Pre-Chorus]',
    'E a luz acende devagar',
    'O que eu disse fica no ar',
    '',
    '[Chorus]',
    ...template.chorus,
    '',
    '[Verse 2]',
    ...template.verse.slice().reverse(),
    '',
    '[Chorus]',
    ...template.chorus,
    '',
    '[Outro]',
    '(fade out)',
  ].join('\n');
}

export interface LyricsResult {
  ok: boolean;
  lyrics: string;
  source: 'llm' | 'local';
  message?: string;
}

export async function generateLyrics(
  prompt: string,
  style: string,
  language: 'pt' | 'en' = 'pt',
): Promise<LyricsResult> {
  if (!prompt.trim()) {
    return { ok: false, lyrics: '', source: 'local', message: 'Descreva o tema da música primeiro' };
  }

  try {
    const response = await fetch('/api/lyrics', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt, style, language }),
    });
    if (response.ok) {
      const data = (await response.json()) as { lyrics?: string; provider?: string };
      if (data.lyrics?.trim()) {
        return { ok: true, lyrics: data.lyrics.trim(), source: 'llm' };
      }
    }
  } catch {
    /* servidor fora do ar, usa o gerador local */
  }

  return { ok: true, lyrics: localLyrics(prompt, style), source: 'local' };
}
