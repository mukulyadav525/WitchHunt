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

        const { roadData, roadSegmentId, userId } = await req.json()

        // Load AI config
        const { data: config } = await supabase
            .from('ai_configurations')
            .select('*')
            .eq('config_key', 'road_health_prediction')
            .eq('is_active', true)
            .single()

        if (!config) throw new Error('AI config not found')

        // Fetch additional historical data if segment ID provided
        let historicalDefects = roadData.historical_defects || []
        if (roadSegmentId) {
            const { data: defects } = await supabase
                .from('defects')
                .select('defect_type, severity, created_at')
                .eq('road_segment_id', roadSegmentId)
                .order('created_at', { ascending: false })
                .limit(20)
            if (defects) historicalDefects = defects
        }

        const userPrompt = `${config.system_prompt}\n\nPredict road health and failure probability for this Indian road segment.

ROAD DATA:
- Name: ${roadData.road_name} (ID: ${roadData.road_id || 'unknown'})
- Surface: ${roadData.surface_type || 'bitumen'}
- Age: ${roadData.age_years || 'unknown'} years
- Last paved: ${roadData.last_paved_date || 'unknown'}
- Length: ${roadData.length_km || 'unknown'} km
- Daily traffic: ${roadData.avg_daily_traffic || 'unknown'} vehicles/day
- Heavy vehicle %: ${roadData.heavy_vehicle_pct || 'unknown'}%
- Rainfall last 30 days: ${roadData.rainfall_30d_mm || 0} mm
- Excavations last 12 months: ${roadData.excavations_12m || 0}
- Active defects: ${roadData.defect_count || 0}
- Current health score: ${roadData.current_health_score || 'unknown'}

RECENT DEFECTS (last 20):
${historicalDefects.map((d: any) => `- ${d.defect_type} severity ${d.severity} on ${d.created_at?.split('T')[0]}`).join('\n') || 'None recorded'}

Return ONLY valid JSON, no markdown fences:
{
  "health_score": <0-100>,
  "predicted_failure_date": "YYYY-MM-DD",
  "months_remaining": <number>,
  "risk_level": "low|medium|high|critical",
  "deterioration_rate": <score points lost per month, e.g. 2.5>,
  "risk_factors": [
    { "factor": "factor name", "impact": "high|medium|low", "description": "brief explanation", "score_impact": <number> }
  ],
  "recommendation": "primary recommended action",
  "maintenance_schedule": [
    { "action": "action type", "due_by": "YYYY-MM-DD", "estimated_cost_inr": <number>, "priority": "critical|high|medium|low" }
  ],
  "budget_estimate_inr": <total budget needed>,
  "intervention_roi": "brief ROI statement",
  "confidence": <0.0-1.0>,
  "data_quality": "good|fair|poor"
}`

        // Call Gemini API
        const modelName = config.model_name || 'gemini-2.0-flash'
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY')!
        const startTime = Date.now()

        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: userPrompt }] }],
                    generationConfig: {
                        temperature: config.temperature || 0.2,
                        maxOutputTokens: config.max_tokens || 2000,
                    }
                })
            }
        )

        const geminiData = await geminiResponse.json()
        const latencyMs = Date.now() - startTime

        if (!geminiResponse.ok) {
            throw new Error(`Gemini API error: ${geminiData.error?.message || JSON.stringify(geminiData.error)}`)
        }

        const rawText = geminiData.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || ''
        const prediction = JSON.parse(rawText.replace(/```json|```/g, '').trim())

        // Save prediction to database
        if (roadSegmentId) {
            await supabase.from('health_predictions').insert({
                road_segment_id: roadSegmentId,
                health_score: prediction.health_score,
                predicted_failure_date: prediction.predicted_failure_date,
                months_remaining: prediction.months_remaining,
                risk_level: prediction.risk_level,
                deterioration_rate: prediction.deterioration_rate,
                risk_factors: prediction.risk_factors,
                recommendation: prediction.recommendation,
                maintenance_schedule: prediction.maintenance_schedule,
                budget_estimate_inr: prediction.budget_estimate_inr,
                confidence: prediction.confidence,
                ai_provider: 'google',
                ai_model_version: modelName,
                raw_ai_response: prediction,
                created_by: userId
            })

            // Update road segment health score
            await supabase.from('road_segments')
                .update({
                    health_score: prediction.health_score,
                    last_health_update: new Date().toISOString()
                })
                .eq('id', roadSegmentId)
        }

        // Log usage
        await supabase.from('ai_usage_logs').insert({
            module: 'prediction',
            config_key: 'road_health_prediction',
            model_provider: 'google',
            model_name: modelName,
            input_tokens: geminiData.usageMetadata?.promptTokenCount,
            output_tokens: geminiData.usageMetadata?.candidatesTokenCount,
            latency_ms: latencyMs,
            success: true,
            created_by: userId
        })

        return new Response(JSON.stringify({ success: true, prediction, latency_ms: latencyMs }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
