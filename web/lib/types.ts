export type RefType = 'page' | 'selection' | 'image' | 'video' | 'note';

export type BriefingFormat = 'Feed' | 'Carrossel' | 'Reels' | 'Stories';

export type Briefing = {
  id: string;
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
  responsavel: { nome: string; foto?: string } | null;
  image: string | null;
  slides: unknown | null;
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
