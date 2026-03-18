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

        const { imageBase64, imageUrl, roadSegmentId, userId } = await req.json()

        // 1. Load AI config from database (admin-editable)
        const { data: config } = await supabase
            .from('ai_configurations')
            .select('*')
            .eq('config_key', 'pothole_detection')
            .eq('is_active', true)
            .single()

        if (!config) throw new Error('AI configuration not found. Please configure in Admin panel.')

        // 2. Build Gemini request parts
        const parts: any[] = []

        if (imageBase64) {
            parts.push({
                inlineData: { mimeType: 'image/jpeg', data: imageBase64 }
            })
        }

        parts.push({
            text: `${config.system_prompt}\n\nAnalyze this road image for defects. Return JSON with this exact structure:
{
  "overall_condition": "good|fair|poor|critical",
  "health_score": <number 0-100>,
  "defects": [
    {
      "type": "pothole|crack|water_logging|surface_damage|edge_break|patching_failure",
      "severity": <1-5>,
      "confidence": <0.0-1.0>,
      "description": "specific description",
      "location_in_image": "center|left|right|top|bottom",
      "area_sqm": <estimated area>,
      "depth_estimate": "shallow|medium|deep",
      "repair_priority": "immediate|within_week|within_month|monitor",
      "estimated_repair_cost_inr": <number>
    }
  ],
  "repair_estimate_days": <number>,
  "total_estimated_cost_inr": <number>,
  "safety_hazard": true/false,
  "requires_immediate_action": true/false,
  "notes": "brief notes for field engineer",
  "weather_condition_visible": "dry|wet|post_rain|unknown"
}

Return ONLY valid JSON, no markdown fences.`
        })

        // 3. Call Gemini API
        const modelName = config.model_name || 'gemini-2.0-flash'
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY')!
        const startTime = Date.now()

        const geminiResponse = await fetch(
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

        const geminiData = await geminiResponse.json()
        const latencyMs = Date.now() - startTime

        if (!geminiResponse.ok) {
            throw new Error(`Gemini API error: ${geminiData.error?.message || JSON.stringify(geminiData.error)}`)
        }

        const rawText = geminiData.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || ''
        const cleanJson = rawText.replace(/```json|```/g, '').trim()
        const analysis = JSON.parse(cleanJson)

        // 4. Log AI usage
        const inputTokens = geminiData.usageMetadata?.promptTokenCount
        const outputTokens = geminiData.usageMetadata?.candidatesTokenCount

        await supabase.from('ai_usage_logs').insert({
            module: 'pothole',
            config_key: 'pothole_detection',
            model_provider: 'google',
            model_name: modelName,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            latency_ms: latencyMs,
            success: true,
            created_by: userId
        })

        // 5. Save defects to database if road segment provided
        if (roadSegmentId && analysis.defects?.length > 0) {
            const defectsToInsert = analysis.defects.map((d: any) => ({
                road_segment_id: roadSegmentId,
                defect_type: d.type,
                severity: String(d.severity),
                confidence: d.confidence,
                source: 'ai_detection',
                description: d.description,
                area_sqm: d.area_sqm,
                repair_priority: d.repair_priority,
                estimated_cost_inr: d.estimated_repair_cost_inr,
                ai_analysis: d,
                reported_by: userId
            }))

            await supabase.from('defects').insert(defectsToInsert)

            // Update road health score
            await supabase.from('road_segments')
                .update({
                    health_score: analysis.health_score,
                    total_defects: analysis.defects.length,
                    last_health_update: new Date().toISOString()
                })
                .eq('id', roadSegmentId)
        }

        return new Response(JSON.stringify({
            success: true,
            analysis,
            config_version: config.version,
            latency_ms: latencyMs
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
