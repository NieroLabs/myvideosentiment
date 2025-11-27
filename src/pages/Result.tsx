import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, ArrowLeft, ThumbsUp, MessageSquare, TrendingUp, User, Calendar, Clock, BarChart2, Coins } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { Slider } from "@/components/ui/slider";

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
  const { toast } = useToast();
  const { profile, refreshProfile } = useProfile();

  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultData, setResultData] = useState<N8NResult | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [sentimentData, setSentimentData] = useState([
    { name: 'Positivo', value: 0, color: '#22c55e' },
    { name: 'Neutro', value: 0, color: '#94a3b8' },
    { name: 'Negativo', value: 0, color: '#ef4444' },
  ]);

  // Analysis Limit State
  const [analysisLimit, setAnalysisLimit] = useState<number>(10);
  const [maxComments, setMaxComments] = useState<number>(100);

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

  const fetchData = useCallback(async () => {
    if (id) {
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
          // Set max comments for slider, ensuring at least 1
          setMaxComments(videoData.comentarios || 100);
          if (analysisLimit > (videoData.comentarios || 100)) {
            setAnalysisLimit(videoData.comentarios || 100);
          }

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
            "Duração": "-",
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
          setError("Vídeo não encontrado.");
        }
      } catch (err) {
        console.error("Error fetching from Supabase:", err);
        setError("Erro ao carregar dados do vídeo.");
      } finally {
        setLoading(false);
      }
    } else {
      setError("Dados não encontrados.");
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAnalyzeSentiment = async () => {
    if (!id || !profile || !videoUrl) return;

    if (profile.credits < analysisLimit) {
      toast({
        title: "Créditos insuficientes",
        description: `Você precisa de ${analysisLimit} créditos para analisar ${analysisLimit} comentários.`,
        variant: "destructive",
      });
      return;
    }

    setAnalyzing(true);
    try {
      // 1. Deduct credits
      const { error: creditError } = await supabase
        .from('profiles')
        .update({ credits: profile.credits - analysisLimit })
        .eq('id', profile.id);

      if (creditError) throw creditError;

      refreshProfile();

      // 2. Call N8N webhook
      await fetch('https://negociaai.app.n8n.cloud/webhook-test/processa-comentarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: videoUrl,
          qtd_comentarios: analysisLimit,
          video_id: id
        })
      });

      toast({
        title: "Análise iniciada",
        description: "Os dados estão sendo processados. A página atualizará em breve.",
      });

      // Wait a bit and refresh (or polling strategy could be better)
      setTimeout(() => {
        fetchData();
      }, 3000);

    } catch (error) {
      console.error("Error analyzing sentiment:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao processar a análise.",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const hasComments = resultData && resultData["Top comentários"].length > 0;
  // If we have comments and they have sentiment, we consider it analyzed.
  // BUT the user might want to re-analyze or analyze MORE.
  // For simplicity, we show the analysis block if there are NO sentiments yet,
  // OR we can always allow it? The prompt implies "Antes de clicar... pode escolher".
  // Let's assume we allow analysis always, or at least if current analysis is empty.

  // We'll show the analysis UI if there are NO analyzed comments yet.
  const hasSentiment = resultData && resultData["Top comentários"].some(c => c.sentimento && c.sentimento.trim() !== '');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="glass-card p-12 text-center max-w-md w-full">
          <Loader2 className="w-16 h-16 mx-auto mb-6 text-primary animate-spin" />
          <h2 className="text-2xl font-bold mb-2">Carregando...</h2>
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
                <div className="flex items-center gap-2">
                   <Coins className="w-4 h-4 text-yellow-500" />
                   <span className="font-semibold text-foreground">Seus créditos: {profile?.credits}</span>
                </div>
              </div>
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
                <p className="text-sm text-muted-foreground">Comentários Totais</p>
                <p className="text-2xl font-bold">{resultData.Comentários?.toLocaleString() || '-'}</p>
              </div>
            </Card>

             <Card className="p-6 flex items-center gap-4 bg-card/50">
              <div className="p-3 rounded-full bg-primary/10">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Analisados</p>
                <p className="text-2xl font-bold">
                  {resultData["Top comentários"]?.length || 0}
                </p>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Sentiment Analysis Chart */}
            <Card className="p-6 bg-card/50 flex flex-col items-center justify-center min-h-[350px]">
              <h3 className="text-xl font-bold mb-6 w-full text-left">Análise de Sentimentos</h3>

              {!hasSentiment ? (
                <div className="flex flex-col items-center gap-6 w-full max-w-sm">
                  <div className="text-center space-y-2">
                    <BarChart2 className="w-16 h-16 text-muted-foreground/50 mx-auto" />
                    <p className="text-muted-foreground">
                      Analise os comentários para ver o sentimento da audiência.
                    </p>
                  </div>

                  <div className="w-full space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Quantidade de comentários</span>
                        <span className="font-bold">{analysisLimit}</span>
                      </div>
                      <Slider
                        value={[analysisLimit]}
                        onValueChange={(vals) => setAnalysisLimit(vals[0])}
                        max={maxComments}
                        min={1}
                        step={1}
                        className="py-4"
                      />
                      <p className="text-xs text-muted-foreground text-right">
                        Custo estimado: <span className="text-yellow-500 font-bold">{analysisLimit} créditos</span>
                      </p>
                    </div>

                    <Button
                      onClick={handleAnalyzeSentiment}
                      disabled={analyzing || (profile?.credits || 0) < analysisLimit}
                      className="w-full"
                    >
                      {analyzing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        `Analisar Sentimento (-${analysisLimit} créditos)`
                      )}
                    </Button>
                    {(profile?.credits || 0) < analysisLimit && (
                        <p className="text-xs text-destructive text-center">
                            Você não tem créditos suficientes.
                        </p>
                    )}
                  </div>
                </div>
              ) : (
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
              )}
            </Card>

            {/* Top Comments */}
            <Card className="p-6 bg-card/50 flex flex-col max-h-[500px]">
              <h3 className="text-xl font-bold mb-6">Comentários Analisados</h3>
              {resultData["Top comentários"] && resultData["Top comentários"].length > 0 ? (
                <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                  {resultData["Top comentários"].map((comment, index) => (
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
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
                    <p>Nenhum comentário analisado ainda.</p>
                </div>
              )}
            </Card>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Result;
