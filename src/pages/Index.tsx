import VideoUrlForm from "@/components/VideoUrlForm";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Video, User, Coins } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/useProfile";

interface VideoHistory {
  id: number;
  id_video_youtube: string;
  created_at: string;
  videos: {
    titulo_video: string | null;
    url: string | null;
  }
}

const Index = () => {
  const [history, setHistory] = useState<VideoHistory[]>([]);
  const { profile } = useProfile();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch user history joined with videos table
        const { data, error } = await supabase
          .from('user_history')
          .select(`
            id,
            id_video_youtube,
            created_at,
            videos (
              titulo_video,
              url
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;

        // Transform data to match interface if necessary (Supabase types might need assertion)
        setHistory(data as unknown as VideoHistory[] || []);
      } catch (error) {
        console.error("Error fetching history:", error);
      }
    };

    fetchHistory();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center p-4">
      <div className="w-full max-w-4xl flex justify-between items-center mb-12 mt-4">
        <div className="flex items-center gap-4">
           {profile && (
            <div className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-full">
              <Coins className="w-4 h-4 text-yellow-500" />
              <span className="font-semibold">{profile.credits} créditos</span>
            </div>
           )}
        </div>
        <Link to="/profile">
          <Button variant="outline" className="flex gap-2">
            <User className="w-4 h-4" />
            Minha Conta
          </Button>
        </Link>
      </div>

      <div className="text-center mb-12 animate-fade-in mt-12">
        <h1 className="text-5xl md:text-6xl font-bold mb-4 gradient-text">
          Processador de Vídeo
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Envie a URL do seu vídeo e receba análises detalhadas automaticamente.
          <br />
          <span className="text-sm">Custo por análise: 100 créditos</span>
        </p>
      </div>

      <VideoUrlForm />

      {history.length > 0 && (
        <div className="w-full max-w-2xl mt-12 animate-fade-in">
          <h3 className="text-xl font-semibold mb-4 text-center">Meu Histórico Recente</h3>
          <div className="grid gap-4">
            {history.map((item) => (
              <Link key={item.id} to={`/result/${item.id_video_youtube}`}>
                <Card className="p-4 hover:bg-accent/5 transition-colors flex items-center gap-4 cursor-pointer border-primary/20">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Video className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{item.videos?.titulo_video || "Vídeo sem título"}</h4>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString()} - {item.videos?.url}
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
