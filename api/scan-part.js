const MODEL_ID = '@cf/meta/llama-3.2-11b-vision-instruct';

function normalizeBoardCode(raw = '') {
  let code = String(raw || '').trim().toUpperCase();
  if (!code) return '';

  code = code.replace(/^RS[A4][G6]7[_.\-\s]*820[_.\-\s]*/i, 'RSAG7.820.');

  if (code.includes('/ROH')) {
    code = code.replace(/_/g, '.').replace(/\s+/g, '');
  }

  return code;
}

function inferBrandFromCode(mpn = '', brand = '', rawText = '') {
  if (brand && brand.trim()) return brand.trim();
  const combined = `${mpn} ${rawText}`.toUpperCase();
  if (combined.includes('RSAG7.') || combined.includes('HISENSE')) return 'Hisense';
  if (
    combined.includes('BN44-') ||
    combined.includes('BN94-') ||
    combined.includes('BN96-') ||
    combined.includes('SAMSUNG')
  ) {
    return 'Samsung';
  }
  if (
    combined.includes('EAX') ||
    combined.includes('EBT') ||
    combined.includes('EBR') ||
    combined.includes('LG')
  ) {
    return 'LG';
  }
  if (combined.includes('SONY')) return 'Sony';
  if (combined.includes('W10') || combined.includes('WPW10') || combined.includes('WHIRLPOOL')) {
    return 'Whirlpool';
  }
  return '';
}

function extractFromPlainText(text = '') {
  const upper = String(text || '');

  const rsagMatch = upper.match(/RS[A4][G6]7[._\-\s]*820[._\-\s]*[A-Z0-9]+(?:\/ROH)?/i);
  const mpnLineMatch = upper.match(
    /(?:MPN|PART\s*(?:NO|NUMBER|#)?|BOARD\s*(?:NO|NUMBER|#)?|MODEL)\s*[:\-]\s*([A-Z0-9._/-]+)/i
  );
  const serialMatch = upper.match(/(?:SERIAL|S\/N|SN)\s*[:\-]\s*([A-Z0-9._-]+)/i);
  const brandMatch = upper.match(/(?:BRAND|MANUFACTURER|MAKE)\s*[:\-]\s*([A-Za-z0-9 &.-]+)/i);

  const rawCode = rsagMatch ? rsagMatch[0] : mpnLineMatch ? mpnLineMatch[1] : '';

  return {
    mpn: rawCode,
    boardNumber: rawCode,
    serialNumber: serialMatch ? serialMatch[1] : '',
    brand: brandMatch ? brandMatch[1].trim() : '',
    ocrRawText: text.trim(),
  };
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

    const { imageBase64 } = req.body || {};
    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64 in request body.' });
    }

    const cleanBase64 = String(imageBase64).replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
    const imageArray = Array.from(new Uint8Array(Buffer.from(cleanBase64, 'base64')));

    if (!imageArray.length) {
      return res.status(400).json({ error: 'Invalid base64 image data.' });
    }

    const prompt = [
      'Read all printed part numbers, PCB silkscreen codes, barcode labels, serial numbers, and brand names on this part.',
      'Reply ONLY with a single JSON object:',
      '{"mpn":"","boardNumber":"","serialNumber":"","barcode":"","partName":"","brand":"","compatibleModels":[],"notes":"","ocrRawText":""}',
      'Keep exact dots/dashes/slashes (for example RSAG7.820.12970/ROH).',
    ].join('\n');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    let response;
    try {
      response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${MODEL_ID}`,
        {
          method: 'POST',
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt,
            image: imageArray,
            max_tokens: 250,
            temperature: 0.1,
          }),
        }
      );
    } finally {
      clearTimeout(timeoutId);
    }

    const rawText = await response.text();
    let parsed = {};
    try {
      parsed = rawText ? JSON.parse(rawText) : {};
    } catch {
      return res.status(response.status || 502).json({
        error: rawText || 'Invalid response from Cloudflare AI',
      });
    }

    if (!response.ok || parsed?.success === false) {
      return res.status(response.status || 400).json({
        error:
          parsed?.errors?.[0]?.message ||
          parsed?.error ||
          `Cloudflare AI error (${response.status})`,
      });
    }

    const resultObj = parsed?.result || {};
    const content =
      typeof resultObj.response === 'string'
        ? resultObj.response
        : JSON.stringify(resultObj || '');

    const jsonMatch = content.match(/\{[\s\S]*\}/);

    let extracted = {};
    let parsedJsonOk = false;

    if (jsonMatch) {
      try {
        extracted = JSON.parse(jsonMatch[0]);
        parsedJsonOk = true;
      } catch {
        parsedJsonOk = false;
      }
    }

    if (!parsedJsonOk) {
      extracted = extractFromPlainText(content);
    }

    const normalizedMpn = normalizeBoardCode(extracted.mpn || extracted.boardNumber || '');
    const normalizedBoard = normalizeBoardCode(extracted.boardNumber || extracted.mpn || '');
    const resolvedBrand = inferBrandFromCode(normalizedMpn, extracted.brand, content);

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
    const isTimeout = err?.name === 'AbortError' || err?.name === 'TimeoutError';
    return res.status(isTimeout ? 504 : 500).json({
      error: isTimeout
        ? 'Cloudflare OCR timed out after 25s. Try a smaller or clearer photo.'
        : err?.message || 'Unhandled server error in /api/scan-part',
    });
  }
}
