import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { buildImagePrompt } from '@/lib/uikit-prompt'

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
    const artW = 1024
    const artH = isVertical ? 1536 : 1536  // portrait for all social formats

    // Build text prompt from briefing + UI Kit
    const prompt = buildImagePrompt(clientId, clientName, briefing, artW, artH)

    // Fetch reference images to use as visual context (up to 4)
    const supabase = await createClient()
    const { data: refRows } = await supabase
      .from('refs')
      .select('id, title, media_path')
      .eq('client_id', clientId)
      .not('media_path', 'is', null)
      .order('created_at', { ascending: false })
      .limit(4)

    const clientRefs = (refRows ?? []) as { id: string; media_path: string }[]

    let imageB64: string

    if (clientRefs.length > 0) {
      // Use gpt-image-1 edit endpoint with reference images as context
      // Fetch the first reference image to use as base
      const refUrl = `${SUPABASE_STORAGE}${clientRefs[0].media_path}`
      const imgRes = await fetch(refUrl)
      const imgBuffer = await imgRes.arrayBuffer()
      const imgBlob = new Blob([imgBuffer], { type: 'image/png' })
      const imgFile = new File([imgBlob], 'reference.png', { type: 'image/png' })

      const editResponse = await openai.images.edit({
        model: 'gpt-image-1',
        image: imgFile,
        prompt: `Using the provided image ONLY as a style reference (colors, typography mood, layout language) — do NOT copy its content. Create a completely NEW design with this briefing:\n\n${prompt}`,
        size: '1024x1536',
      })

      imageB64 = editResponse.data?.[0]?.b64_json ?? ''
    } else {
      // No refs: straight generation
      const genResponse = await openai.images.generate({
        model: 'gpt-image-1',
        prompt,
        size: '1024x1536',
        quality: 'high',
      })

      imageB64 = genResponse.data?.[0]?.b64_json ?? ''
    }

    if (!imageB64) {
      return NextResponse.json({ error: 'IA não retornou imagem' }, { status: 500 })
    }

    const imageDataUrl = `data:image/png;base64,${imageB64}`

    // Wrap image in editable HTML so the user can add text overlays
    const html = `<style>
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
</style>
<div style="width:${artW}px;height:${artH}px;position:relative;overflow:hidden;">
  <img src="${imageDataUrl}" style="width:100%;height:100%;object-fit:cover;display:block;" />
</div>`

    return NextResponse.json({ html, imageDataUrl, refsUsed: clientRefs.length })
  } catch (err: unknown) {
    console.error('[generate-layout]', err)
    const message = err instanceof Error ? err.message : 'Erro ao gerar'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
