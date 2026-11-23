export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const accountId = (process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
    const apiToken = (process.env.CLOUDFLARE_API_TOKEN || '').trim();

    if (!accountId || !apiToken) {
      return res.status(500).json({
        error: 'CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN is missing in Vercel.',
      });
    }

    const { imageBase64, mimeType = 'image/jpeg', model = '@cf/google/gemma-4-26b-a4b-it' } =
      req.body || {};

    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64 in request body.' });
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/v1/chat/completions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Extract mpn, boardNumber, serialNumber, barcode, partName, brand, compatibleModels (array), condition, notes, and ocrRawText as JSON.',
                },
                {
                  type: 'image_url',
                  image_url: { url: `data:${mimeType};base64,${imageBase64}` },
                },
              ],
            },
          ],
        }),
      }
    );

    const text = await response.text();
    let parsed = {};
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      return res.status(response.status || 502).json({ error: text || 'Invalid Cloudflare response' });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: parsed?.errors?.[0]?.message || parsed?.error || 'Cloudflare AI request failed',
      });
    }

    const content = parsed?.choices?.[0]?.message?.content || '';
    const cleaned = content.replace(/```json|```/gi, '').trim();

    let extracted = {};
    try {
      extracted = JSON.parse(cleaned);
    } catch {
      extracted = { ocrRawText: content };
    }

    return res.status(200).json(extracted);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unhandled server error' });
  }
}
