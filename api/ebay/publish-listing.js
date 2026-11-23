import {
  getEbayHosts,
  parseCookies,
  refreshEbayAccessToken,
  serializeCookie,
} from './_helpers.js';

const CONDITION_MAP = {
  New: 'NEW',
  'Open Box': 'OPEN_BOX',
  'Used - Tested': 'USED_EXCELLENT',
  Used: 'USED_GOOD',
  'For Parts': 'FOR_PARTS_OR_NOT_WORKING',
};

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

  // Refresh access token if expired
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

  const { apiBase } = getEbayHosts(session.env);
  const {
    sku,
    title,
    description,
    price,
    quantity = 1,
    condition = 'Used',
    brand = 'Unbranded',
    mpn = 'Does Not Apply',
    boardNumber = '',
    compatibleModels = '',
    categoryId = '175745', // Default: TV Boards, Parts & Components
    imageUrls = [],
    fulfillmentPolicyId,
    paymentPolicyId,
    returnPolicyId,
    merchantLocationKey = 'DEFAULT_WAREHOUSE',
    saveDraftOnly = false,
  } = req.body || {};

  if (!sku || !title || !price) {
    return res.status(400).json({ error: 'sku, title, and price are required.' });
  }

  const ebayHeaders = {
    Authorization: `Bearer ${session.accessToken}`,
    'Content-Type': 'application/json',
    'Content-Language': 'en-US',
    Accept: 'application/json',
  };

  try {
    // 1. Create or Replace Inventory Item
    const aspects = {
      Brand: [brand || 'Unbranded'],
      MPN: [mpn || 'Does Not Apply'],
    };
    if (boardNumber) aspects['Board Number'] = [boardNumber];
    if (compatibleModels) aspects['Compatible Model'] = [compatibleModels.slice(0, 65)];

    const inventoryPayload = {
      availability: {
        shipToLocationAvailability: {
          quantity: Number(quantity) || 1,
        },
      },
      condition: CONDITION_MAP[condition] || 'USED_GOOD',
      conditionDescription: description?.slice(0, 1000) || 'Tested working replacement part.',
      product: {
        title: String(title).slice(0, 80),
        description: description || title,
        aspects,
        brand: brand || 'Unbranded',
        mpn: mpn || 'Does Not Apply',
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      },
    };

    const invRes = await fetch(
      `${apiBase}/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`,
      {
        method: 'PUT',
        headers: ebayHeaders,
        body: JSON.stringify(inventoryPayload),
      }
    );

    if (!invRes.ok) {
      const invErr = await invRes.json().catch(() => ({}));
      return res.status(invRes.status).json({
        step: 'createOrReplaceInventoryItem',
        error: invErr?.errors?.[0]?.message || `Inventory API HTTP ${invRes.status}`,
        details: invErr,
      });
    }

    // 2. Create Offer (Links SKU to Category, Price, and Business Policies)
    const offerPayload = {
      sku,
      marketplaceId: 'EBAY_US',
      format: 'FIXED_PRICE',
      availableQuantity: Number(quantity) || 1,
      categoryId: String(categoryId),
      listingDescription: description || title,
      merchantLocationKey,
      pricingSummary: {
        price: {
          value: Number(price).toFixed(2),
          currency: 'USD',
        },
      },
      listingPolicies: {
        fulfillmentPolicyId: fulfillmentPolicyId || process.env.EBAY_FULFILLMENT_POLICY_ID,
        paymentPolicyId: paymentPolicyId || process.env.EBAY_PAYMENT_POLICY_ID,
        returnPolicyId: returnPolicyId || process.env.EBAY_RETURN_POLICY_ID,
      },
    };

    const offerRes = await fetch(`${apiBase}/sell/inventory/v1/offer`, {
      method: 'POST',
      headers: ebayHeaders,
      body: JSON.stringify(offerPayload),
    });

    const offerData = await offerRes.json();
    if (!offerRes.ok) {
      return res.status(offerRes.status).json({
        step: 'createOffer',
        error: offerData?.errors?.[0]?.message || `Offer API HTTP ${offerRes.status}`,
        details: offerData,
      });
    }

    const offerId = offerData.offerId;

    if (saveDraftOnly) {
      return res.status(200).json({
        status: 'DRAFT_OFFER_CREATED',
        sku,
        offerId,
        environment: session.env,
      });
    }

    // 3. Publish Offer to Live eBay Listing
    const pubRes = await fetch(
      `${apiBase}/sell/inventory/v1/offer/${encodeURIComponent(offerId)}/publish`,
      {
        method: 'POST',
        headers: ebayHeaders,
      }
    );

    const pubData = await pubRes.json();
    if (!pubRes.ok) {
      return res.status(pubRes.status).json({
        step: 'publishOffer',
        offerId,
        error: pubData?.errors?.[0]?.message || `Publish API HTTP ${pubRes.status}`,
        details: pubData,
      });
    }

    return res.status(200).json({
      status: 'PUBLISHED',
      sku,
      offerId,
      listingId: pubData.listingId,
      environment: session.env,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'eBay Inventory publish error.' });
  }
}
