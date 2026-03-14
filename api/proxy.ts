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

  // Try the event code as-is first, then case variations if 404
  // OpenTracking URLs are case-sensitive (e.g. "HH50K-2026" works but "hh50k-2026" doesn't)
  const casesToTry = [
    event,
    event.toUpperCase(),
    event.toLowerCase(),
    // Mixed: uppercase first letter of each segment (e.g. "hh50k-2026" -> "Hh50k-2026")
  ].filter((v, i, a) => a.indexOf(v) === i); // deduplicate

  for (const tryEvent of casesToTry) {
    const kmlFile = isKml ? `${tryEvent}.kml` : file;
    const url = `https://live.opentracking.co.uk/${tryEvent}/data/${kmlFile}`;

    try {
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.text();
        const contentType = isKml ? 'application/xml' : 'application/json';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
        res.setHeader('Access-Control-Allow-Origin', '*');
        // Return the resolved event code so frontend can correct itself
        res.setHeader('X-Resolved-Event', tryEvent);
        return res.status(200).send(data);
      }

      // If 404, try next case variation
      if (response.status === 404) continue;

      // Other errors, return immediately
      return res.status(response.status).json({
        error: `OpenTracking returned ${response.status}. Check the event code is correct.`,
      });
    } catch (err: any) {
      // Network error on this attempt, try next
      continue;
    }
  }

  // All case variations failed
  return res.status(404).json({
    error: 'Event not found on OpenTracking. Check the event code is correct.',
  });
}
