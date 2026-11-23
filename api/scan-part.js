function normalizeBoardCode(raw = '') {
  let code = String(raw || '').trim().toUpperCase();
  if (!code) return '';

  // Fix common silkscreen OCR misreads on Hisense/TV boards (e.g. RS467_820_12970/ROH -> RSAG7.820.12970/ROH)
  code = code.replace(/^RS[A4][G6]7[_.\-\s]*820[_.\-\s]*/i, 'RSAG7.820.');

  // Normalize underscores/spaces inside dot-separated board codes when /ROH is present
  if (code.includes('/ROH')) {
    code = code.replace(/_/g, '.').replace(/\s+/g, '');
  }

  return code;
}

function inferBrandFromCode(mpn = '', brand = '') {
  if (brand && brand.trim()) return brand.trim();
  const upper = mpn.toUpperCase();
  if (upper.startsWith('RSAG7.')) return 'Hisense';
  if (upper.startsWith('BN44-') || upper.startsWith('BN94-') || upper.startsWith('BN96-')) return 'Samsung';
  if (upper.startsWith('EAX') || upper.startsWith('EBT') || upper.startsWith('EBR')) return 'LG';
  if (upper.startsWith('1-')) return 'Sony';
  if (upper.startsWith('W10') || upper.startsWith('WPW10')) return 'Whirlpool';
  return '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const accountId = (process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
    const apiToken = (process.env.CLOUDFLARE_API_TOKEN || '').trim();

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
      return res.status(400).json({ error: 'Missing imageBase64 in request body.' });
    }

    const systemPrompt = [
      'You are an expert electronics & appliance parts OCR parser for TV repair technicians and eBay resellers.',
      'Carefully transcribe exact silkscreen codes, white barcode stickers, and OEM part numbers.',
      'CRITICAL OCR RULES:',
      '- Distinguish letters from digits carefully: A vs 4, G vs 6, O vs 0, I vs 1, S vs 5, B vs 8.',
      '- Preserve dots (.), hyphens (-), and slashes (/) exactly as printed. Never replace dots with underscores.',
      '- Hisense/OEM TV boards commonly begin with "RSAG7.820." and end with "/ROH" (for example: RSAG7.820.12970/ROH).',
      '- Samsung boards commonly use BN44-xxxxxA, BN94-xxxxxA, or BN96-xxxxxA.',
      '- LG boards commonly use EAXxxxxxxxx, EBTxxxxxxxx, or EBRxxxxxxxx.',
      'Return ONLY valid JSON with these exact keys:',
      '{"mpn":"","boardNumber":"","serialNumber":"","barcode":"","partName":"","brand":"","category":"","compatibleModels":[],"condition":"Used - Fully Functional (Grade A)","notes":"","ocrRawText":""}',
    ].join('\n');

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
          temperature: 0.1,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Read all printed part numbers, board silkscreen codes, barcodes, and brand details from this part image and return strict JSON.',
                },
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

    const rawText = await response.text();
    let parsed = {};
    try {
      parsed = rawText ? JSON.parse(rawText) : {};
    } catch {
      return res.status(response.status || 502).json({
        error: rawText || 'Invalid non-JSON response from Cloudflare AI',
      });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: parsed?.errors?.[0]?.message || parsed?.error || `Cloudflare AI error (${response.status})`,
      });
    }

    const content = parsed?.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const cleaned = jsonMatch ? jsonMatch[0] : content.replace(/```json|```/gi, '').trim();

    let extracted = {};
    try {
      extracted = JSON.parse(cleaned);
    } catch {
      extracted = { ocrRawText: content };
    }

    const normalizedMpn = normalizeBoardCode(extracted.mpn || extracted.boardNumber || '');
    const normalizedBoard = normalizeBoardCode(extracted.boardNumber || extracted.mpn || '');
    const resolvedBrand = inferBrandFromCode(normalizedMpn, extracted.brand);

    let resolvedName = (extracted.partName || '').trim();
    if (!resolvedName || resolvedName.toLowerCase() === 'circuit board') {
      resolvedName = [resolvedBrand, normalizedMpn, 'TV Power Supply / Main Board']
        .filter(Boolean)
        .join(' ');
    }

    return res.status(200).json({
      mpn: normalizedMpn,
      boardNumber: normalizedBoard,
      serialNumber: String(extracted.serialNumber || '').trim(),
      barcode: String(extracted.barcode || '').trim(),
      partName: resolvedName,
      brand: resolvedBrand,
      category: String(
        extracted.category || 'Consumer Electronics > TV Boards, Parts & Components'
      ).trim(),
      compatibleModels: Array.isArray(extracted.compatibleModels)
        ? extracted.compatibleModels.map((m) => String(m).trim()).filter(Boolean)
        : [],
      condition: String(extracted.condition || 'Used - Fully Functional (Grade A)').trim(),
      notes: String(extracted.notes || '').trim(),
      ocrRawText: String(extracted.ocrRawText || content).trim(),
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message || 'Unhandled server error in /api/scan-part',
    });
  }
}
