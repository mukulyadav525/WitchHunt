// Direct Gemini API calls (for admin testing/preview)
// In production, most heavy calls go through Supabase Edge Functions

export interface AICallOptions {
    systemPrompt: string
    userMessage: string
    imageBase64?: string
    model?: string
    maxTokens?: number
    temperature?: number
    apiKey?: string
}

export async function callGeminiDirect(options: AICallOptions) {
    const {
        systemPrompt,
        userMessage,
        imageBase64,
        model = 'gemini-2.0-flash',
        maxTokens = 1500,
        temperature = 0.3,
        apiKey
    } = options

    if (!apiKey) throw new Error('Gemini API key is required. Set it in Admin → AI Config.')

    const parts: any[] = []

    if (imageBase64) {
        parts.push({
            inlineData: { mimeType: 'image/jpeg', data: imageBase64 }
        })
    }

    parts.push({ text: `${systemPrompt}\n\n${userMessage}` })

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts }],
                generationConfig: {
                    temperature,
                    maxOutputTokens: maxTokens,
                }
            })
        }
    )

    const data = await response.json()
    if (!response.ok) throw new Error(data.error?.message || 'AI call failed')

    const raw = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || ''
    const cleaned = raw.replace(/```json|```/g, '').trim()
    return JSON.parse(cleaned)
}
