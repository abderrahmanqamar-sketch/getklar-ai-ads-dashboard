export default async function handler(req, res) {
  const url = new URL('https://api.getklar.com/public/attribution');
  const { startDate, endDate } = req.query;
  if (startDate) url.searchParams.append('startDate', startDate);
  if (endDate) url.searchParams.append('endDate', endDate);

  const upstream = await fetch(url.toString(), {
    headers: {
      'Authorization': req.headers['authorization'] || '',
    },
  });
  const data = await upstream.json();
  res.status(upstream.status).json(data);
}
