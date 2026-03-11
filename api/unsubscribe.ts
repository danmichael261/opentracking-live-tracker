import { sql } from '@vercel/postgres';

export default async function handler(req: any, res: any) {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send(errorPage('Missing unsubscribe token.'));
  }

  try {
    const result = await sql`
      UPDATE subscriptions SET active = FALSE
      WHERE unsubscribe_token = ${token as string} AND active = TRUE
      RETURNING event_code, bib_number
    `;

    if (result.rowCount === 0) {
      return res.status(200).send(resultPage(
        '⚠️ Already Unsubscribed',
        'This subscription was already cancelled or the link has expired.'
      ));
    }

    const { event_code, bib_number } = result.rows[0];
    return res.status(200).send(resultPage(
      '✅ Unsubscribed',
      `You will no longer receive checkpoint notifications for bib #${bib_number} in event "${event_code}".`
    ));
  } catch (err: any) {
    console.error('Unsubscribe error:', err);
    return res.status(500).send(errorPage('Something went wrong. Please try again.'));
  }
}

function resultPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex; justify-content: center; align-items: center;
      min-height: 100vh; background: #1d232a; color: #a6adba; padding: 1rem;
    }
    .card {
      background: #2a323c; padding: 2.5rem; border-radius: 1rem;
      text-align: center; max-width: 420px; width: 100%;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }
    h1 { color: #fff; margin-bottom: 0.75rem; font-size: 1.5rem; }
    p { line-height: 1.6; margin-bottom: 1.5rem; }
    a {
      display: inline-block; background: #7480ff; color: #fff;
      padding: 0.6rem 1.5rem; border-radius: 0.5rem;
      text-decoration: none; font-weight: 600; transition: opacity 0.2s;
    }
    a:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="/">← Back to Tracker</a>
  </div>
</body>
</html>`;
}

function errorPage(message: string): string {
  return resultPage('❌ Error', message);
}
