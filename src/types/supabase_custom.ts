export interface Video {
  id: number;
  created_at: string;
  id_analise: string;
  visualizacoes: number | null;
  curtidas: number | null;
  comentarios: number | null; // This is the count
  nome_canal: string | null;
  url: string | null;
  titulo_video: string | null;
  data_video: string | null;
  data_ultimo_comentario: string | null;
}

export interface Comentario {
  id: number;
  created_at: string;
  id_video: number;
  nome_usuario: string | null;
  comentario: string | null;
  curtidas: number | null;
  respostas: number | null;
  sentimento: string | null;
}
