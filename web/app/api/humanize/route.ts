import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

const FIELD_LABELS: Record<string, string> = {
  legenda: 'Legenda',
  conceito: 'Conceito',
  descricao_peca: 'Descrição da peça',
  reels_fala: 'Fala',
  reels_tela: 'Tela',
  reels_visual: 'Visual',
};

const SYSTEM_PROMPT = `Você é um editor especializado em detectar padrões de escrita gerada por IA em português brasileiro.

Sua tarefa é identificar trechos problemáticos no texto fornecido e sugerir correções mínimas — sem reescrever além do necessário, sem inventar informação.

Padrões a detectar:

P01 Fragmentação dramática: três ou mais frases curtíssimas (menos de 6 palavras) em sequência criando ritmo artificial.
P02 Falso insight: construções "Não é sobre X, é sobre Y" / "Mais do que X, é Y" que prometem profundidade mas entregam truísmo.
P03 Regra de três inflada: agrupamentos de exatamente três adjetivos/substantivos sem justificativa.
P06b Redefinição dramática: "Isso não é [X]. É [Y com adjetivo dramático]." ou variações.
P06c Negação-redefinição inline: "não é [X]" seguido imediatamente (mesma frase ou frase de ≤4 palavras) de "é [Y]" vago ou óbvio. Ex: "Isso não é sistema: isso é suporte que entende de negócio." / "RA1000 não é coincidência. É time." / "Não é sorte. É método." — fundir em frase direta com argumento concreto.
P07 Vocabulário inflado: transformador/a, revolucionário/a, fundamental, essencial, crucial, vital (sem contexto real), ecossistema/cenário/paisagem como metáfora de mercado, jornada (fora de contexto literal), fascinante, incrível, poderoso, robusto, alavancar, potencializar, catalisar, impulsionar, florescer, prosperar, transcender (em contexto corporativo).
P07b Uso de "caos": palavra usada sem descrição específica dos problemas. Substituir por sintomas concretos.
P08 Intensificadores redundantes: "extremamente fundamental", "absolutamente essencial", "muito crucial".
P09 Adjetivos sem conteúdo: inovador, disruptivo, impactante sem dado que comprove.
P12 Travessão: qualquer uso de — ou – (banido integralmente). Substituir por vírgula, ponto ou dois-pontos.
P13 Inflação de significado: descreve o ordinário como histórico ou pivô.
P15 Hedging excessivo: "pode-se considerar que possivelmente isso poderia..."
P22 Conectores batidos no início de parágrafo: "Além disso,", "No entanto,", "Portanto,", "Ou seja,", "Dessa forma,", "Nesse contexto,".
P23 Anúncio desnecessário: "Vale destacar que", "É importante ressaltar que", "É fundamental pontuar que".
P24 Abertura genérica: "No mundo atual", "No cenário atual", "No contexto atual".
P25 "Cada vez mais" sem dado: afirmação vaga sem número que a sustente.
P27 Pergunta retórica como gancho: atrasa a informação real.
P28 Frase-slogan no final: encerra com clichê vago em vez da última ideia real.
P29 "Transformar" como verbo universal: transformar/transformação/transformador sem especificar o que muda.
P30 Falsa profundidade filosófica: "É no perder que se ganha", "Na crise nasce a oportunidade".
P31 Superlativos corporativos sem prova: "melhor solução do mercado", "referência no setor".`;

export async function POST(req: NextRequest) {
  try {
    const { fields } = await req.json() as { fields: Record<string, string | null> };

    const labeled = Object.entries(fields)
      .filter(([, v]) => v && stripHtml(v).trim().length > 20)
      .map(([k, v]) => `[${k}]\n${stripHtml(v!)}`)
      .join('\n\n');

    if (!labeled.trim()) return NextResponse.json({ issues: [] });

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Analise o texto abaixo e retorne APENAS um array JSON válido (sem texto antes ou depois, sem markdown, sem \`\`\`).

Formato de cada item:
{"field":"nome_do_campo","original":"trecho exato como aparece no texto","suggestion":"correção mínima","pattern":"P01","patternName":"nome do padrão"}

REGRAS CRÍTICAS:
- "original" deve ser uma substring EXATA do texto do campo correspondente
- Não invente informações nem adicione dados que não estão no original
- Se não houver problemas, retorne []
- Máximo de 10 itens, priorizando os mais impactantes

TEXTO:
${labeled}`,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '[]';
    const parsed = JSON.parse(text.replace(/^```json?\n?/, '').replace(/\n?```$/, ''));
    const issues = (parsed as Array<{ field: string; original: string; suggestion: string; pattern: string; patternName: string }>)
      .map((i) => ({ ...i, fieldLabel: FIELD_LABELS[i.field] ?? i.field }));

    return NextResponse.json({ issues });
  } catch (err) {
    console.error('humanize error', err);
    return NextResponse.json({ issues: [] });
  }
}
