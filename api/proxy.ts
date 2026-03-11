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

  // Sanitize event slug (alphanumeric, hyphens, underscores only)
  if (!/^[a-zA-Z0-9_-]+$/.test(event)) {
    return res.status(400).json({ error: 'Invalid event slug' });
  }

  // Allow JSON data files and KML route files ({event}.kml)
  const isKml = file.endsWith('.kml') && /^[a-zA-Z0-9_-]+\.kml$/.test(file);
  if (!ALLOWED_FILES.includes(file) && !isKml) {
    return res.status(400).json({ error: `Invalid file. Allowed: ${ALLOWED_FILES.join(', ')} or {event}.kml` });
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
    const contentType = isKml ? 'application/xml' : 'application/json';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).send(data);
  } catch (err: any) {
    return res.status(500).json({
      error: 'Failed to fetch data from OpenTracking. The service may be temporarily unavailable.',
    });
  }
}
