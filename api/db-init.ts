import { sql } from '@vercel/postgres';

export default async function handler(req: any, res: any) {
  // Secure with cron secret
  if (req.query.secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        event_code VARCHAR(100) NOT NULL,
        bib_number INTEGER NOT NULL,
        email VARCHAR(255),
        push_endpoint TEXT,
        push_p256dh TEXT,
        push_auth TEXT,
        last_notified_checkpoint VARCHAR(100),
        unsubscribe_token VARCHAR(64) UNIQUE NOT NULL,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_subs_active_event 
      ON subscriptions(event_code, bib_number) WHERE active = TRUE
    `;

    return res.status(200).json({ success: true, message: 'Database initialized' });
  } catch (err: any) {
    console.error('DB init error:', err);
    return res.status(500).json({ error: err.message });
  }
}
