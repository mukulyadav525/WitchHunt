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

        const { permits, userId } = await req.json()

        const { data: config } = await supabase
            .from('ai_configurations')
            .select('*')
            .eq('config_key', 'excavation_optimizer')
            .single()

        if (!config) throw new Error('AI config not found')

        const params = config.parameters || {}
        const peakHours = params.peak_hours || ['08:00-10:00', '18:00-20:00']
        const preferredWindow = params.preferred_window || '22:00-06:00'

        const permitList = permits.map((p: any, i: number) =>
            `PERMIT ${p.id}:
  Organization: ${p.organization}
  Purpose: ${p.purpose}
  Road: ${p.road_name}
  Location: ${p.location_description || 'not specified'}
  Dates: ${p.requested_start_date} to ${p.requested_end_date}
  Depth: ${p.depth_m}m | Width: ${p.width_m || 'unknown'}m
  Urgency: ${p.urgency}`
        ).join('\n\n')

        const userPrompt = `${config.system_prompt}\n\nOptimize these ${permits.length} excavation permits. Bundle overlapping permits to minimize disruption.

CONSTRAINTS:
- Peak hours to avoid: ${peakHours.join(', ')}
- Preferred time window: ${preferredWindow}
- Bundling radius: ${params.bundling_radius_meters || 500}m

PERMITS:
${permitList}

Return ONLY valid JSON, no markdown fences:
{
  "analysis": {
    "total_permits": <number>,
    "bundleable_permits": <number>,
    "standalone_permits": <number>,
    "roads_affected": ["list"],
    "estimated_disruption_reduction_pct": <number>,
    "total_disruption_days_without_optimization": <number>,
    "total_disruption_days_with_optimization": <number>
  },
  "bundles": [
    {
      "bundle_id": "B001",
      "permits": ["permit_id_1", "permit_id_2"],
      "road": "road name",
      "reason_for_bundling": "explanation",
      "recommended_start": "YYYY-MM-DD",
      "recommended_end": "YYYY-MM-DD",
      "preferred_time_slot": "${preferredWindow}",
      "traffic_impact_score": <1-10>,
      "disruption_days": <number>,
      "coordination_lead_dept": "who coordinates",
      "warnings": ["any risks or issues"],
      "cost_savings_inr": <number>
    }
  ],
  "standalone_permits": [
    {
      "permit_id": "permit_id",
      "reason": "why not bundled",
      "recommended_slot": "YYYY-MM-DD",
      "preferred_time": "${preferredWindow}",
      "special_instructions": "any notes"
    }
  ],
  "total_cost_savings_inr": <number>,
  "coordination_notes": "overall scheduling advice",
  "priority_order": ["permit_ids in order of urgency"]
}`

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
                    contents: [{ parts: [{ text: userPrompt }] }],
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
        const optimization = JSON.parse(raw.replace(/```json|```/g, '').trim())

        // Save bundle records
        if (optimization.bundles?.length > 0) {
            for (const bundle of optimization.bundles) {
                const { data: bundleRecord } = await supabase.from('excavation_bundles').insert({
                    bundle_code: bundle.bundle_id,
                    road_name: bundle.road,
                    permit_count: bundle.permits.length,
                    recommended_start: bundle.recommended_start,
                    recommended_end: bundle.recommended_end,
                    preferred_time_slot: bundle.preferred_time_slot,
                    traffic_impact_score: bundle.traffic_impact_score,
                    disruption_days: bundle.disruption_days,
                    rationale: bundle.reason_for_bundling,
                    coordination_dept: bundle.coordination_lead_dept,
                    cost_savings_inr: bundle.cost_savings_inr,
                    ai_analysis: bundle
                }).select().single()

                // Link permits to bundle
                if (bundleRecord) {
                    await supabase.from('excavation_permits')
                        .update({ bundle_id: bundleRecord.id, status: 'bundled' })
                        .in('id', bundle.permits)
                }
            }
        }

        await supabase.from('ai_usage_logs').insert({
            module: 'excavation',
            config_key: 'excavation_optimizer',
            model_provider: 'google',
            model_name: modelName,
            input_tokens: data.usageMetadata?.promptTokenCount,
            output_tokens: data.usageMetadata?.candidatesTokenCount,
            latency_ms: latencyMs,
            success: true,
            created_by: userId
        })

        return new Response(JSON.stringify({ success: true, optimization, latency_ms: latencyMs }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
