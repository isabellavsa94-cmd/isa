export type UIKitColor = { hex: string; name: string }
export type UIKitTypography = { role: string; fontFamily: string; weight: string; sizePx: number }
export type UIKitData = {
  colors: UIKitColor[]
  backgrounds: UIKitColor[]
  colorCombos: [string, string][]
  typography: UIKitTypography[]
  elementos: string[]
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
      'ativo-01', 'ativo-02', 'ativo-03', 'ativo-04', 'ativo-05',
      'ativo-06', 'ativo-07', 'ativo-08', 'ativo-09', 'ativo-10',
      'ativo-11', 'ativo-12', 'ativo-13', 'ativo-14', 'ativo-15',
      'ativo-16', 'ativo-17', 'ativo-18', 'ativo-19', 'ativo-20',
      'ativo-21', 'ativo-55', 'ativo-56', 'ativo-57', 'ativo-58', 'ativo-59',
    ],
  },
}
