export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  const { symbols } = req.query;
  if (!symbols) { res.status(400).json({ error: "No symbols" }); return; }

  const syms = symbols.split(",");
  const results = {};

  await Promise.all(syms.map(async (sym) => {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=2d`;
      const r = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json",
        }
      });
      const d = await r.json();
      const m = d?.chart?.result?.[0]?.meta;
      if (m && m.regularMarketPrice) {
        const c = m.regularMarketPrice;
        const p = m.chartPreviousClose || m.previousClose || c;
        results[sym] = {
          price: c,
          change: p ? ((c - p) / p) * 100 : 0,
          high: m.regularMarketDayHigh || c,
          low: m.regularMarketDayLow || c,
          volume: m.regularMarketVolume || 0,
          prev: p
        };
      }
    } catch (e) {}
  }));

  res.status(200).json(results);
}
