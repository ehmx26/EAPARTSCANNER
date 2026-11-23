import { parseCookies, refreshEbayAccessToken, serializeCookie } from './_helpers.js';

export default async function handler(req, res) {
  const cookies = parseCookies(req);
  if (!cookies.ebay_oauth_session) {
    return res.status(200).json({ connected: false });
  }

  try {
    const session = JSON.parse(cookies.ebay_oauth_session);
    const isExpired = !session.expiresAt || Date.now() > session.expiresAt - 60_000;

    if (isExpired && session.refreshToken) {
      const refreshed = await refreshEbayAccessToken(session.refreshToken, session.env);
      const updated = {
        ...session,
        accessToken: refreshed.access_token,
        expiresAt: Date.now() + (Number(refreshed.expires_in) || 7200) * 1000,
      };
      res.setHeader('Set-Cookie', serializeCookie('ebay_oauth_session', JSON.stringify(updated)));
      return res.status(200).json({ connected: true, environment: updated.env, refreshed: true });
    }

    return res.status(200).json({ connected: true, environment: session.env });
  } catch {
    return res.status(200).json({ connected: false });
  }
}
