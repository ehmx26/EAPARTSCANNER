export function getEbayHosts(env = 'Sandbox') {
  const isProd = String(env).toLowerCase() === 'production';
  return {
    isProd,
    authBase: isProd ? 'https://auth.ebay.com' : 'https://auth.sandbox.ebay.com',
    apiBase: isProd ? 'https://api.ebay.com' : 'https://api.sandbox.ebay.com',
  };
}

export function getBasicAuthHeader() {
  const appId = process.env.EBAY_APP_ID;
  const certId = process.env.EBAY_CERT_ID;
  if (!appId || !certId) {
    throw new Error('Missing EBAY_APP_ID or EBAY_CERT_ID in Vercel environment variables.');
  }
  const encoded = Buffer.from(`${appId}:${certId}`).toString('base64');
  return `Basic ${encoded}`;
}

export function parseCookies(req) {
  const header = req.headers?.cookie || '';
  return header.split(';').reduce((acc, part) => {
    const [k, ...v] = part.trim().split('=');
    if (k) acc[k] = decodeURIComponent(v.join('='));
    return acc;
  }, {});
}

export function serializeCookie(name, value, maxAgeSeconds = 60 * 60 * 24 * 30) {
  const isVercelProd = process.env.VERCEL_ENV === 'production';
  return [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
    isVercelProd ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');
}

export async function refreshEbayAccessToken(refreshToken, env = 'Sandbox') {
  const { apiBase } = getEbayHosts(env);
  const scopes = [
    'https://api.ebay.com/oauth/api_scope',
    'https://api.ebay.com/oauth/api_scope/sell.inventory',
    'https://api.ebay.com/oauth/api_scope/sell.account',
    'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
  ].join(' ');

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    scope: scopes,
  });

  const response = await fetch(`${apiBase}/identity/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: getBasicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Failed to refresh eBay token.');
  }
  return data;
}
