import { sql } from '@vercel/postgres';
import webpush from 'web-push';

const OPENTRACKING_BASE = 'https://live.opentracking.co.uk';

// ── Types ──────────────────────────────────────────────────────────────────

interface Runner {
  r: number; n: string; lc: string; t: string;
  ag: string; g: string; fin: number; sp: string; ll: string;
}

interface ClassData {
  classname: string;
  teams: Runner[];
}

interface Positions {
  genderPos: number; genderTotal: number;
  overallPos: number; overallTotal: number;
  ageGroupPos: number; ageGroupTotal: number;
}

// ── Position calculation (same algorithm as frontend) ──────────────────────

function parseElapsedSeconds(t: string): number {
  if (!t) return Infinity;
  const parts = t.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Infinity;
}

function computePositions(
  target: Runner,
  allClasses: ClassData[],
  checkpointOrder: string[],
  targetGenderClass: string
): Positions {
  const targetCpIdx = checkpointOrder.indexOf(target.lc);
  const targetTime = parseElapsedSeconds(target.t);
  const targetAG = target.ag || target.g;

  let genderAhead = 0, genderTotal = 0;
  let overallAhead = 0, overallTotal = 0;
  let ageGroupAhead = 0, ageGroupTotal = 0;

  for (const cls of allClasses) {
    const isSameGender = cls.classname === targetGenderClass;
    for (const runner of cls.teams) {
      overallTotal++;
      if (isSameGender) genderTotal++;
      const runnerAG = runner.ag || runner.g;
      const isSameAG = isSameGender && runnerAG === targetAG;
      if (isSameAG) ageGroupTotal++;
      if (runner.r === target.r) continue;

      const runnerCpIdx = checkpointOrder.indexOf(runner.lc);
      const runnerTime = parseElapsedSeconds(runner.t);
      const isAhead =
        runnerCpIdx > targetCpIdx ||
        (runnerCpIdx === targetCpIdx && runnerTime < targetTime);

      if (isAhead) {
        overallAhead++;
        if (isSameGender) genderAhead++;
        if (isSameAG) ageGroupAhead++;
      }
    }
  }

  return {
    genderPos: genderAhead + 1, genderTotal,
    overallPos: overallAhead + 1, overallTotal,
    ageGroupPos: ageGroupAhead + 1, ageGroupTotal,
  };
}

// ── Email sender (Resend REST API) ─────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL || 'OpenTracking Live <onboarding@resend.dev>',
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`Email send failed to ${to}: ${err}`);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error(`Email send error: ${err.message}`);
    return false;
  }
}

// ── Push notification sender ───────────────────────────────────────────────

async function sendPush(
  endpoint: string, p256dh: string, auth: string, payload: object
): Promise<boolean | 'expired'> {
  try {
    await webpush.sendNotification(
      { endpoint, keys: { p256dh, auth } },
      JSON.stringify(payload)
    );
    return true;
  } catch (err: any) {
    console.error(`Push send failed: ${err.message}`);
    // 410 Gone or 404 = subscription expired/invalid
    if (err.statusCode === 410 || err.statusCode === 404) {
      return 'expired';
    }
    return false;
  }
}

// ── Email template ─────────────────────────────────────────────────────────

function buildEmailHtml(
  runner: Runner,
  eventName: string,
  eventCode: string,
  genderClass: string,
  positions: Positions,
  ageGroup: string,
  trackUrl: string,
  unsubUrl: string
): string {
  const isFinished = runner.fin === 1;
  const cpLabel = isFinished ? '🏁 FINISHED' : `📍 ${runner.lc}`;

  return `
<div style="font-family:system-ui,-apple-system,sans-serif;max-width:500px;margin:0 auto;background:#1d232a;border-radius:12px;overflow:hidden;">
  <div style="background:${isFinished ? '#166534' : '#2a323c'};padding:20px 24px;text-align:center;">
    <div style="font-size:14px;color:#a6adba;margin-bottom:4px;">${eventName}</div>
    <div style="font-size:22px;font-weight:bold;color:#fff;">${runner.n} (#${runner.r})</div>
    <div style="font-size:16px;color:${isFinished ? '#86efac' : '#7480ff'};margin-top:6px;font-weight:600;">${cpLabel}</div>
  </div>

  <div style="padding:20px 24px;">
    <div style="background:#2a323c;border-radius:8px;padding:14px;margin-bottom:16px;text-align:center;">
      <div style="font-size:12px;color:#a6adba;text-transform:uppercase;letter-spacing:1px;">Elapsed Time</div>
      <div style="font-size:28px;font-weight:bold;color:#fff;margin-top:4px;">⏱️ ${runner.t || 'N/A'}</div>
    </div>

    <table style="width:100%;border-collapse:separate;border-spacing:6px 0;" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:12px 8px;background:#2a323c;border-radius:8px;text-align:center;width:33%;">
          <div style="font-size:11px;color:#a6adba;">🎯 ${ageGroup}</div>
          <div style="font-size:18px;font-weight:bold;color:#fff;margin-top:2px;">${positions.ageGroupPos} / ${positions.ageGroupTotal}</div>
        </td>
        <td style="padding:12px 8px;background:#2a323c;border-radius:8px;text-align:center;width:33%;">
          <div style="font-size:11px;color:#a6adba;">👤 ${genderClass}</div>
          <div style="font-size:18px;font-weight:bold;color:#fff;margin-top:2px;">${positions.genderPos} / ${positions.genderTotal}</div>
        </td>
        <td style="padding:12px 8px;background:#2a323c;border-radius:8px;text-align:center;width:33%;">
          <div style="font-size:11px;color:#a6adba;">🏆 Overall</div>
          <div style="font-size:18px;font-weight:bold;color:#fff;margin-top:2px;">${positions.overallPos} / ${positions.overallTotal}</div>
        </td>
      </tr>
    </table>

    <div style="margin-top:20px;text-align:center;">
      <a href="${trackUrl}" style="display:inline-block;background:#7480ff;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
        Track Live 📍
      </a>
    </div>

    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #374151;text-align:center;font-size:11px;color:#6b7280;">
      <a href="${unsubUrl}" style="color:#6b7280;text-decoration:underline;">Unsubscribe from notifications</a>
    </div>
  </div>
</div>`;
}

// ── Main handler ───────────────────────────────────────────────────────────

export default async function handler(req: any, res: any) {
  // Verify secret
  const secret = req.query.secret || req.headers['x-cron-secret'];
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Configure web-push VAPID
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:noreply@opentracking-live-tracker.vercel.app',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  }

  try {
    // Get all active subscriptions
    const { rows: subscriptions } = await sql`
      SELECT * FROM subscriptions WHERE active = TRUE
    `;

    if (subscriptions.length === 0) {
      return res.status(200).json({ message: 'No active subscriptions', processed: 0 });
    }

    // Group by event_code + bib_number to avoid duplicate API calls
    const groups: Record<string, typeof subscriptions> = {};
    for (const sub of subscriptions) {
      const key = `${sub.event_code}::${sub.bib_number}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(sub);
    }

    const results: any[] = [];
    const baseUrl = process.env.BASE_URL || 'https://opentracking-live-tracker.vercel.app';

    for (const [key, subs] of Object.entries(groups)) {
      const [eventCode, bibStr] = key.split('::');
      const bibNumber = parseInt(bibStr, 10);

      try {
        // Fetch race data directly from OpenTracking (no CORS issues server-side)
        const [teamsRes, cpRes, configRes] = await Promise.all([
          fetch(`${OPENTRACKING_BASE}/${eventCode}/data/teams.json`),
          fetch(`${OPENTRACKING_BASE}/${eventCode}/data/checkpoints.json`),
          fetch(`${OPENTRACKING_BASE}/${eventCode}/data/config.json`),
        ]);

        if (!teamsRes.ok || !cpRes.ok) {
          results.push({ key, error: `API returned ${teamsRes.status}/${cpRes.status}` });
          continue;
        }

        const teamsData = await teamsRes.json();
        const cpData = await cpRes.json();
        const configData = await configRes.json();

        // Find the runner
        let runner: Runner | null = null;
        let genderClass = '';
        for (const cls of teamsData.data) {
          for (const t of cls.teams) {
            if (t.r === bibNumber) {
              runner = t;
              genderClass = cls.classname;
              break;
            }
          }
          if (runner) break;
        }

        if (!runner) {
          results.push({ key, error: 'Runner not found' });
          continue;
        }

        const checkpointOrder: string[] = cpData.data.map((cp: any) => cp.n);
        const currentCheckpoint = runner.lc || '';
        const eventName = configData.name || eventCode;
        const ageGroup = runner.ag || runner.g || 'N/A';

        if (!currentCheckpoint) {
          results.push({ key, status: 'no checkpoint yet' });
          continue;
        }

        // Compute positions once for this runner
        const positions = computePositions(runner, teamsData.data, checkpointOrder, genderClass);
        const isFinished = runner.fin === 1;
        const trackUrl = `${baseUrl}/${eventCode}/${bibNumber}`;

        const subject = isFinished
          ? `🏁 ${runner.n} has FINISHED — ${eventName}`
          : `🏃 ${runner.n} reached ${currentCheckpoint} — ${eventName}`;

        const pushBody = isFinished
          ? `🏁 FINISHED • Time: ${runner.t || 'N/A'} • Overall: ${positions.overallPos}/${positions.overallTotal}`
          : `📍 ${currentCheckpoint} • Time: ${runner.t || 'N/A'} • Overall: ${positions.overallPos}/${positions.overallTotal}`;

        // Process each subscription
        for (const sub of subs) {
          // Skip if already notified for this checkpoint
          if (sub.last_notified_checkpoint === currentCheckpoint) {
            continue;
          }

          const unsubUrl = `${baseUrl}/api/unsubscribe?token=${sub.unsubscribe_token}`;
          let emailSent = false;
          let pushSent = false;

          // Send email notification
          if (sub.email) {
            const html = buildEmailHtml(
              runner, eventName, eventCode, genderClass,
              positions, ageGroup, trackUrl, unsubUrl
            );
            emailSent = await sendEmail(sub.email, subject, html);
          }

          // Send push notification
          if (sub.push_endpoint && process.env.VAPID_PUBLIC_KEY) {
            const pushResult = await sendPush(
              sub.push_endpoint, sub.push_p256dh, sub.push_auth,
              {
                title: subject,
                body: pushBody,
                url: trackUrl,
                icon: '/icon-192.png',
              }
            );

            if (pushResult === 'expired') {
              // Deactivate expired push subscription
              await sql`UPDATE subscriptions SET active = FALSE WHERE id = ${sub.id}`;
              results.push({ sub_id: sub.id, status: 'push_expired_deactivated' });
              continue;
            }
            pushSent = pushResult === true;
          }

          // Update last notified checkpoint
          await sql`
            UPDATE subscriptions
            SET last_notified_checkpoint = ${currentCheckpoint}
            WHERE id = ${sub.id}
          `;

          results.push({
            sub_id: sub.id,
            checkpoint: currentCheckpoint,
            email: emailSent,
            push: pushSent,
          });
        }
      } catch (err: any) {
        results.push({ key, error: err.message });
      }
    }

    return res.status(200).json({
      processed: Object.keys(groups).length,
      subscriptions: subscriptions.length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Cron error:', err);
    return res.status(500).json({ error: err.message });
  }
}
