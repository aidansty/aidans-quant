// api/db.js — Vercel serverless function
// Handles all persistent storage for Aidan's War Room
// Uses Upstash Redis via KV REST API — data survives deploys, device switches, cache clears

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  var url = process.env.KV_REST_API_URL;
  var token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    res.status(500).json({ error: "Database not configured. Check KV_REST_API_URL and KV_REST_API_TOKEN in Vercel environment variables." });
    return;
  }

  try {
    // GET — load all data at once on dashboard startup
    if (req.method === "GET") {
      var keys = ["op3", "tr3", "ca3", "ch3", "sr3", "rg3", "oi3", "sj3"];
      var results = {};
      // Fetch all keys in parallel
      await Promise.all(keys.map(async function(key) {
        try {
          var r = await fetch(url + "/get/" + key, {
            headers: { Authorization: "Bearer " + token }
          });
          var d = await r.json();
          results[key] = d.result || null;
        } catch(e) {
          results[key] = null;
        }
      }));
      res.status(200).json({ success: true, data: results });
      return;
    }

    // POST — save a single key
    if (req.method === "POST") {
      var body = req.body;
      if (!body || !body.key || body.value === undefined) {
        res.status(400).json({ error: "key and value required" });
        return;
      }
      var saveKey = body.key;
      var saveValue = typeof body.value === "string" ? body.value : JSON.stringify(body.value);
      var r = await fetch(url + "/set/" + saveKey, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(saveValue)
      });
      var d = await r.json();
      if (d.result === "OK") {
        res.status(200).json({ success: true, key: saveKey });
      } else {
        res.status(500).json({ error: "Save failed", detail: d });
      }
      return;
    }

    res.status(405).json({ error: "Method not allowed" });

  } catch(err) {
    res.status(500).json({ error: err.message });
  }
}
