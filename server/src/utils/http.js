export function parseCookies(req) {
  const header = req.headers?.cookie || '';
  return header.split(';').map(v => v.trim()).filter(Boolean).reduce((acc, pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return acc;
    const key = decodeURIComponent(pair.slice(0, idx));
    const val = decodeURIComponent(pair.slice(idx + 1));
    acc[key] = val;
    return acc;
  }, {});
}

export function setSessionCookie(res, token, expiresAt) {
  const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';
  res.cookie('sapphire_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    expires: expiresAt ? new Date(expiresAt) : undefined,
    path: '/'
  });
}

export function clearSessionCookie(res) {
  res.clearCookie('sapphire_session', { path: '/' });
}
