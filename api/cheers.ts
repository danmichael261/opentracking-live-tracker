import { sql } from '@vercel/postgres';

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const event = req.query.event as string;
  const bib = req.query.bib as string;

  if (!event || !bib) {
    return res.status(400).json({ error: 'event and bib parameters are required' });
  }

  try {
    const result = await sql`
      SELECT id, sender_name, message, created_at
      FROM cheers
      WHERE event_code = ${event} AND bib_number = ${parseInt(bib, 10)}
      ORDER BY created_at DESC
      LIMIT 50
    `;

    // Cache for 30 seconds to reduce DB hits
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

    return res.status(200).json({ cheers: result.rows });
  } catch (err: any) {
    console.error('Fetch cheers error:', err);
    return res.status(500).json({ error: 'Failed to load cheers' });
  }
}
