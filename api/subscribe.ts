import { sql } from '@vercel/postgres';
import crypto from 'crypto';

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { event_code, bib_number, email, pushSubscription } = req.body;

  if (!event_code || !bib_number) {
    return res.status(400).json({ error: 'event_code and bib_number are required' });
  }

  if (!email && !pushSubscription) {
    return res.status(400).json({ error: 'Either email or push subscription is required' });
  }

  // Basic email validation
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  try {
    // Check for existing active subscription with same email for this event+bib
    if (email) {
      const existing = await sql`
        SELECT id FROM subscriptions
        WHERE event_code = ${event_code} AND bib_number = ${parseInt(bib_number, 10)}
        AND email = ${email} AND active = TRUE
      `;
      if (existing.rows.length > 0) {
        return res.status(200).json({
          success: true,
          message: 'You are already subscribed to notifications for this runner.',
          already_subscribed: true,
        });
      }
    }

    // Check for existing push subscription
    if (pushSubscription?.endpoint) {
      const existing = await sql`
        SELECT id FROM subscriptions
        WHERE event_code = ${event_code} AND bib_number = ${parseInt(bib_number, 10)}
        AND push_endpoint = ${pushSubscription.endpoint} AND active = TRUE
      `;
      if (existing.rows.length > 0) {
        return res.status(200).json({
          success: true,
          message: 'You are already subscribed to push notifications for this runner.',
          already_subscribed: true,
        });
      }
    }

    const token = crypto.randomBytes(32).toString('hex');

    await sql`
      INSERT INTO subscriptions (
        event_code, bib_number, email,
        push_endpoint, push_p256dh, push_auth,
        unsubscribe_token
      ) VALUES (
        ${event_code},
        ${parseInt(bib_number, 10)},
        ${email || null},
        ${pushSubscription?.endpoint || null},
        ${pushSubscription?.keys?.p256dh || null},
        ${pushSubscription?.keys?.auth || null},
        ${token}
      )
    `;

    return res.status(200).json({
      success: true,
      message: 'Subscribed! You will receive notifications at each checkpoint.',
      unsubscribe_token: token,
    });
  } catch (err: any) {
    console.error('Subscribe error:', err);
    return res.status(500).json({ error: 'Failed to create subscription. Please try again.' });
  }
}
