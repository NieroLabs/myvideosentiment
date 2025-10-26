-- Create video_requests table
CREATE TABLE public.video_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing',
  results JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT status_check CHECK (status IN ('processing', 'completed', 'failed'))
);

-- Enable Row Level Security
ALTER TABLE public.video_requests ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (anyone can view with the ID)
CREATE POLICY "Anyone can view video requests"
ON public.video_requests
FOR SELECT
USING (true);

-- Create policy for public insert (anyone can create requests)
CREATE POLICY "Anyone can create video requests"
ON public.video_requests
FOR INSERT
WITH CHECK (true);

-- Create policy for webhook updates (system can update)
CREATE POLICY "Service role can update video requests"
ON public.video_requests
FOR UPDATE
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_video_requests_updated_at
BEFORE UPDATE ON public.video_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_video_requests_status ON public.video_requests(status);
CREATE INDEX idx_video_requests_created_at ON public.video_requests(created_at DESC);