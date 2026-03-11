const ALLOWED_FILES = ['teams.json', 'checkpoints.json', 'config.json'];

export default async function handler(req: any, res: any) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  const event = req.query.event as string;
  const file = req.query.file as string;

  if (!event || !file) {
    return res.status(400).json({ error: 'Missing required parameters: event and file' });
  }

  if (!ALLOWED_FILES.includes(file)) {
    return res.status(400).json({ error: `Invalid file. Allowed: ${ALLOWED_FILES.join(', ')}` });
  }

  // Sanitize event slug (alphanumeric, hyphens, underscores only)
  if (!/^[a-zA-Z0-9_-]+$/.test(event)) {
    return res.status(400).json({ error: 'Invalid event slug' });
  }

  const url = `https://live.opentracking.co.uk/${event}/data/${file}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return res.status(response.status).json({
        error: `OpenTracking returned ${response.status}. Check the event code is correct.`,
      });
    }

    const data = await response.text();

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).send(data);
  } catch (err: any) {
    return res.status(500).json({
      error: 'Failed to fetch data from OpenTracking. The service may be temporarily unavailable.',
    });
  }
}
