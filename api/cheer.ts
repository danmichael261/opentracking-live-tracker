import { sql } from '@vercel/postgres';

// ── Profanity / hate speech filter ──────────────────────────────────────────

const BANNED_WORDS = [
  // Common profanity
  'fuck', 'shit', 'bitch', 'cunt', 'twat', 'wank', 'bollocks', 'arse',
  'arsehole', 'asshole', 'dick', 'cock', 'pussy', 'piss', 'slut', 'whore',
  'bastard', 'knob', 'bellend', 'tosser', 'prick', 'bugger', 'sodding',
  'shag', 'motherfucker', 'bullshit', 'horseshit', 'dumbass', 'jackass',
  'goddamn', 'douchebag', 'dildo', 'tits', 'boobs', 'wanker',
  // Racial slurs
  'nigger', 'nigga', 'chink', 'spic', 'kike', 'gook', 'wetback', 'beaner',
  'paki', 'raghead', 'towelhead', 'coon', 'darkie', 'wog', 'gyppo', 'pikey',
  'honky', 'cracker', 'gringo',
  // Homophobic / transphobic
  'faggot', 'fag', 'dyke', 'tranny', 'shemale', 'battyboy', 'bumboy',
  'lesbo', 'homo',
  // Ableist
  'retard', 'retarded', 'spaz', 'spastic', 'mong', 'mongo', 'mongoloid',
];

function containsBannedContent(text: string): boolean {
  const lower = text.toLowerCase();
  for (const word of BANNED_WORDS) {
    // Match word boundaries to avoid false positives (e.g., "class" matching "ass")
    const regex = new RegExp(`\\b${word}s?\\b`, 'i');
    if (regex.test(lower)) return true;
  }
  return false;
}

// ── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { event_code, bib_number, sender_name, message } = req.body;

  if (!event_code || !bib_number || !sender_name || !message) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const trimmedName = String(sender_name).trim().slice(0, 50);
  const trimmedMessage = String(message).trim().slice(0, 200);

  if (trimmedName.length < 1 || trimmedMessage.length < 1) {
    return res.status(400).json({ error: 'Name and message cannot be empty' });
  }

  // Content moderation
  if (containsBannedContent(trimmedName) || containsBannedContent(trimmedMessage)) {
    return res.status(400).json({
      error: 'Your message contains inappropriate language. Please keep it positive and encouraging! 🙏',
    });
  }

  try {
    // Rate limit: max 1 cheer per minute per sender name for this event+bib
    const recent = await sql`
      SELECT id FROM cheers
      WHERE event_code = ${event_code}
        AND bib_number = ${parseInt(String(bib_number), 10)}
        AND LOWER(sender_name) = ${trimmedName.toLowerCase()}
        AND created_at > NOW() - INTERVAL '1 minute'
      LIMIT 1
    `;

    if (recent.rows.length > 0) {
      return res.status(429).json({
        error: 'Easy there, champ! Please wait a minute before sending another cheer. 😊',
      });
    }

    await sql`
      INSERT INTO cheers (event_code, bib_number, sender_name, message)
      VALUES (
        ${event_code},
        ${parseInt(String(bib_number), 10)},
        ${trimmedName},
        ${trimmedMessage}
      )
    `;

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('Cheer submit error:', err);
    return res.status(500).json({ error: 'Failed to save cheer. Please try again.' });
  }
}
