import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Video } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';
import { supabase } from "@/integrations/supabase/client";

const VideoUrlForm = () => {
  const [videoUrl, setVideoUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!videoUrl.trim()) {
      toast({
        title: "URL necessária",
        description: "Por favor, insira a URL do vídeo",
        variant: "destructive",
      });
      return;
    }

    // Basic URL validation
    try {
      new URL(videoUrl);
    } catch {
      toast({
        title: "URL inválida",
        description: "Por favor, insira uma URL válida",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const generatedId = uuidv4();

      // Call N8N webhook
      const response = await fetch('https://negociaai.app.n8n.cloud/webhook-test/analisa-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: generatedId,
          url: videoUrl // Sending 'url' as well as the prompt requested "URL do vídeo"
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Save to Supabase
      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .insert({
          id_analise: generatedId,
          url: videoUrl,
          titulo_video: data["Título do vídeo"],
          visualizacoes: data["Visualizações"],
          curtidas: data["Curtidas"],
          comentarios: data["Comentários"],
          nome_canal: data["Nome do canal"],
          data_video: data["Data da postagem"],
          data_ultimo_comentario: data["Data do comentário mais recente"] ? new Date(data["Data do comentário mais recente"]).toISOString() : null,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (videoError) {
        console.error("Error saving video to Supabase:", videoError);
        // We don't block navigation here, but maybe we should warn?
        // Continuing to display results even if save fails.
      } else if (videoData && data["Top comentários"]) {
        const commentsToInsert = data["Top comentários"].map((comment: any) => ({
          id_video: videoData.id,
          nome_usuario: comment["usuário"],
          comentario: comment["conteúdo"],
          curtidas: comment["curtidas"],
          respostas: comment["respostas"]
        }));

        const { error: commentsError } = await supabase
          .from('comentarios')
          .insert(commentsToInsert);

        if (commentsError) {
          console.error("Error saving comments to Supabase:", commentsError);
        }
      }

      toast({
        title: "Análise concluída!",
        description: "Direcionando para os resultados...",
      });

      navigate(`/result/${generatedId}`, { state: { resultData: data, videoUrl: videoUrl } });

    } catch (error) {
      console.error("Error submitting video:", error);
      toast({
        title: "Erro ao processar",
        description: "Ocorreu um erro ao enviar sua requisição para o N8N. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="glass-card p-8 w-full max-w-2xl glow-effect">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
          <Video className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold gradient-text">Processar Vídeo</h2>
          <p className="text-muted-foreground text-sm">Cole a URL do vídeo abaixo</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="videoUrl" className="text-sm font-medium text-foreground">
            URL do Vídeo
          </label>
          <Input
            id="videoUrl"
            type="url"
            placeholder="https://exemplo.com/video.mp4"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            disabled={isSubmitting}
            className="h-12 bg-background/50 border-border/50 focus:border-primary transition-all"
          />
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 text-base font-semibold glow-effect"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            "Processar Vídeo"
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Ao processar, o vídeo será enviado para análise via n8n e os resultados aparecerão automaticamente
        </p>
      </form>
    </Card>
  );
};

export default VideoUrlForm;
