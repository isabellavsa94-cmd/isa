export type UIKitColor = { hex: string; name: string }
export type UIKitTypography = { role: string; fontFamily: string; weight: string; sizePx: number }
export type UIKitElemento = { slug: string; label: string }
export type UIKitData = {
  colors: UIKitColor[]
  backgrounds: UIKitColor[]
  colorCombos: [string, string][]
  typography: UIKitTypography[]
  elementos: UIKitElemento[]
}

export const CLIENT_UIKITS: Record<string, UIKitData> = {
  'reportei-flux': {
    colors: [
      { hex: '#e5308f', name: 'Pink' },
      { hex: '#1876f2', name: 'Blue' },
      { hex: '#fd91eb', name: 'Light Pink' },
      { hex: '#013374', name: 'Dark Navy' },
      { hex: '#e3eefc', name: 'Light Blue' },
      { hex: '#492775', name: 'Purple' },
    ],
    backgrounds: [
      { hex: '#fff2fa', name: 'Warm White' },
      { hex: '#f9fafb', name: 'Cool White' },
      { hex: '#ffffff', name: 'White' },
      { hex: '#492775', name: 'Purple' },
      { hex: '#6d5291', name: 'Purple Mid' },
      { hex: '#a493ba', name: 'Purple Light' },
    ],
    colorCombos: [
      ['#013374', '#e3eefc'],
      ['#492775', '#fd91eb'],
      ['#e5308f', '#fd91eb'],
      ['#1876f2', '#492775'],
      ['#013374', '#1876f2'],
      ['#1876f2', '#e3eefc'],
      ['#492775', '#fff2fa'],
      ['#e3eefc', '#e5308f'],
      ['#e5308f', '#fff2fa'],
      ['#492775', '#e5308f'],
      ['#1876f2', '#e5308f'],
      ['#e5308f', '#fd91eb'],
    ],
    typography: [
      { role: 'Headline 1', fontFamily: 'Niveau Grotesk', weight: 'Bold', sizePx: 125 },
      { role: 'Headline 2', fontFamily: 'Niveau Grotesk', weight: 'Bold', sizePx: 99 },
      { role: 'Headline 3', fontFamily: 'Niveau Grotesk', weight: 'Bold', sizePx: 80 },
      { role: 'Headline 4', fontFamily: 'Niveau Grotesk', weight: 'Bold', sizePx: 62 },
      { role: 'Subtitle', fontFamily: 'Poppins', weight: 'Regular', sizePx: 70 },
      { role: 'Body 1', fontFamily: 'Poppins', weight: 'Regular', sizePx: 53 },
      { role: 'Body 2', fontFamily: 'Poppins', weight: 'Regular', sizePx: 42 },
    ],
    elementos: [
      { slug: 'ativo-01', label: 'Gráfico de pizza bicolor, azul e rosa' },
      { slug: 'ativo-02', label: 'Pilha de cards 3D isométrica, azul navy' },
      { slug: 'ativo-03', label: 'Janela de dashboard com visualização de dados' },
      { slug: 'ativo-04', label: 'Faísca/estrela decorativa, rosa claro' },
      { slug: 'ativo-05', label: 'Forma orgânica ondulada, elemento de fundo rosa' },
      { slug: 'ativo-06', label: 'Círculo sorriso, ícone de satisfação azul' },
      { slug: 'ativo-07', label: 'Gráfico de barras curvo ascendente, azul' },
      { slug: 'ativo-08', label: 'Foguete geométrico, símbolo de crescimento azul' },
      { slug: 'ativo-09', label: 'Forma de pico de montanha curvo, decoração azul' },
      { slug: 'ativo-10', label: 'Gráfico analítico complexo, camadas rosa e azul' },
      { slug: 'ativo-11', label: 'Ecossistema cloud com nós conectados, fundo rosa' },
      { slug: 'ativo-12', label: 'Envelope com faixa ondulada, fundo rosa claro' },
      { slug: 'ativo-13', label: 'Dashboard UI complexo com janelas e gráficos aninhados' },
      { slug: 'ativo-14', label: 'Estrutura de pastas geométrica multicolorida' },
      { slug: 'ativo-15', label: 'Ícone de checkmark com badge de verificação' },
      { slug: 'ativo-16', label: 'Pilha de documentos/planilhas, preenchimento azul claro' },
      { slug: 'ativo-17', label: 'Visualização de gráfico com linhas e pontos de dados' },
      { slug: 'ativo-18', label: 'Padrão de grade decorativo, elemento de fundo' },
      { slug: 'ativo-19', label: 'Múltiplos frames de smartphone com dashboards' },
      { slug: 'ativo-20', label: 'Lupa com gráfico de análise, ícone de busca decorativo' },
      { slug: 'ativo-21', label: 'Documento flutuante com datas de calendário, fundo azul claro' },
      { slug: 'ativo-55', label: 'Pílula arredondada rosa, container/botão vazio' },
      { slug: 'ativo-56', label: 'Pílula arredondada azul, container/botão vazio' },
      { slug: 'ativo-57', label: 'Pílula arredondada azul claro, container/botão vazio' },
      { slug: 'ativo-58', label: 'Padrão de grade decorativo, linhas roxas' },
      { slug: 'ativo-59', label: 'Padrão de grade decorativo, linhas azul claro' },
    ],
  },
}
