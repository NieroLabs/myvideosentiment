import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Video } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";

const VideoUrlForm = () => {
  const [videoUrl, setVideoUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useProfile();

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

    if (!profile) {
       // Allow submission even if not logged in? The requirement says "access to webapp... if not logged in, redirect to login".
       // So protected route handles this. But let's be safe.
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para processar vídeos.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Call N8N webhook with qtd_comentarios: 0 (Metadata only)
      const response = await fetch('https://negociaai.app.n8n.cloud/webhook-test/analisa-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: videoUrl,
          qtd_comentarios: 0
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const youtubeId = data["id_video_youtube"] || data["ID do vídeo no youtube"];

      if (!youtubeId) {
         throw new Error("N8N did not return a YouTube ID");
      }

      // Add to user history (Search history)
      const { error: historyError } = await supabase
        .from('user_history')
        .insert({
          user_id: profile.id,
          id_video_youtube: youtubeId
        });

      if (historyError) {
         console.error("Error adding to history:", historyError);
      }

      toast({
        title: "Vídeo processado!",
        description: "Direcionando para os detalhes...",
      });

      navigate(`/result/${youtubeId}`);

    } catch (error) {
      console.error("Error submitting video:", error);
      toast({
        title: "Erro ao processar",
        description: "Ocorreu um erro ao buscar o vídeo. Tente novamente.",
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
          <p className="text-muted-foreground text-sm">Cole a URL do vídeo abaixo para ver os detalhes</p>
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
              Buscando informações...
            </>
          ) : (
            "Buscar Vídeo"
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          A busca inicial é gratuita. A análise de sentimentos consumirá créditos.
        </p>
      </form>
    </Card>
  );
};

export default VideoUrlForm;
