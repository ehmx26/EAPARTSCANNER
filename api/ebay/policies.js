import {
  getEbayHosts,
  parseCookies,
  refreshEbayAccessToken,
  serializeCookie,
} from './_helpers.js';

async function fetchEbayJson(url, accessToken, marketplaceId = 'EBAY_US') {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-EBAY-C-MARKETPLACE-ID': marketplaceId,
      Accept: 'application/json',
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      data?.errors?.[0]?.message ||
      data?.error_description ||
      `eBay API request failed (${res.status})`;
    return { ok: false, status: res.status, error: message, raw: data };
  }

  return { ok: true, status: res.status, data };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
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

  // Auto-refresh expired OAuth access token before calling eBay APIs
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

  const marketplaceId = String(req.query.marketplaceId || 'EBAY_US');
  const { apiBase } = getEbayHosts(session.env);

  try {
    const [
      fulfillmentResult,
      paymentResult,
      returnResult,
      locationResult,
    ] = await Promise.all([
      fetchEbayJson(
        `${apiBase}/sell/account/v1/fulfillment_policy?marketplace_id=${encodeURIComponent(marketplaceId)}`,
        session.accessToken,
        marketplaceId
      ),
      fetchEbayJson(
        `${apiBase}/sell/account/v1/payment_policy?marketplace_id=${encodeURIComponent(marketplaceId)}`,
        session.accessToken,
        marketplaceId
      ),
      fetchEbayJson(
        `${apiBase}/sell/account/v1/return_policy?marketplace_id=${encodeURIComponent(marketplaceId)}`,
        session.accessToken,
        marketplaceId
      ),
      fetchEbayJson(
        `${apiBase}/sell/inventory/v1/location?limit=50`,
        session.accessToken,
        marketplaceId
      ),
    ]);

    const fulfillmentPolicies = (fulfillmentResult.data?.fulfillmentPolicies || []).map((p) => ({
      id: p.fulfillmentPolicyId,
      name: p.name,
      description: p.description || '',
      marketplaceId: p.marketplaceId,
    }));

    const paymentPolicies = (paymentResult.data?.paymentPolicies || []).map((p) => ({
      id: p.paymentPolicyId,
      name: p.name,
      description: p.description || '',
      marketplaceId: p.marketplaceId,
    }));

    const returnPolicies = (returnResult.data?.returnPolicies || []).map((p) => ({
      id: p.returnPolicyId,
      name: p.name,
      description: p.description || '',
      returnsAccepted: Boolean(p.returnsAccepted),
      marketplaceId: p.marketplaceId,
    }));

    const locations = (locationResult.data?.locations || []).map((loc) => ({
      merchantLocationKey: loc.merchantLocationKey,
      name: loc.name || loc.merchantLocationKey,
      status: loc.merchantLocationStatus || 'ENABLED',
      city: loc.location?.address?.city || '',
      stateOrProvince: loc.location?.address?.stateOrProvince || '',
      postalCode: loc.location?.address?.postalCode || '',
      country: loc.location?.address?.country || '',
    }));

    const warnings = [
      !fulfillmentResult.ok ? `Fulfillment policies: ${fulfillmentResult.error}` : null,
      !paymentResult.ok ? `Payment policies: ${paymentResult.error}` : null,
      !returnResult.ok ? `Return policies: ${returnResult.error}` : null,
      !locationResult.ok ? `Inventory locations: ${locationResult.error}` : null,
    ].filter(Boolean);

    return res.status(200).json({
      environment: session.env,
      marketplaceId,
      fulfillmentPolicies,
      paymentPolicies,
      returnPolicies,
      locations,
      defaults: {
        fulfillmentPolicyId: fulfillmentPolicies[0]?.id || '',
        paymentPolicyId: paymentPolicies[0]?.id || '',
        returnPolicyId: returnPolicies[0]?.id || '',
        merchantLocationKey: locations[0]?.merchantLocationKey || '',
      },
      warnings,
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message || 'Failed to fetch eBay policies and merchant locations.',
    });
  }
}
