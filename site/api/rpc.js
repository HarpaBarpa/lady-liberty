// Vercel serverless CORS proxy for Robinhood Chain RPC
// Route: POST /api/rpc
export default async function handler(req, res) {
  // CORS headers for the site
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const rpc = await fetch('https://rpc.mainnet.chain.robinhood.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await rpc.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(502).json({ error: 'RPC unreachable', detail: e.message });
  }
}