// api/options.js — Vercel serverless function
// Fetches real options chain data from Yahoo Finance
// Returns ATM strike data: OI, bid/ask, delta, IV, spread%, volume

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  const { symbol, price } = req.query;
  if (!symbol) { res.status(400).json({ error: "symbol required" }); return; }

  // Try multiple Yahoo Finance endpoints with different headers
  async function fetchYahoo(url) {
    const headerSets = [
      {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Origin": "https://finance.yahoo.com",
        "Referer": "https://finance.yahoo.com/quote/" + symbol + "/options/",
        "Cache-Control": "no-cache"
      },
      {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://finance.yahoo.com/"
      }
    ];

    for (const headers of headerSets) {
      try {
        const r = await fetch(url, { headers });
        if (r.ok) {
          const data = await r.json();
          if (data?.optionChain?.result?.[0]) return data;
        }
      } catch(e) { continue; }
    }

    // Try query2 as fallback
    const altUrl = url.replace("query1.finance.yahoo.com", "query2.finance.yahoo.com");
    try {
      const r = await fetch(altUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json",
          "Referer": "https://finance.yahoo.com/"
        }
      });
      if (r.ok) {
        const data = await r.json();
        if (data?.optionChain?.result?.[0]) return data;
      }
    } catch(e) {}

    return null;
  }

  try {
    // Step 1: Get available expiration dates
    const metaUrl = "https://query1.finance.yahoo.com/v7/finance/options/" + symbol;
    const metaData = await fetchYahoo(metaUrl);

    if (!metaData) {
      res.status(200).json({ error: "Yahoo Finance unavailable", symbol: symbol });
      return;
    }

    const result = metaData?.optionChain?.result?.[0];
    if (!result) {
      res.status(200).json({ error: "No options data", symbol: symbol });
      return;
    }

    // Step 2: Find best expiration — 3-7 days out ideally
    const expirations = result.expirationDates || [];
    const now = Math.floor(Date.now() / 1000);
    const threeDays = 3 * 86400;
    const sevenDays = 7 * 86400;
    const fourteenDays = 14 * 86400;

    let targetExp = expirations.find(function(e) {
      var diff = e - now;
      return diff >= threeDays && diff <= sevenDays;
    });
    if (!targetExp) {
      targetExp = expirations.find(function(e) {
        var diff = e - now;
        return diff >= threeDays && diff <= fourteenDays;
      });
    }
    if (!targetExp && expirations.length > 0) targetExp = expirations[0];
    if (!targetExp) {
      res.status(200).json({ error: "No suitable expiration found", symbol: symbol });
      return;
    }

    // Step 3: Fetch the chain for that expiration
    const chainUrl = "https://query1.finance.yahoo.com/v7/finance/options/" + symbol + "?date=" + targetExp;
    const chainData = await fetchYahoo(chainUrl);

    if (!chainData) {
      res.status(200).json({ error: "Chain fetch failed", symbol: symbol });
      return;
    }

    const chainResult = chainData?.optionChain?.result?.[0];
    if (!chainResult) {
      res.status(200).json({ error: "No chain result", symbol: symbol });
      return;
    }

    const spotPrice = chainResult.quote?.regularMarketPrice || parseFloat(price) || 0;
    const calls = chainResult.options?.[0]?.calls || [];
    const puts = chainResult.options?.[0]?.puts || [];

    // Step 4: Find ATM strike
    function findATM(contracts, spot) {
      if (!contracts.length || !spot) return null;
      return contracts.reduce(function(best, c) {
        if (!best) return c;
        return Math.abs(c.strike - spot) < Math.abs(best.strike - spot) ? c : best;
      }, null);
    }

    const atmCall = findATM(calls, spotPrice);
    const atmPut = findATM(puts, spotPrice);

    // Step 5: Analyze contract
    function analyzeContract(contract, type) {
      if (!contract) return null;
      var bid = contract.bid || 0;
      var ask = contract.ask || 0;
      var spread = ask - bid;
      var midpoint = (bid + ask) / 2;
      var spreadPct = midpoint > 0 ? (spread / midpoint) * 100 : 999;
      var oi = contract.openInterest || 0;
      var vol = contract.volume || 0;
      var iv = contract.impliedVolatility ? (contract.impliedVolatility * 100).toFixed(1) : null;
      var delta = contract.delta ? contract.delta.toFixed(2) : null;
      var theta = contract.theta ? contract.theta.toFixed(4) : null;
      var gamma = contract.gamma ? contract.gamma.toFixed(4) : null;
      var liquidityOk = oi >= 200 && spread <= 0.30;
      var score = 0;
      if (oi >= 500) score += 30; else if (oi >= 100) score += 15;
      if (spread <= 0.05) score += 25; else if (spread <= 0.15) score += 15; else if (spread <= 0.30) score += 5;
      if (vol >= 500) score += 20; else if (vol >= 100) score += 10;
      if (spreadPct < 5) score += 15; else if (spreadPct < 10) score += 8;
      if (iv && parseFloat(iv) > 0) score += 10;
      return {
        type: type,
        strike: contract.strike,
        expiry: new Date(targetExp * 1000).toISOString().split("T")[0],
        daysToExpiry: Math.ceil((targetExp - now) / 86400),
        bid: bid.toFixed(2),
        ask: ask.toFixed(2),
        spread: spread.toFixed(2),
        spreadPct: spreadPct.toFixed(1),
        midpoint: midpoint.toFixed(2),
        openInterest: oi,
        volume: vol,
        impliedVolatility: iv,
        delta: delta,
        theta: theta,
        gamma: gamma,
        liquidityOk: liquidityOk,
        liquidityScore: score,
        liquidityGrade: score >= 70 ? "EXCELLENT" : score >= 50 ? "GOOD" : score >= 30 ? "FAIR" : "POOR",
        estimatedCost: midpoint > 0 ? "$" + (midpoint * 100).toFixed(0) + " per contract" : "unknown"
      };
    }

    const callData = analyzeContract(atmCall, "CALL");
    const putData = analyzeContract(atmPut, "PUT");

    function getOTMOptions(contracts, spot, type, count) {
      if (!contracts.length || !spot) return [];
      var sorted = contracts.slice().sort(function(a, b) {
        return type === "CALL" ? a.strike - b.strike : b.strike - a.strike;
      });
      var otm = sorted.filter(function(c) {
        return type === "CALL" ? c.strike > spot : c.strike < spot;
      });
      return otm.slice(0, count).map(function(c) {
        return {
          strike: c.strike,
          bid: (c.bid || 0).toFixed(2),
          ask: (c.ask || 0).toFixed(2),
          oi: c.openInterest || 0,
          iv: c.impliedVolatility ? (c.impliedVolatility * 100).toFixed(1) + "%" : "n/a"
        };
      });
    }

    var totalCallOI = calls.reduce(function(s, c) { return s + (c.openInterest || 0); }, 0);
    var totalPutOI = puts.reduce(function(s, c) { return s + (c.openInterest || 0); }, 0);
    var stockPCRatio = totalCallOI > 0 ? (totalPutOI / totalCallOI).toFixed(2) : null;
    var avgCallIV = calls.length > 0
      ? (calls.reduce(function(s, c) { return s + (c.impliedVolatility || 0); }, 0) / calls.length * 100).toFixed(1)
      : null;

    res.status(200).json({
      symbol: symbol,
      spotPrice: spotPrice,
      targetExpiry: new Date(targetExp * 1000).toISOString().split("T")[0],
      daysToExpiry: Math.ceil((targetExp - now) / 86400),
      atmCall: callData,
      atmPut: putData,
      otmCalls: getOTMOptions(calls, spotPrice, "CALL", 2),
      otmPuts: getOTMOptions(puts, spotPrice, "PUT", 2),
      stockPCRatio: stockPCRatio,
      avgCallIV: avgCallIV ? avgCallIV + "%" : null,
      totalCallOI: totalCallOI,
      totalPutOI: totalPutOI,
      dataSource: "Yahoo Finance (real chain data)",
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    res.status(200).json({
      error: err.message,
      symbol: symbol,
      dataSource: "failed"
    });
  }
}
