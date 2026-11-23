const accountId = (process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
const apiToken = (process.env.CLOUDFLARE_API_TOKEN || '').trim();

if (!accountId || !apiToken) {
  return res.status(500).json({
    error: 'Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN in Vercel environment variables.',
  });
}

const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/v1/chat/completions`;
