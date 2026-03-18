import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const { systemPrompt, testInput, model, temperature, maxTokens } = await req.json()

        const modelName = model || 'gemini-2.0-flash'
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY')!
        const startTime = Date.now()

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `${systemPrompt}\n\n${testInput || 'Run a self-test and confirm you are operational.'}` }] }],
                    generationConfig: {
                        temperature: temperature || 0.3,
                        maxOutputTokens: maxTokens || 1000,
                    }
                })
            }
        )

        const data = await response.json()
        const latencyMs = Date.now() - startTime

        if (!response.ok) {
            throw new Error(`Gemini API error: ${data.error?.message || JSON.stringify(data.error)}`)
        }

        const output = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || ''

        return new Response(JSON.stringify({
            success: true,
            output,
            model: modelName,
            latency_ms: latencyMs,
            input_tokens: data.usageMetadata?.promptTokenCount,
            output_tokens: data.usageMetadata?.candidatesTokenCount,
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
