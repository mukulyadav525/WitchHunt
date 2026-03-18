import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        const { complaintText, photoBase64, complaintId, userId } = await req.json()

        const { data: config } = await supabase
            .from('ai_configurations')
            .select('*')
            .eq('config_key', 'complaint_prioritization')
            .single()

        if (!config) throw new Error('AI config not found')

        // Build Gemini request parts
        const parts: any[] = []

        if (photoBase64) {
            parts.push({
                inlineData: { mimeType: 'image/jpeg', data: photoBase64 }
            })
        }

        parts.push({
            text: `${config.system_prompt}\n\nAnalyze this citizen road complaint and return prioritization data.

COMPLAINT TEXT: "${complaintText}"
${photoBase64 ? '\nPhoto has been attached — analyze it as additional evidence.' : ''}

Return ONLY valid JSON, no markdown fences:
{
  "urgency_score": <1-5>,
  "urgency_label": "Emergency|Critical|Moderate|Minor|Suggestion",
  "defect_type": "pothole|crack|flooding|surface_damage|signage|other",
  "detected_language": "hi|en|mr|mixed",
  "sentiment": "angry|frustrated|worried|neutral|positive",
  "sentiment_score": <0.0-1.0>,
  "routing_department": "Roads/PWD|Drainage|Utilities|Traffic|Emergency",
  "response_time_hours": <target response hours>,
  "population_impact": <estimated number of people affected>,
  "location_hint": "extracted location if mentioned, else null",
  "keywords": ["extracted", "keywords"],
  "complaint_summary_english": "1-2 sentence summary in English",
  "ai_recommendation": "what field team should do",
  "escalate_immediately": true/false,
  "confidence": <0.0-1.0>,
  "related_defect_types": ["likely defect types from description"]
}`
        })

        // Call Gemini API
        const modelName = config.model_name || 'gemini-2.0-flash'
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY')!
        const startTime = Date.now()

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts }],
                    generationConfig: {
                        temperature: config.temperature || 0.2,
                        maxOutputTokens: config.max_tokens || 2000,
                    }
                })
            }
        )

        const data = await response.json()
        const latencyMs = Date.now() - startTime

        if (!response.ok) {
            throw new Error(`Gemini API error: ${data.error?.message || JSON.stringify(data.error)}`)
        }

        const raw = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || ''
        const analysis = JSON.parse(raw.replace(/```json|```/g, '').trim())

        // Update complaint record in DB
        if (complaintId) {
            await supabase.from('complaints').update({
                urgency_score: analysis.urgency_score,
                defect_type: analysis.defect_type,
                sentiment: analysis.sentiment,
                keywords: analysis.keywords,
                response_time_hours: analysis.response_time_hours,
                population_impact: analysis.population_impact,
                ai_analysis: analysis,
                ai_provider: 'google',
                confidence: analysis.confidence,
                status: analysis.escalate_immediately ? 'acknowledged' : 'open'
            }).eq('id', complaintId)
        }

        await supabase.from('ai_usage_logs').insert({
            module: 'complaint',
            config_key: 'complaint_prioritization',
            model_provider: 'google',
            model_name: modelName,
            input_tokens: data.usageMetadata?.promptTokenCount,
            output_tokens: data.usageMetadata?.candidatesTokenCount,
            latency_ms: latencyMs,
            success: true,
            created_by: userId
        })

        return new Response(JSON.stringify({ success: true, analysis, latency_ms: latencyMs }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
