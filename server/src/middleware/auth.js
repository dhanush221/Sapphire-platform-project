export function authFromHeaders(req, _res, next) {
  const role = String(req.header('x-user-role') || 'student').toLowerCase();
  const email = req.header('x-user-email') || null;
  req.user = { role: role === 'supervisor' ? 'supervisor' : 'student', email };
  next();
}

