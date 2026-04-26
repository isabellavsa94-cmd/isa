import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { buildUIKitPrompt } from '@/lib/uikit-prompt'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

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
    const artW = 1080
    const artH = isVertical ? 1920 : 1350

    // Busca referências de peças aprovadas do cliente
    const supabase = await createClient()
    const { data: refRows } = await supabase
      .from('refs')
      .select('id, title, media_path, notes')
      .eq('client_id', clientId)
      .not('media_path', 'is', null)
      .order('created_at', { ascending: false })
      .limit(6)

    const clientRefs = (refRows ?? []) as { id: string; title: string | null; media_path: string }[]

    const refIntro = clientRefs.length > 0
      ? `As imagens a seguir são peças JÁ APROVADAS E PUBLICADAS deste cliente. Analise o estilo visual, composição, hierarquia tipográfica e uso de cores — e replique esse padrão na arte nova. Não copie o conteúdo, replique a linguagem visual.\n`
      : ''

    const userPrompt = `
${refIntro}
Crie uma arte HTML para o briefing abaixo.

## BRIEFING
Formato: ${briefing.format ?? 'Feed'} — canvas ${artW}×${artH}px
Título/demanda: ${briefing.nome_demanda ?? ''}
Conceito: ${briefing.conceito ?? ''}
Descrição da peça: ${briefing.descricao_peca ?? ''}
Legenda: ${briefing.legenda ?? ''}
Etapa do funil: ${briefing.etapa_funil ?? ''}

## REQUISITOS TÉCNICOS DO HTML
- O div raiz DEVE ter exatamente: width:${artW}px; height:${artH}px; position:relative; overflow:hidden;
- Todos os elementos filhos usam position:absolute com top/left/right/bottom em px
- Inclua <style> com @import do Poppins e todos os estilos necessários
- font-family: 'Niveau Grotesk', sans-serif para títulos (já carregada na página)
- font-family: 'Poppins', sans-serif para corpo
- Todos os textos DEVEM caber dentro do canvas — use font-size menores se necessário
- Use word-wrap: break-word e width explícito em todos os elementos de texto
- Pills/badges: background colorido, border-radius:50px, padding:12px 32px, display:inline-block
- Retorne APENAS o HTML, nada mais.
`

    type ContentPart =
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string; detail: 'low' } }

    const userContent: ContentPart[] = [{ type: 'text', text: userPrompt }]

    for (const ref of clientRefs) {
      userContent.push({
        type: 'image_url',
        image_url: { url: `${SUPABASE_STORAGE}${ref.media_path}`, detail: 'low' },
      })
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: buildUIKitPrompt(clientId, clientName) },
        { role: 'user', content: userContent },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    })

    let html = response.choices[0].message.content ?? ''

    // Remove markdown code fences if the AI included them anyway
    html = html.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()

    if (!html.includes('<')) {
      return NextResponse.json({ error: 'IA não retornou HTML válido' }, { status: 500 })
    }

    return NextResponse.json({ html, refsUsed: clientRefs.length })
  } catch (err) {
    console.error('[generate-layout]', err)
    return NextResponse.json({ error: 'Erro ao gerar layout' }, { status: 500 })
  }
}
