import { CLIENT_UIKITS, type UIKitData } from './uikit'

export function buildUIKitPrompt(clientId: string, clientName: string): string {
  const kit: UIKitData | undefined = CLIENT_UIKITS[clientId]

  if (!kit) {
    return `Cliente: ${clientName}. UI Kit não configurado — use critério visual neutro.`
  }

  const colorList = kit.colors.map(c => `${c.hex} (${c.name})`).join(', ')
  const bgList = kit.backgrounds.map(c => `${c.hex} (${c.name})`).join(', ')
  const comboList = kit.colorCombos.map(([a, b]) => `[${a} + ${b}]`).join(', ')
  const typoList = kit.typography
    .map(t => `${t.role}: ${t.fontFamily} ${t.weight}, ${t.sizePx}px`)
    .join('\n    ')
  const elementoList = kit.elementos
    .map(e => `- ${e.slug}: ${e.label}`)
    .join('\n    ')

  return `Você é um designer especialista criando artes para o cliente "${clientName}".
Siga rigorosamente o UI Kit abaixo em todas as decisões visuais.

## PALETA DE CORES
${colorList}

## CORES DE FUNDO
${bgList}

## COMBINAÇÕES APROVADAS
${comboList}

## TIPOGRAFIA
    ${typoList}

A fonte "Niveau Grotesk" já está carregada via @font-face na página (use font-family: 'Niveau Grotesk', sans-serif).
A fonte "Poppins" use via: @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap')

## ELEMENTOS GRÁFICOS DISPONÍVEIS
Os arquivos abaixo estão disponíveis como <img src="/uikit/${clientId}/elementos/{slug}.svg">
    ${elementoList}

Se nenhum elemento disponível se encaixar, crie formas geométricas com CSS puro
(círculos, retângulos arredondados, gradientes) nas cores da paleta.

## REGRAS GERAIS DE DESIGN
- Títulos sempre em Niveau Grotesk Bold, corpo em Poppins.
- Prefira as combinações de cores aprovadas para fundo + texto.
- Use pills/badges arredondados (border-radius: 50px) para destacar palavras-chave — é a linguagem visual deste cliente.
- O visual deve remeter a dados, performance e marketing digital.
- Composições com texto grande e bold são preferidas. Hierarquia clara: 1 headline dominante + 1 apoio.
- Margens internas de pelo menos 60px nas bordas do canvas.

## SAÍDA ESPERADA
Retorne SOMENTE HTML puro (sem markdown, sem \`\`\`html, sem explicações).
O HTML deve ser um fragmento completo incluindo uma tag <style> e um div raiz com as dimensões corretas.
`
}
