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

A fonte "Niveau Grotesk" está disponível no projeto como @font-face.
A fonte "Poppins" deve ser carregada via Google Fonts (weights 400, 500, 600).

## ELEMENTOS GRÁFICOS DISPONÍVEIS
Os arquivos abaixo estão em /uikit/${clientId}/elementos/:
    ${elementoList}

### Regra de uso de elementos:
Prefira usar os elementos acima quando se encaixarem com o conteúdo do briefing.
Se nenhum elemento disponível se encaixar, você PODE criar ou sugerir elementos
visuais novos — desde que sigam o mesmo estilo: formas geométricas limpas,
cores da paleta acima, traço fino, visual de dados/analytics/tech.

## REGRAS GERAIS
- Nunca use cores fora da paleta sem justificativa explícita.
- Títulos sempre em Niveau Grotesk Bold.
- Corpo de texto sempre em Poppins.
- Prefira as combinações de cores aprovadas para fundo + texto.
- O visual deve remeter a dados, performance e marketing digital.
`
}
