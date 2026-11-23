import { getBasicAuthHeader, getEbayHosts, serializeCookie } from './_helpers.js';

export default async function handler(req, res) {
  const { code, state, error, error_description } = req.query;

  if (error) {
    return res.redirect(`/?ebay_error=${encodeURIComponent(error_description || error)}`);
  }

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code from eBay.' });
  }

  let env = 'Sandbox';
  if (state) {
    try {
      const decoded = JSON.parse(Buffer.from(String(state), 'base64url').toString('utf8'));
      if (decoded?.env === 'Production') env = 'Production';
    } catch {
      // Default to Sandbox if state cannot be decoded
    }
  }

  const ruName = process.env.EBAY_RUNAME;
  if (!ruName) {
    return res.status(500).json({ error: 'Missing EBAY_RUNAME in Vercel environment variables.' });
  }

  const { apiBase } = getEbayHosts(env);
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: String(code),
    redirect_uri: ruName,
  });

  try {
    const tokenRes = await fetch(`${apiBase}/identity/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: getBasicAuthHeader(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      const msg = tokenData.error_description || tokenData.error || 'Token exchange failed';
      return res.redirect(`/?ebay_error=${encodeURIComponent(msg)}`);
    }

    const sessionPayload = JSON.stringify({
      env,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: Date.now() + (Number(tokenData.expires_in) || 7200) * 1000,
    });

    res.setHeader('Set-Cookie', serializeCookie('ebay_oauth_session', sessionPayload));
    return res.redirect(`/?ebay_connected=1&env=${env}`);
  } catch (err) {
    return res.redirect(`/?ebay_error=${encodeURIComponent(err.message)}`);
  }
}
