import VideoUrlForm from "@/components/VideoUrlForm";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Video } from "lucide-react";
import { Link } from "react-router-dom";

interface VideoHistory {
  id: number;
  id_analise: string;
  titulo_video: string | null;
  created_at: string;
  url: string | null;
}

const Index = () => {
  const [history, setHistory] = useState<VideoHistory[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data, error } = await supabase
          .from('videos')
          .select('id, id_analise, titulo_video, created_at, url')
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;
        setHistory(data || []);
      } catch (error) {
        console.error("Error fetching history:", error);
      }
    };

    fetchHistory();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center mb-12 animate-fade-in">
        <h1 className="text-5xl md:text-6xl font-bold mb-4 gradient-text">
          Processador de Vídeo
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Envie a URL do seu vídeo e receba análises detalhadas automaticamente
        </p>
      </div>

      <VideoUrlForm />

      {history.length > 0 && (
        <div className="w-full max-w-2xl mt-12 animate-fade-in">
          <h3 className="text-xl font-semibold mb-4 text-center">Histórico Recente</h3>
          <div className="grid gap-4">
            {history.map((item) => (
              <Link key={item.id} to={`/result/${item.id_analise}`}>
                <Card className="p-4 hover:bg-accent/5 transition-colors flex items-center gap-4 cursor-pointer border-primary/20">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Video className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{item.titulo_video || "Vídeo sem título"}</h4>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString()} - {item.url}
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-12 text-center text-sm text-muted-foreground">
        <p>Integrado com n8n para processamento avançado</p>
      </div>
    </div>
  );
};

export default Index;
