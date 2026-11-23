export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

const ALLOWED_MODELS = new Set([
  '@cf/google/gemma-4-26b-a4b-it',
  '@cf/meta/llama-4-scout-17b-16e-instruct',
]);

function extractJsonObject(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;
  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    return res.status(500).json({
      error: 'Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN in Vercel environment variables.',
    });
  }

  const {
    imageBase64,
    mimeType = 'image/jpeg',
    model = '@cf/google/gemma-4-26b-a4b-it',
  } = req.body || {};

  if (!imageBase64) {
    return res.status(400).json({ error: 'No imageBase64 payload provided.' });
  }

  const selectedModel = ALLOWED_MODELS.has(model)
    ? model
    : '@cf/google/gemma-4-26b-a4b-it';

  const prompt = `You are an expert electronics, TV, and appliance replacement part OCR & catalog specialist.
Inspect the uploaded part/sticker/barcode photo carefully and extract structured details.
Return ONLY a valid JSON object (no markdown fences, no commentary) with these exact keys:
{
  "partName": "concise part name for eBay listing",
  "brand": "manufacturer brand name",
  "mpn": "primary OEM/manufacturer part number",
  "boardNumber": "PCB or chassis board number if printed",
  "serialNumber": "serial number or barcode value if visible",
  "category": "e.g. TV Power Supply Boards, TV Main Boards, Appliance Control Boards",
  "compatibleModels": ["model 1", "model 2"],
  "condition": "Used",
  "ocrRawText": "all readable sticker and label text",
  "notes": "physical inspection or fitment notes"
}`;

  try {
    const cfResponse = await fetch(
      `[https://api.cloudflare.com/client/v4/accounts/$](https://api.cloudflare.com/client/v4/accounts/$){accountId}/ai/v1/chat/completions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          temperature: 0.1,
          max_tokens: 900,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${imageBase64}`,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    const payload = await cfResponse.json();
    if (!cfResponse.ok) {
      const cfError =
        payload?.errors?.[0]?.message ||
        payload?.error?.message ||
        `Cloudflare Workers AI HTTP ${cfResponse.status}`;
      return res.status(cfResponse.status).json({ error: cfError });
    }

    const content = payload?.choices?.[0]?.message?.content || '';
    const parsed = extractJsonObject(content);

    if (!parsed) {
      return res.status(200).json({
        partName: 'Detected Part (Review Raw OCR)',
        brand: '',
        mpn: '',
        boardNumber: '',
        serialNumber: '',
        category: 'Electronics & Appliance Parts',
        compatibleModels: [],
        condition: 'Used',
        ocrRawText: content,
        notes: 'Model returned non-JSON text; review ocrRawText and fill fields manually.',
      });
    }

    return res.status(200).json({
      partName: parsed.partName || '',
      brand: parsed.brand || '',
      mpn: parsed.mpn || '',
      boardNumber: parsed.boardNumber || '',
      serialNumber: parsed.serialNumber || '',
      category: parsed.category || 'Electronics & Appliance Parts',
      compatibleModels: Array.isArray(parsed.compatibleModels)
        ? parsed.compatibleModels
        : [],
      condition: parsed.condition || 'Used',
      ocrRawText: parsed.ocrRawText || '',
      notes: parsed.notes || '',
      modelUsed: selectedModel,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to scan part image.' });
  }
}
