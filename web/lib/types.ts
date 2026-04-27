export type RefType = 'page' | 'selection' | 'image' | 'video' | 'note';

export type BriefingFormat = 'Feed' | 'Carrossel' | 'Reels' | 'Stories';

export type Client = {
  id: string;
  name: string;
  created_at: string;
};

export type Briefing = {
  id: string;
  client_id: string | null;
  nome_demanda: string;
  canal: string | null;
  etapa_funil: string | null;
  format: BriefingFormat | null;
  accent_color: string | null;
  conceito: string | null;
  data_publicacao: string | null;
  referencia_arte: string | null;
  descricao_peca: string | null;
  legenda: string | null;
  hashtags: string[];
  responsavel: { nome: string; foto: string | null } | null;
  image: string | null;
  slides: unknown | null;
  reels_visual: string | null;
  reels_tela: string | null;
  reels_fala: string | null;
  reels_audio: string | null;
  sort_order: number | null;
  updated_at: string;
  created_at: string;
};

export type Ref = {
  id: string;
  collection_id: string | null;
  url: string | null;
  title: string | null;
  content: string | null;
  type: RefType;
  tags: string[];
  notes: string | null;
  media_path: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type Collection = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type RefWithCollection = Ref & {
  collections: { name: string } | null;
};

// Editor de imagem — layers
type BaseLayer = {
  id: string;
  name: string;
  x: number;
  y: number;
  angle: number;
  visible: boolean;
  locked?: boolean;
};

export type RectLayer = BaseLayer & {
  type: 'rect';
  w: number;
  h: number;
  fill: string;
  rx: number;
};

export type TextLayer = BaseLayer & {
  type: 'text';
  text: string;
  fill: string;
  fontSize: number;
  fontWeight: number;
  anchor: 'start' | 'middle' | 'end';
  letterSpacing: number;
};

export type ImageLayer = BaseLayer & {
  type: 'image';
  w: number;
  h: number;
  src: string;
  scale?: number;
};

export type EditorLayer = RectLayer | TextLayer | ImageLayer;

// Prompts
export type Prompt = {
  id: string;
  title: string;
  content: string;
  category: string | null;
  description: string | null;
  image_url: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
};
