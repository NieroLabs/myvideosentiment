import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { videoUrl } = await req.json();

    if (!videoUrl) {
      console.error('Video URL is required');
      return new Response(
        JSON.stringify({ error: 'Video URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing video request for:', videoUrl);

    // Create a new video request in the database
    const { data: videoRequest, error: insertError } = await supabase
      .from('video_requests')
      .insert({
        video_url: videoUrl,
        status: 'processing'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating video request:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create video request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Video request created with ID:', videoRequest.id);

    // Send the video URL to n8n webhook
    try {
      const n8nResponse = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: videoRequest.id,
          videoUrl: videoUrl,
          callbackUrl: `${supabaseUrl}/functions/v1/update-video-result`
        }),
      });

      console.log('n8n webhook response status:', n8nResponse.status);

      if (!n8nResponse.ok) {
        console.error('n8n webhook failed with status:', n8nResponse.status);
      }
    } catch (n8nError) {
      console.error('Error calling n8n webhook:', n8nError);
      // Continue anyway - the request is created
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        requestId: videoRequest.id 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in process-video function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
