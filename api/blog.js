export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { topic } = req.body;

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: 'GEMINI_API_KEY is not set' });
        }

        const prompt = `You are a fashion journalist for Abrino Wears, a Nigerian fashion brand.
Write 5 unique engaging blog article summaries about: "${topic}".
Each article must cover REAL Nigerian fashion trends, designers, or fabrics (Ankara, Aso-Oke, Adire, Agbada, Isiagu, George) from recent events.
Return ONLY a valid JSON array with exactly 5 objects. No markdown, no preamble, just raw JSON.
Each object must have exactly these keys:
"title" (catchy headline max 12 words),
"category" (one of: Native Wear, Ankara, Aso-Oke, Contemporary, Bridal, Street Style, Designer Spotlight, Trend Report),
"excerpt" (2-sentence teaser 40-55 words),
"body" (HTML with 3-4 <p> paragraphs and 1-2 <h2> subheadings, 300-350 words, reference real Nigerian fashion details),
"readTime" (e.g. "4 min read"),
"date" (recent date e.g. "June 2025").`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.8,
                        maxOutputTokens: 4000
                    }
                })
            }
        );

        const data = await response.json();

        // Return full Gemini response if something went wrong
        if (!response.ok) {
            return res.status(500).json({ error: 'Gemini API error', geminiResponse: data });
        }

        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

        const clean = text.replace(/```json|```/g, '').trim();
        const start = clean.indexOf('[');
        const end = clean.lastIndexOf(']');

        if (start === -1 || end === -1) {
            return res.status(500).json({ error: 'No JSON array found', raw: text });
        }

        const articles = JSON.parse(clean.slice(start, end + 1));
        res.status(200).json({ articles });

    } catch (error) {
        res.status(500).json({ error: 'Server error', details: error.message });
    }
}