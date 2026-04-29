export default async function handler(req, res) {
  const segments = Array.isArray(req.query.path) ? req.query.path : [req.query.path];
  const url = new URL('https://api.getklar.com/' + segments.join('/'));

  for (const [k, v] of Object.entries(req.query)) {
    if (k !== 'path') url.searchParams.append(k, String(v));
  }

  const headers = {};
  if (req.headers['authorization']) headers['Authorization'] = req.headers['authorization'];
  if (req.headers['token']) headers['token'] = req.headers['token'];
  if (req.method !== 'GET') headers['Content-Type'] = 'application/json';

  const upstream = await fetch(url.toString(), {
    method: req.method,
    headers,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
  });

  const data = await upstream.json();
  res.status(upstream.status).json(data);
}
