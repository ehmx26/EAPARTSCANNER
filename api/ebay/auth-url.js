import { getEbayHosts } from './_helpers.js';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const appId = process.env.EBAY_APP_ID;
  const ruName = process.env.EBAY_RUNAME;
  const env = req.query.env === 'Production' ? 'Production' : 'Sandbox';

  if (!appId || !ruName) {
    return res.status(500).json({
      error: 'Missing EBAY_APP_ID or EBAY_RUNAME in Vercel environment variables.',
    });
  }

  const { authBase } = getEbayHosts(env);
  const scopes = [
    'https://api.ebay.com/oauth/api_scope',
    'https://api.ebay.com/oauth/api_scope/sell.inventory',
    'https://api.ebay.com/oauth/api_scope/sell.account',
    'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
  ].join(' ');

  const statePayload = Buffer.from(JSON.stringify({ env, ts: Date.now() })).toString('base64url');

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: ruName,
    response_type: 'code',
    scope: scopes,
    state: statePayload,
  });

  return res.status(200).json({
    url: `${authBase}/oauth2/authorize?${params.toString()}`,
    environment: env,
  });
}
