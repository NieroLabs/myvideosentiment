import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";

interface VideoRequest {
  id: string;
  video_url: string;
  status: string;
  results: {
    images?: string[];
    texts?: string[];
    title?: string;
    description?: string;
  } | null;
  created_at: string;
}

const Result = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<VideoRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchRequest = async () => {
      try {
        const { data, error } = await supabase
          .from("video_requests")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (error) throw error;
        
        if (!data) {
          setError("Requisição não encontrada");
          setLoading(false);
          return;
        }

        setRequest(data as unknown as VideoRequest);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching request:", err);
        setError("Erro ao carregar dados");
        setLoading(false);
      }
    };

    fetchRequest();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('video-request-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'video_requests',
          filter: `id=eq.${id}`
        },
        (payload) => {
          console.log('Received update:', payload);
          setRequest(payload.new as unknown as VideoRequest);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="glass-card p-12 text-center max-w-md w-full">
          <Loader2 className="w-16 h-16 mx-auto mb-6 text-primary animate-spin" />
          <h2 className="text-2xl font-bold mb-2">Carregando...</h2>
          <p className="text-muted-foreground">Buscando informações da requisição</p>
        </Card>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="glass-card p-12 text-center max-w-md w-full">
          <AlertCircle className="w-16 h-16 mx-auto mb-6 text-destructive" />
          <h2 className="text-2xl font-bold mb-2">Erro</h2>
          <p className="text-muted-foreground mb-6">{error || "Requisição não encontrada"}</p>
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
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold gradient-text mb-2">
                Resultado do Processamento
              </h1>
              <p className="text-muted-foreground">ID: {request.id}</p>
            </div>
            <div className="flex items-center gap-2">
              {request.status === "processing" && (
                <>
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  <span className="text-primary font-medium">Processando...</span>
                </>
              )}
              {request.status === "completed" && (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-green-500 font-medium">Concluído</span>
                </>
              )}
              {request.status === "failed" && (
                <>
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  <span className="text-destructive font-medium">Falhou</span>
                </>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">URL do Vídeo</h3>
              <p className="text-foreground break-all">{request.video_url}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Enviado em</h3>
              <p className="text-foreground">
                {new Date(request.created_at).toLocaleString("pt-BR")}
              </p>
            </div>
          </div>
        </Card>

        {request.status === "processing" && (
          <Card className="glass-card p-12 text-center">
            <Loader2 className="w-16 h-16 mx-auto mb-6 text-primary animate-spin" />
            <h2 className="text-2xl font-bold mb-2">Processamento em andamento</h2>
            <p className="text-muted-foreground">
              Estamos processando seu vídeo. Esta página será atualizada automaticamente quando o processo for concluído.
            </p>
          </Card>
        )}

        {request.status === "completed" && request.results && (
          <div className="space-y-8 animate-fade-in">
            {request.results.title && (
              <Card className="glass-card p-8">
                <h2 className="text-2xl font-bold gradient-text mb-4">
                  {request.results.title}
                </h2>
                {request.results.description && (
                  <p className="text-foreground leading-relaxed">
                    {request.results.description}
                  </p>
                )}
              </Card>
            )}

            {request.results.images && request.results.images.length > 0 && (
              <Card className="glass-card p-8">
                <h3 className="text-xl font-bold mb-6">Imagens</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {request.results.images.map((image, index) => (
                    <div 
                      key={index} 
                      className="relative group overflow-hidden rounded-lg border border-border/50 hover:border-primary/50 transition-all duration-300"
                    >
                      <img
                        src={image}
                        alt={`Resultado ${index + 1}`}
                        className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {request.results.texts && request.results.texts.length > 0 && (
              <Card className="glass-card p-8">
                <h3 className="text-xl font-bold mb-6">Textos Extraídos</h3>
                <div className="space-y-4">
                  {request.results.texts.map((text, index) => (
                    <div 
                      key={index} 
                      className="p-4 rounded-lg bg-muted/30 border border-border/30"
                    >
                      <p className="text-foreground leading-relaxed">{text}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {request.status === "failed" && (
          <Card className="glass-card p-12 text-center border-destructive/50">
            <AlertCircle className="w-16 h-16 mx-auto mb-6 text-destructive" />
            <h2 className="text-2xl font-bold mb-2">Processamento Falhou</h2>
            <p className="text-muted-foreground mb-6">
              Ocorreu um erro ao processar seu vídeo. Por favor, tente novamente.
            </p>
            <Button onClick={() => navigate("/")}>
              Tentar Novamente
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Result;
