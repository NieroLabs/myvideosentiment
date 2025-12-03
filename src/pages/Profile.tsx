import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const ProfilePage = () => {
  const { profile, loading, refreshProfile } = useProfile();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const addCredits = async () => {
    if (!profile) return;
    console.error("Peça créditos ao admin (Luiz Niero)");
    toast.error("Peça créditos ao admin (Luiz Niero)")
    /*
    try {
      // Mock API call to add credits
      const newCredits = profile.credits + 1000;

      const { error } = await supabase
        .from('profiles')
        .update({ credits: newCredits })
        .eq('id', profile.id);

      if (error) throw error;

      toast.success("1000 créditos adicionados com sucesso!");
      refreshProfile();
    } catch (error) {
      console.error("Error adding credits:", error);
      toast.error("Erro ao adicionar créditos");
    }
      */
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Meu Perfil</h1>
        <Button variant="outline" onClick={handleLogout} className="flex gap-2">
          <LogOut className="w-4 h-4" />
          Sair
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações da Conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Email</label>
            <p className="text-lg">{profile?.email}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Créditos Disponíveis</label>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-3xl font-bold text-primary">{profile?.credits}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Cada análise de vídeo custa 100 créditos.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;
