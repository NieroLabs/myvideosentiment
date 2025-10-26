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

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { requestId, status, results } = await req.json();

    console.log('Updating video request:', requestId, 'with status:', status);

    if (!requestId || !status) {
      console.error('Missing required fields: requestId or status');
      return new Response(
        JSON.stringify({ error: 'requestId and status are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update the video request with the results from n8n
    const { data, error } = await supabase
      .from('video_requests')
      .update({
        status: status,
        results: results || null
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) {
      console.error('Error updating video request:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to update video request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Video request updated successfully:', data.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        data: data
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in update-video-result function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
