import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { buildUIKitPrompt } from '@/lib/uikit-prompt'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SUPABASE_STORAGE = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/`
  : ''

export async function POST(req: NextRequest) {
  try {
    const { briefing, clientId, clientName } = await req.json()

    if (!briefing || !clientId || !clientName) {
      return NextResponse.json({ error: 'briefing, clientId e clientName são obrigatórios' }, { status: 400 })
    }

    const isVertical = briefing.format === 'Reels' || briefing.format === 'Stories'
    const artW = 1024
    const artH = 1536

    // Busca referências de peças aprovadas
    const supabase = await createClient()
    const { data: refRows } = await supabase
      .from('refs')
      .select('id, title, media_path')
      .eq('client_id', clientId)
      .not('media_path', 'is', null)
      .order('created_at', { ascending: false })
      .limit(6)

    const clientRefs = (refRows ?? []) as { id: string; title: string | null; media_path: string }[]

    // Monta conteúdo do usuário — texto + imagens de referência via vision
    type ContentBlock =
      | { type: 'text'; text: string }
      | { type: 'image'; source: { type: 'url'; url: string } }

    const userContent: ContentBlock[] = []

    if (clientRefs.length > 0) {
      userContent.push({
        type: 'text',
        text: `As imagens abaixo são peças JÁ APROVADAS E PUBLICADAS deste cliente. Analise profundamente: composição, hierarquia tipográfica, uso de cores, tamanhos relativos, espaçamentos, estilo de badges/pills, posicionamento de elementos. Replique EXATAMENTE essa linguagem visual na arte nova — não o conteúdo, mas o estilo.\n`,
      })
      for (const ref of clientRefs) {
        userContent.push({
          type: 'image',
          source: { type: 'url', url: `${SUPABASE_STORAGE}${ref.media_path}` },
        })
      }
    }

    userContent.push({
      type: 'text',
      text: `
Crie o HTML completo de uma arte para o briefing abaixo.

## BRIEFING
Formato: ${briefing.format ?? 'Feed'} — canvas ${artW}×${artH}px
Título/demanda: ${briefing.nome_demanda ?? ''}
Conceito: ${briefing.conceito ?? ''}
Descrição da peça: ${briefing.descricao_peca ?? ''}
Legenda: ${briefing.legenda ?? ''}
Etapa do funil: ${briefing.etapa_funil ?? ''}

## REQUISITOS TÉCNICOS
- O div raiz DEVE ter exatamente: width:${artW}px; height:${artH}px; position:relative; overflow:hidden;
- Todos os elementos filhos usam position:absolute com coordenadas em px
- Inclua <style> com @import do Poppins (Google Fonts) e todos os estilos
- font-family: 'Niveau Grotesk', sans-serif para títulos (já carregada na página)
- font-family: 'Poppins', sans-serif para textos de apoio
- Todos os textos DEVEM caber dentro do canvas — use width explícito e word-wrap:break-word
- Pills/badges: border-radius:50px, padding:16px 40px, display:inline-block, font-weight:700
- Retorne APENAS o HTML, sem markdown, sem \`\`\`html, sem nenhuma explicação
`,
    })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: buildUIKitPrompt(clientId, clientName),
      messages: [{ role: 'user', content: userContent }],
    })

    let html = response.content[0].type === 'text' ? response.content[0].text : ''
    html = html.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()

    if (!html.includes('<')) {
      return NextResponse.json({ error: 'Claude não retornou HTML válido' }, { status: 500 })
    }

    return NextResponse.json({ html, refsUsed: clientRefs.length })
  } catch (err) {
    console.error('[generate-html]', err)
    return NextResponse.json({ error: 'Erro ao gerar layout' }, { status: 500 })
  }
}
