import VideoUrlForm from "@/components/VideoUrlForm";

const Index = () => {
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

      <div className="mt-12 text-center text-sm text-muted-foreground">
        <p>Integrado com n8n para processamento avançado</p>
      </div>
    </div>
  );
};

export default Index;
