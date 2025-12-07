import express from 'express';
import { prisma } from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { CALENDAR_SCOPES, generateState, getOAuthClient, getRedirectUri, googleConfigReady, verifyState } from '../utils/googleOAuth.js';

const router = express.Router();

function sendCallbackPage(res, ok, message) {
  const safe = String(message || '');
  const status = ok ? 200 : 400;
  res.status(status).send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Google Calendar Connection</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 40px; color: #111827; }
      .card { max-width: 460px; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.05); }
      .title { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
      .msg { color: #374151; margin-bottom: 16px; white-space: pre-wrap; }
      .ok { color: #059669; }
      .error { color: #dc2626; }
      button { padding: 10px 14px; border-radius: 10px; border: 1px solid #d1d5db; background: #fff; cursor: pointer; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="title ${ok ? 'ok' : 'error'}">${ok ? 'Connected to Google Calendar' : 'Google Calendar Error'}</div>
      <div class="msg">${safe}</div>
      <button onclick="window.close()">Close</button>
    </div>
    <script>
      if (window.opener) {
        window.opener.postMessage({ source:'sapphire', type:'google-calendar', ok:${ok ? 'true' : 'false'}, message:${JSON.stringify(safe)} }, '*');
      }
    </script>
  </body>
</html>`);
}

router.get('/calendar/status', requireAuth, async (req, res) => {
  try {
    const account = await prisma.googleAccount.findUnique({ where: { userId: req.user.id } });
    return res.json({
      connected: !!account,
      email: account?.googleEmail || null,
      redirectUri: getRedirectUri()
    });
  } catch (err) {
    console.error('GET /api/google/calendar/status failed:', err);
    return res.status(500).json({ error: 'Unable to load Google Calendar status.' });
  }
});

router.get('/calendar/auth-url', requireAuth, (req, res) => {
  if (!googleConfigReady()) {
    return res.status(503).json({ error: 'Google Calendar is not configured on the server.' });
  }
  const client = getOAuthClient();
  if (!client) return res.status(503).json({ error: 'Google client is not available.' });
  const state = generateState(req.user.id);
  const url = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: CALENDAR_SCOPES,
    state
  });
  return res.json({ url });
});

router.get('/calendar/callback', async (req, res) => {
  if (!googleConfigReady()) {
    return sendCallbackPage(res, false, 'Google Calendar is not configured on the server.');
  }
  const { code, state, error } = req.query || {};
  if (error) {
    return sendCallbackPage(res, false, `Google returned an error: ${error}`);
  }
  if (!code || !state) {
    return sendCallbackPage(res, false, 'Missing code or state from Google.');
  }

  const stateInfo = verifyState(String(state));
  if (!stateInfo) return sendCallbackPage(res, false, 'Invalid or expired state; please start again from the app.');

  const client = getOAuthClient();
  if (!client) return sendCallbackPage(res, false, 'Google client is not available.');

  try {
    const tokenResult = await client.getToken(String(code));
    const tokens = tokenResult?.tokens || {};
    client.setCredentials(tokens);

    let tokenInfo = null;
    if (tokens.id_token) {
      try {
        const ticket = await client.verifyIdToken({ idToken: tokens.id_token });
        tokenInfo = ticket.getPayload();
      } catch (_err) { tokenInfo = null; }
    }
    if (!tokenInfo && tokens.access_token) {
      try { tokenInfo = await client.getTokenInfo(tokens.access_token); } catch (_err) { tokenInfo = null; }
    }

    const googleEmail = tokenInfo?.email || null;
    const refreshToken = tokens.refresh_token || null;
    const accessToken = tokens.access_token || null;
    const expiry = tokens.expiry_date ? new Date(tokens.expiry_date) : null;

    let targetUser = req.user;
    if (!targetUser) {
      targetUser = await prisma.user.findUnique({ where: { id: stateInfo.userId } });
    }
    if (!targetUser) return sendCallbackPage(res, false, 'Session expired. Please start the connection again.');

    const existing = await prisma.googleAccount.findUnique({ where: { userId: targetUser.id } });
    const finalRefresh = refreshToken || existing?.refreshToken || null;
    if (!finalRefresh) {
      return sendCallbackPage(res, false, 'Google did not return a refresh token. Try again with the consent screen.');
    }

    await prisma.googleAccount.upsert({
      where: { userId: targetUser.id },
      create: {
        userId: targetUser.id,
        googleEmail: googleEmail || targetUser.email,
        refreshToken: finalRefresh,
        accessToken: accessToken || null,
        accessTokenExpires: expiry || null
      },
      update: {
        googleEmail: googleEmail || existing?.googleEmail || targetUser.email,
        refreshToken: finalRefresh,
        accessToken: accessToken || accessToken === null ? accessToken : existing?.accessToken || null,
        accessTokenExpires: expiry || null
      }
    });

    return sendCallbackPage(res, true, 'You can close this tab and return to Sapphire.');
  } catch (err) {
    console.error('GET /api/google/calendar/callback failed:', err);
    return sendCallbackPage(res, false, 'Could not complete Google authorization. Please try again.');
  }
});

function parseDateParam(value, fallback) {
  if (!value) return fallback;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toISOString();
}

router.get('/calendar/events', requireAuth, async (req, res) => {
  if (!googleConfigReady()) {
    return res.status(503).json({ error: 'Google Calendar is not configured on the server.' });
  }
  try {
    const account = await prisma.googleAccount.findUnique({ where: { userId: req.user.id } });
    if (!account) return res.status(404).json({ error: 'Google Calendar is not connected for this user.' });

    const client = getOAuthClient();
    if (!client) return res.status(503).json({ error: 'Google client is not available.' });
    client.setCredentials({ refresh_token: account.refreshToken });

    const accessTokenResult = await client.getAccessToken();
    const accessToken = typeof accessTokenResult === 'string' ? accessTokenResult : accessTokenResult?.token;
    const expiryMs = client.credentials?.expiry_date;
    if (accessToken || expiryMs) {
      await prisma.googleAccount.update({
        where: { userId: req.user.id },
        data: {
          accessToken: accessToken || null,
          accessTokenExpires: expiryMs ? new Date(expiryMs) : null
        }
      }).catch(() => {});
    }
    if (!accessToken) {
      return res.status(401).json({ error: 'Google access token missing; please reconnect.' });
    }

    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
    const timeMin = parseDateParam(req.query?.timeMin, defaultStart);
    const timeMax = parseDateParam(req.query?.timeMax, defaultEnd);

    const resp = await client.request({
      url: 'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      params: {
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 250
      }
    });

    const events = (resp?.data?.items || []).filter(e => e && e.status !== 'cancelled').map(ev => {
      const startRaw = ev.start?.dateTime || ev.start?.date || null;
      const endRaw = ev.end?.dateTime || ev.end?.date || null;
      const startIso = startRaw ? new Date(startRaw).toISOString() : null;
      const endIso = endRaw ? new Date(endRaw).toISOString() : null;
      const startDate = ev.start?.date || (startIso ? startIso.slice(0, 10) : null);
      const endDate = ev.end?.date || (endIso ? endIso.slice(0, 10) : null);
      return {
        id: ev.id,
        summary: ev.summary || '(No title)',
        start: startIso,
        end: endIso,
        startDate,
        endDate,
        isAllDay: !!(ev.start?.date && !ev.start?.dateTime),
        htmlLink: ev.htmlLink || null,
        creatorEmail: ev.creator?.email || ev.organizer?.email || null,
        calendarEmail: account.googleEmail,
        status: ev.status || 'confirmed'
      };
    });

    return res.json({ events, timeMin, timeMax, connectedEmail: account.googleEmail });
  } catch (err) {
    console.error('GET /api/google/calendar/events failed:', err?.response?.data || err);
    const status = (err?.response?.status && Number.isFinite(err.response.status)) ? err.response.status : 500;
    if (status === 401 || status === 403) {
      return res.status(401).json({ error: 'Google token expired or revoked. Please reconnect Google Calendar.' });
    }
    return res.status(500).json({ error: 'Unable to fetch Google Calendar events.' });
  }
});

export default router;
