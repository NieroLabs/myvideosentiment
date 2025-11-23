import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, ArrowLeft, ThumbsUp, MessageSquare, TrendingUp, User, Calendar, Clock } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { supabase } from "@/integrations/supabase/client";

interface N8NResult {
  "Título do vídeo": string;
  "Curtidas": number;
  "Comentários": number;
  "Visualizações": number;
  "Nome do canal": string;
  "Data da postagem": string;
  "Duração": string;
  "Data do comentário mais recente": string;
  "Top comentários": Array<{
    "usuário": string;
    "conteúdo": string;
    "curtidas": number;
    "respostas": number;
    "sentimento"?: string;
  }>;
  "sentimento"?: {
    "positivo": number;
    "neutro": number;
    "negativo": number;
  };
}

const Result = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resultData, setResultData] = useState<N8NResult | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [sentimentData, setSentimentData] = useState([
    { name: 'Positivo', value: 0, color: '#22c55e' },
    { name: 'Neutro', value: 0, color: '#94a3b8' },
    { name: 'Negativo', value: 0, color: '#ef4444' },
  ]);

  const mapSentimentCategory = (category: string): string => {
    if (['apoio_operacao', 'apoio_condicional', 'positivo'].includes(category.toLowerCase())) return 'Positivo';
    if (['contra_operacao', 'negativo'].includes(category.toLowerCase())) return 'Negativo';
    return 'Neutro';
  };

  const updateSentimentChart = (counts: { positivo: number, neutro: number, negativo: number }) => {
    setSentimentData([
      { name: 'Positivo', value: counts.positivo, color: '#22c55e' },
      { name: 'Neutro', value: counts.neutro, color: '#94a3b8' },
      { name: 'Negativo', value: counts.negativo, color: '#ef4444' },
    ]);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (location.state && location.state.resultData) {
        const data = location.state.resultData as N8NResult;
        setResultData(data);
        setVideoUrl(location.state.videoUrl);

        if (data.sentimento) {
          updateSentimentChart(data.sentimento);
        } else {
          // Fallback if n8n doesn't send aggregated sentiment but sends comments with sentiment
          // Or just leave it empty/zeros
        }
        setLoading(false);
      } else if (id) {
        try {
          // Fetch from Supabase
          const { data: videoData, error: videoError } = await supabase
            .from('videos')
            .select('*')
            .eq('id_video_youtube', id)
            .single();

          if (videoError) throw videoError;

          if (videoData) {
            setVideoUrl(videoData.url);

            const { data: commentsData, error: commentsError } = await supabase
              .from('comentarios')
              .select('*')
              .eq('id_video_youtube', videoData.id_video_youtube);

            if (commentsError) throw commentsError;

            // Calculate sentiment from comments
            const sentimentCounts = { positivo: 0, neutro: 0, negativo: 0 };
            commentsData?.forEach(comment => {
              const sentiment = mapSentimentCategory(comment.sentimento || '');
              if (sentiment === 'Positivo') sentimentCounts.positivo++;
              else if (sentiment === 'Negativo') sentimentCounts.negativo++;
              else sentimentCounts.neutro++;
            });

            updateSentimentChart(sentimentCounts);

            // Map Supabase data to N8NResult structure
            const mappedData: N8NResult = {
              "Título do vídeo": videoData.titulo_video || "",
              "Curtidas": videoData.curtidas || 0,
              "Comentários": videoData.comentarios || 0,
              "Visualizações": videoData.visualizacoes || 0,
              "Nome do canal": videoData.nome_canal || "",
              "Data da postagem": videoData.data_video || "",
              "Duração": "-", // Duration is not stored in DB schema provided
              "Data do comentário mais recente": videoData.data_ultimo_comentario || "",
              "Top comentários": commentsData?.map(comment => ({
                "usuário": comment.nome_usuario || "",
                "conteúdo": comment.comentario || "",
                "curtidas": comment.curtidas || 0,
                "respostas": comment.respostas || 0,
                "sentimento": comment.sentimento || undefined
              })) || []
            };

            setResultData(mappedData);
          } else {
            setError("Análise não encontrada.");
          }
        } catch (err) {
          console.error("Error fetching from Supabase:", err);
          setError("Erro ao carregar análise do histórico.");
        } finally {
          setLoading(false);
        }
      } else {
        setError("Dados não encontrados. Por favor, inicie o processo novamente.");
        setLoading(false);
      }
    };

    fetchData();
  }, [location.state, id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="glass-card p-12 text-center max-w-md w-full">
          <Loader2 className="w-16 h-16 mx-auto mb-6 text-primary animate-spin" />
          <h2 className="text-2xl font-bold mb-2">Carregando...</h2>
          <p className="text-muted-foreground">Processando análise</p>
        </Card>
      </div>
    );
  }

  if (error || !resultData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="glass-card p-12 text-center max-w-md w-full">
          <AlertCircle className="w-16 h-16 mx-auto mb-6 text-destructive" />
          <h2 className="text-2xl font-bold mb-2">Erro</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => navigate("/")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao início
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <Button 
          onClick={() => navigate("/")} 
          variant="ghost" 
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <Card className="glass-card p-8 mb-8">
          <div className="flex flex-col md:flex-row items-start justify-between mb-6 gap-4">
            <div>
              <h1 className="text-3xl font-bold gradient-text mb-2">
                {resultData["Título do vídeo"]}
              </h1>
              <p className="text-muted-foreground">ID da Análise: {id}</p>

              <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                {resultData["Nome do canal"] && (
                  <span className="flex items-center gap-1.5 bg-secondary/50 px-3 py-1 rounded-full">
                    <User className="w-4 h-4" /> {resultData["Nome do canal"]}
                  </span>
                )}
                {resultData["Data da postagem"] && (
                  <span className="flex items-center gap-1.5 bg-secondary/50 px-3 py-1 rounded-full">
                    <Calendar className="w-4 h-4" /> {resultData["Data da postagem"]}
                  </span>
                )}
                {resultData["Duração"] && (
                  <span className="flex items-center gap-1.5 bg-secondary/50 px-3 py-1 rounded-full">
                    <Clock className="w-4 h-4" /> {resultData["Duração"]}
                  </span>
                )}
              </div>

              {videoUrl && (
                <p className="text-sm text-muted-foreground mt-3 break-all">
                  URL: {videoUrl}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="p-6 flex items-center gap-4 bg-card/50">
              <div className="p-3 rounded-full bg-primary/10">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Visualizações</p>
                <p className="text-2xl font-bold">{resultData.Visualizações?.toLocaleString() || '-'}</p>
              </div>
            </Card>

            <Card className="p-6 flex items-center gap-4 bg-card/50">
              <div className="p-3 rounded-full bg-primary/10">
                <ThumbsUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Curtidas</p>
                <p className="text-2xl font-bold">{resultData.Curtidas?.toLocaleString() || '-'}</p>
              </div>
            </Card>

            <Card className="p-6 flex items-center gap-4 bg-card/50">
              <div className="p-3 rounded-full bg-primary/10">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Comentários</p>
                <p className="text-2xl font-bold">{resultData.Comentários?.toLocaleString() || '-'}</p>
                {resultData["Data do comentário mais recente"] && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Último: {resultData["Data do comentário mais recente"]}
                  </p>
                )}
              </div>
            </Card>

            <Card className="p-6 flex items-center gap-4 bg-card/50">
              <div className="p-3 rounded-full bg-primary/10">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Engajamento</p>
                <p className="text-2xl font-bold">
                  {resultData.Visualizações
                    ? (Math.round(((resultData.Curtidas + resultData.Comentários) / resultData.Visualizações) * 100 * 10) / 10) + '%'
                    : '-'}
                </p>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Sentiment Analysis Chart */}
            <Card className="p-6 bg-card/50">
              <h3 className="text-xl font-bold mb-6">Análise de Sentimentos</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentimentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {sentimentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Top Comments */}
            <Card className="p-6 bg-card/50">
              <h3 className="text-xl font-bold mb-6">Principais Comentários</h3>
              <div className="space-y-4">
                {resultData["Top comentários"] && resultData["Top comentários"].map((comment, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg bg-background/50 border border-border/50"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                        {comment["usuário"].substring(0, 2).toUpperCase()}
                      </div>
                      <span className="font-semibold text-sm">{comment["usuário"]}</span>
                    </div>
                    <p className="text-sm text-muted-foreground pl-10 mb-3">
                      "{comment["conteúdo"]}"
                    </p>
                    <div className="flex items-center gap-4 pl-10 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" />
                        {comment["curtidas"] || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {comment["respostas"] || 0}
                      </span>
                      {comment.sentimento && (
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${
                          mapSentimentCategory(comment.sentimento) === 'Positivo' ? 'bg-green-500/20 text-green-600' :
                          mapSentimentCategory(comment.sentimento) === 'Negativo' ? 'bg-red-500/20 text-red-600' :
                          'bg-gray-500/20 text-gray-600'
                        }`}>
                          {mapSentimentCategory(comment.sentimento)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Result;
