import {
  getEbayHosts,
  parseCookies,
  refreshEbayAccessToken,
  serializeCookie,
} from './_helpers.js';

function sanitizeLocationKey(rawKey) {
  const cleaned = String(rawKey || 'WAREHOUSE_MAIN')
    .trim()
    .replace(/[^A-Za-z0-9_-]/g, '_')
    .slice(0, 36);
  return cleaned || 'WAREHOUSE_MAIN';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cookies = parseCookies(req);
  if (!cookies.ebay_oauth_session) {
    return res.status(401).json({
      error: 'eBay account not connected. Authorize via /api/ebay/auth-url first.',
    });
  }

  let session;
  try {
    session = JSON.parse(cookies.ebay_oauth_session);
  } catch {
    return res.status(401).json({ error: 'Invalid eBay OAuth session cookie.' });
  }

  // Auto-refresh expired OAuth access token before calling eBay Inventory API
  if (!session.expiresAt || Date.now() > session.expiresAt - 60_000) {
    try {
      const refreshed = await refreshEbayAccessToken(session.refreshToken, session.env);
      session = {
        ...session,
        accessToken: refreshed.access_token,
        expiresAt: Date.now() + (Number(refreshed.expires_in) || 7200) * 1000,
      };
      res.setHeader('Set-Cookie', serializeCookie('ebay_oauth_session', JSON.stringify(session)));
    } catch (err) {
      return res.status(401).json({ error: `Token refresh failed: ${err.message}` });
    }
  }

  const {
    merchantLocationKey = 'VENTURA_WAREHOUSE_01',
    name = 'Main Parts Fulfillment Warehouse',
    phone = '',
    addressLine1 = '',
    addressLine2 = '',
    city = '',
    stateOrProvince = '',
    postalCode = '',
    country = 'US',
    locationTypes = ['WAREHOUSE'],
  } = req.body || {};

  if (!city || !postalCode || !country) {
    return res.status(400).json({
      error: 'city, postalCode, and country are required to register an eBay inventory location.',
    });
  }

  const locationKey = sanitizeLocationKey(merchantLocationKey);
  const { apiBase } = getEbayHosts(session.env);

  const locationPayload = {
    location: {
      address: {
        addressLine1: addressLine1 || undefined,
        addressLine2: addressLine2 || undefined,
        city: String(city).trim(),
        stateOrProvince: stateOrProvince ? String(stateOrProvince).trim() : undefined,
        postalCode: String(postalCode).trim(),
        country: String(country).trim().toUpperCase(),
      },
    },
    locationTypes: Array.isArray(locationTypes) && locationTypes.length > 0
      ? locationTypes
      : ['WAREHOUSE'],
    name: String(name).trim().slice(0, 100) || locationKey,
    merchantLocationStatus: 'ENABLED',
    phone: phone ? String(phone).trim() : undefined,
  };

  try {
    const ebayRes = await fetch(
      `${apiBase}/sell/inventory/v1/location/${encodeURIComponent(locationKey)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          'Content-Language': 'en-US',
          Accept: 'application/json',
        },
        body: JSON.stringify(locationPayload),
      }
    );

    if (ebayRes.status === 204 || ebayRes.ok) {
      return res.status(200).json({
        created: true,
        merchantLocationKey: locationKey,
        name: locationPayload.name,
        environment: session.env,
        address: locationPayload.location.address,
      });
    }

    const errData = await ebayRes.json().catch(() => ({}));
    return res.status(ebayRes.status).json({
      error:
        errData?.errors?.[0]?.message ||
        `Failed to register inventory location (HTTP ${ebayRes.status})`,
      details: errData,
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message || 'Unexpected error registering eBay inventory location.',
    });
  }
}
