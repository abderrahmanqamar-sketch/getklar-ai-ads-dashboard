export default async function handler(req, res) {
  const url = new URL('https://api.getklar.com/public/attribution');
  const { startDate, endDate, metric, window, date_breakdown } = req.query;
  if (startDate)      url.searchParams.append('startDate',      startDate);
  if (endDate)        url.searchParams.append('endDate',        endDate);
  if (metric)         url.searchParams.append('metric',         metric);
  if (window)         url.searchParams.append('window',         window);
  if (date_breakdown) url.searchParams.append('date_breakdown', date_breakdown);

  const upstream = await fetch(url.toString(), {
    headers: {
      'Authorization': req.headers['authorization'] || '',
    },
  });
  const data = await upstream.json();
  res.status(upstream.status).json(data);
}
