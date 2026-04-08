// Simple in-memory cache
const cache = new Map();

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { topic } = req.body;

        if (!topic) {
            return res.status(400).json({ error: 'Topic is required' });
        }

        if (!process.env.Abrinowears_blog) {
            return res.status(500).json({ error: 'Abrinowears_blog is not set' });
        }

        // 🔐 sanitize topic
        const safeTopic = topic.substring(0, 100);

        // ✅ CACHE KEY
        const cacheKey = safeTopic.toLowerCase();

        // ⏱️ Cache duration (10 minutes)
        const CACHE_DURATION = 10 * 60 * 1000;

        // ✅ CHECK CACHE
        if (cache.has(cacheKey)) {
            const cached = cache.get(cacheKey);

            if (Date.now() - cached.timestamp < CACHE_DURATION) {
                return res.status(200).json({ articles: cached.data });
            } else {
                cache.delete(cacheKey);
            }
        }

        const prompt = `You are a fashion writer for a Nigerian brand.

Write 3 engaging blog articles about: "${safeTopic}".

Focus on Nigerian fashion (Ankara, Aso-Oke, Adire, Agbada, Isiagu, George).

Return ONLY a JSON array with 3 objects.

Each object must have:
"title" (max 10 words),
"category" (Native Wear, Ankara, Aso-Oke, Contemporary, Bridal, Street Style, Designer Spotlight, Trend Report),
"excerpt" (2 sentences, 30-40 words),
"body" (HTML with 2 <p> paragraphs, 120-150 words),
"readTime",
"date".`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.Abrinowears_blog}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.6,
                        maxOutputTokens: 1200
                    }
                })
            }
        );

        const data = await response.json();

        // ❗ If Gemini fails → return fallback (NO UI BREAK)
        if (!response.ok) {
            console.error('Gemini Error:', data);

            return res.status(200).json({
                articles: [
                    {
                        title: "Latest Nigerian Fashion Trends",
                        category: "Trend Report",
                        excerpt: "Explore evolving Nigerian fashion styles shaping current trends across fabrics and designers.",
                        body: "<p>Content temporarily unavailable. Please try again later.</p>",
                        readTime: "2 min read",
                        date: "2026"
                    }
                ]
            });
        }

        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

        const clean = text.replace(/```json|```/g, '').trim();
        const start = clean.indexOf('[');
        const end = clean.lastIndexOf(']');

        if (start === -1 || end === -1) {
            return res.status(500).json({ error: 'No JSON array found', raw: text });
        }

        let articles;

        // ✅ SAFE JSON PARSE
        try {
            articles = JSON.parse(clean.slice(start, end + 1));
        } catch (err) {
            return res.status(500).json({
                error: 'JSON parsing failed',
                raw: text
            });
        }

        // ✅ VALIDATE OUTPUT
        if (!Array.isArray(articles) || articles.length !== 3) {
            return res.status(500).json({
                error: 'Invalid article count',
                raw: articles
            });
        }

        // ✅ SAVE TO CACHE
        cache.set(cacheKey, {
            data: articles,
            timestamp: Date.now()
        });

        return res.status(200).json({ articles });

    } catch (error) {
        return res.status(500).json({
            error: 'Server error',
            details: error.message
        });
    }
}