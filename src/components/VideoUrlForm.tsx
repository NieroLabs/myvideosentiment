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
  const { profile, refreshProfile } = useProfile();

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
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para processar vídeos.",
        variant: "destructive",
      });
      return;
    }

    if (profile.credits < 100) {
      toast({
        title: "Créditos insuficientes",
        description: "Você precisa de pelo menos 100 créditos para realizar uma análise.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Call N8N webhook
      const response = await fetch('https://negociaai.app.n8n.cloud/webhook-test/analisa-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: videoUrl
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const youtubeId = data["id_video_youtube"]; // Changed to match memory "id_video_youtube" which is the expected key

      if (!youtubeId) {
        // Fallback or error if N8N response format changes. The original code used "ID do vídeo no youtube" but memory says "id_video_youtube"
         // I'll check both just in case, but rely on memory as primary.
         const altId = data["ID do vídeo no youtube"];
         if (!altId) throw new Error("N8N did not return a YouTube ID");
      }

      const finalId = youtubeId || data["ID do vídeo no youtube"];

      // 2. Deduct credits
      const { error: creditError } = await supabase
        .from('profiles')
        .update({ credits: profile.credits - 100 })
        .eq('id', profile.id);

      if (creditError) {
        console.error("Error deducting credits:", creditError);
        // We continue even if credit deduction fails for now, or we could rollback.
        // Ideally this should be a transaction on the server side (Postgres function).
        toast({
          title: "Aviso",
          description: "Erro ao descontar créditos, mas a análise foi concluída.",
          variant: "destructive"
        });
      } else {
        refreshProfile();
      }

      // 3. Add to user history
      const { error: historyError } = await supabase
        .from('user_history')
        .insert({
          user_id: profile.id,
          id_video_youtube: finalId
        });

      if (historyError) {
         console.error("Error adding to history:", historyError);
      }

      toast({
        title: "Análise concluída!",
        description: "Direcionando para os resultados...",
      });

      navigate(`/result/${finalId}`);

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
            "Processar Vídeo (100 créditos)"
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
