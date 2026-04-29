export default async function handler(req, res) {
  const upstream = await fetch('https://api.getklar.com/public/auth/token', {
    method: 'POST',
    headers: {
      'token': req.headers['token'] || '',
    },
  });
  const data = await upstream.json();
  res.status(upstream.status).json(data);
}
