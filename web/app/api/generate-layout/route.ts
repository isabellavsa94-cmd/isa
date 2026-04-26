import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { buildUIKitPrompt } from '@/lib/uikit-prompt'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SUPABASE_STORAGE = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/`
  : ''

const LAYER_SCHEMA = `
Retorne um JSON com o seguinte schema:
{
  "layers": [
    // Retângulo/fundo:
    { "id": string, "name": string, "type": "rect", "x": number, "y": number, "w": number, "h": number, "fill": string, "rx": number, "angle": number, "visible": true },
    // Texto:
    { "id": string, "name": string, "type": "text", "x": number, "y": number, "text": string, "fill": string, "fontSize": number, "fontWeight": number, "anchor": "start"|"middle"|"end", "letterSpacing": number, "angle": number, "visible": true },
    // Imagem/elemento SVG:
    { "id": string, "name": string, "type": "image", "x": number, "y": number, "w": number, "h": number, "src": string, "scale": number, "angle": number, "visible": true }
  ]
}

Canvas: 1080x1350px (formato Feed/Carrossel) ou 1080x1920px (Reels/Stories).
Coordenadas em pixels, origem no canto superior esquerdo.
Para elementos do UI Kit, use src = "/uikit/{clientId}/elementos/{slug}.svg".
Retorne APENAS o JSON, sem markdown, sem explicações.
`

export async function POST(req: NextRequest) {
  try {
    const { briefing, clientId, clientName } = await req.json()

    if (!briefing || !clientId || !clientName) {
      return NextResponse.json({ error: 'briefing, clientId e clientName são obrigatórios' }, { status: 400 })
    }

    // Busca referências de peças do cliente
    const supabase = await createClient()
    const { data: refRows } = await supabase
      .from('refs')
      .select('id, title, media_path, notes')
      .eq('client_id', clientId)
      .not('media_path', 'is', null)
      .order('created_at', { ascending: false })
      .limit(8)

    const clientRefs = (refRows ?? []) as { id: string; title: string | null; media_path: string; notes: string | null }[]

    const isVertical = briefing.format === 'Reels' || briefing.format === 'Stories'
    const canvasInfo = isVertical ? '1080x1920px' : '1080x1350px'

    const refNote = clientRefs.length > 0
      ? `\nAs imagens a seguir são peças APROVADAS e já publicadas deste cliente. Use-as como referência de estilo, composição e linguagem visual — não as copie, mas entenda o padrão e replique a identidade.\n`
      : ''

    const userText = `
Crie um layout de arte para o seguinte briefing:

Formato: ${briefing.format ?? 'Feed'} (canvas ${canvasInfo})
Título/demanda: ${briefing.nome_demanda ?? ''}
Conceito: ${briefing.conceito ?? ''}
Descrição da peça: ${briefing.descricao_peca ?? ''}
Legenda: ${briefing.legenda ?? ''}
Etapa do funil: ${briefing.etapa_funil ?? ''}
Canal: ${briefing.canal ?? ''}
${refNote}
${LAYER_SCHEMA}
`

    // Monta o conteúdo da mensagem do usuário — texto + imagens de referência
    type ContentPart =
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string; detail: 'low' } }

    const userContent: ContentPart[] = [{ type: 'text', text: userText }]

    for (const ref of clientRefs) {
      if (ref.media_path) {
        userContent.push({
          type: 'image_url',
          image_url: { url: `${SUPABASE_STORAGE}${ref.media_path}`, detail: 'low' },
        })
      }
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildUIKitPrompt(clientId, clientName) },
        { role: 'user', content: userContent },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    })

    const raw = response.choices[0].message.content ?? '{}'
    const parsed = JSON.parse(raw)

    return NextResponse.json({ layers: parsed.layers ?? [], refsUsed: clientRefs.length })
  } catch (err) {
    console.error('[generate-layout]', err)
    return NextResponse.json({ error: 'Erro ao gerar layout' }, { status: 500 })
  }
}
