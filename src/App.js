/* eslint-disable */
import React, { useState, useEffect } from "react";

const STARTING_CASH = 250;

const WOLF_PROMPT = function(sym) {
  return "You are Agent Wolf - a Warren Buffett-style fundamental analyst. Analyze "+sym+" fundamentals to determine if they support a SHORT-TERM OPTIONS PLAY (1-5 days).\n"
    + "Search for: P/E ratio, revenue growth, earnings history, profit margins, debt, free cash flow, upcoming earnings date.\n"
    + "Your job: are the fundamentals strong enough to justify buying a call or put option on "+sym+" right now?\n"
    + "Respond in pure JSON only:\n"
    + "{\"direction\":\"BUY\",\"conviction\":0.8,\"entry\":750,\"target\":850,\"stop\":695,"
    + "\"reasoning\":\"Strong fundamentals support bullish options play\",\"horizon_days\":3,"
    + "\"option_type\":\"CALL\",\"option_strike\":760,\"option_expiry\":\"3-5 days\",\"option_premium_est\":\"$2.50-$4.00\"}";
};

const COHEN_PROMPT = function(sym, price, chainData) {
  var hasChain = chainData && !chainData.error;
  var chainSection = "";
  if (hasChain) {
    var atm = chainData.atmCall || chainData.atmPut || {};
    var callInfo = chainData.atmCall;
    var putInfo = chainData.atmPut;
    chainSection = "\n\n=== REAL OPTIONS CHAIN DATA (Yahoo Finance — verified, not estimated) ===\n"
      + "Symbol: " + sym + " | Spot: $" + (chainData.spotPrice||"?") + "\n"
      + "Target Expiry: " + (chainData.targetExpiry||"?") + " (" + (chainData.daysToExpiry||"?") + " days out)\n"
      + "Stock Put/Call Ratio: " + (chainData.stockPCRatio||"?") + "\n"
      + "Avg Call IV: " + (chainData.avgCallIV||"?") + "\n"
      + (callInfo ? (
          "ATM CALL — Strike: $" + callInfo.strike
          + " | Bid: $" + callInfo.bid + " | Ask: $" + callInfo.ask
          + " | Spread: $" + callInfo.spread + " (" + callInfo.spreadPct + "%)"
          + " | OI: " + callInfo.openInterest
          + " | Volume: " + callInfo.volume
          + " | IV: " + (callInfo.impliedVolatility||"?") + "%"
          + " | Delta: " + (callInfo.delta||"?")
          + " | Theta: " + (callInfo.theta||"?")
          + " | Liquidity: " + callInfo.liquidityGrade
          + " | Est cost: " + callInfo.estimatedCost + "\n"
        ) : "")
      + (putInfo ? (
          "ATM PUT  — Strike: $" + putInfo.strike
          + " | Bid: $" + putInfo.bid + " | Ask: $" + putInfo.ask
          + " | Spread: $" + putInfo.spread + " (" + putInfo.spreadPct + "%)"
          + " | OI: " + putInfo.openInterest
          + " | Volume: " + putInfo.volume
          + " | IV: " + (putInfo.impliedVolatility||"?") + "%"
          + " | Delta: " + (putInfo.delta||"?")
          + " | Theta: " + (putInfo.theta||"?")
          + " | Liquidity: " + putInfo.liquidityGrade
          + " | Est cost: " + putInfo.estimatedCost + "\n"
        ) : "")
      + (chainData.otmCalls && chainData.otmCalls.length ? (
          "OTM Calls: " + chainData.otmCalls.map(function(c){ return "$"+c.strike+" (OI:"+c.oi+",IV:"+c.iv+")"; }).join(" | ") + "\n"
        ) : "")
      + (chainData.otmPuts && chainData.otmPuts.length ? (
          "OTM Puts: " + chainData.otmPuts.map(function(c){ return "$"+c.strike+" (OI:"+c.oi+",IV:"+c.iv+")"; }).join(" | ") + "\n"
        ) : "")
      + "=== END REAL CHAIN DATA ===\n"
      + "IMPORTANT: Use the REAL numbers above for your JSON output. Do NOT estimate or hallucinate options metrics. "
      + "If OI is below 500 or spread is above $0.15, set liquidity_ok to false regardless of other factors.\n";
  } else {
    chainSection = "\n\nNOTE: Real options chain data unavailable for " + sym + ". "
      + "Search the web for current options chain data. Be conservative with liquidity estimates — "
      + "if you cannot confirm OI above 500 and spread under $0.15, set liquidity_ok to false.\n";
  }
  return "You are Agent Cohen - an elite technical analyst focused on OPTIONS TIMING. Your job is to identify the exact technical setup for a 1-5 day options play on "+sym+".\n"
    + "Current price data: "+price
    + chainSection + "\n"
    + "Search for: RSI (14-day), MACD, 20/50-day moving averages, volume, support/resistance, Bollinger Bands.\n"
    + "Your job: technicals analysis ONLY. The options chain data above is already verified — use those exact numbers in your JSON.\n"
    + "Key question: Is the technical setup right to enter RIGHT NOW?\n"
    + "Respond in pure JSON only:\n"
    + "{\"direction\":\"BUY\",\"conviction\":0.8,\"entry\":750,\"target\":800,\"stop\":720,"
    + "\"reasoning\":\"MACD bullish crossover, RSI not overbought, breaking resistance\",\"horizon_days\":3,"
    + "\"rsi\":45,\"macd\":\"bullish crossover\",\"ma_position\":\"above 20MA and 50MA\","
    + "\"key_support\":720,\"key_resistance\":800,"
    + "\"option_type\":\"CALL\",\"option_strike\":755,\"option_expiry\":\"3-5 days\",\"option_premium_est\":\"$2.00-$3.50\","
    + "\"delta\":0.45,\"open_interest\":1500,\"bid_ask_spread\":\"$0.05\",\"liquidity_ok\":true,"
    + "\"theta_daily\":\"$0.08\",\"days_to_expiry\":4}";
};

const DALIO_PROMPT = function(sym, price) {
  return "You are Agent Dalio - an institutional options flow specialist. You track where big money is placing options bets right now.\n"
    + "Current price data for "+sym+": "+price+"\n\n"
    + "Search for: unusual options activity on "+sym+" last 48 hours, sector rotation flows, institutional positioning, relative strength vs SPY.\n"
    + "Key question: Are institutions placing big call or put bets on "+sym+" right now? Follow the smart money.\n"
    + "Respond in pure JSON only:\n"
    + "{\"direction\":\"BUY\",\"conviction\":0.8,\"entry\":750,\"target\":820,\"stop\":710,"
    + "\"reasoning\":\"Unusual call volume 3x average, institutions accumulating\",\"horizon_days\":3,"
    + "\"sector_flow\":\"INFLOW\",\"options_signal\":\"BULLISH - unusual call volume 3x average\","
    + "\"relative_strength\":\"outperforming SPY by 2.3 percent\","
    + "\"option_type\":\"CALL\",\"option_strike\":755,\"option_expiry\":\"3-5 days\",\"option_premium_est\":\"$2.50-$4.00\"}";
};

const ACKMAN_PROMPT = function(sym) {
  return "You are Agent Ackman - an activist investor. You track insider transactions and fundamental quality for OPTIONS PLAYS.\n"
    + "Search for: "+sym+" SEC Form 4 insider filings last 90 days, CEO/CFO/Director buying or selling.\n"
    + "Key question: Is insider activity bullish or bearish enough to justify an options play right now?\n"
    + "Respond in pure JSON only:\n"
    + "{\"direction\":\"BUY\",\"conviction\":0.85,\"entry\":750,\"target\":900,\"stop\":690,"
    + "\"reasoning\":\"CEO buying own stock signals confidence\",\"horizon_days\":5,"
    + "\"insider_signal\":\"BUYING\",\"insider_detail\":\"CEO purchased shares recently\","
    + "\"option_type\":\"CALL\",\"option_strike\":760,\"option_expiry\":\"5-7 days\",\"option_premium_est\":\"$3.00-$5.00\"}";
};

const BRIEFING_PROMPT = function() {
  var today = new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
  return "You are the Head Macro Analyst at an asymmetric AI hedge fund. Today: "+today+".\n\n"
    + "Deliver a pure macro market briefing. No stock picks. No trade ideas. No individual tickers.\n\n"
    + "Search the web for current market conditions and deliver:\n\n"
    + "MARKET OVERVIEW\n"
    + "Overall market direction and sentiment today. Bull or bear bias. What is the S&P 500 doing.\n\n"
    + "MACRO DRIVERS\n"
    + "The 2-3 biggest forces driving markets right now. Fed policy, inflation, geopolitical events, dollar, yields, oil.\n\n"
    + "KEY EVENTS THIS WEEK\n"
    + "Every major event that could move markets. Format: Date | Event | UP or DOWN impact.\n\n"
    + "SECTOR ROTATION\n"
    + "Which sectors are hot and which are being sold. Where is institutional money flowing.\n\n"
    + "RISK FACTORS\n"
    + "Top 3 risks that could cause a major market move this week.\n\n"
    + "OPTIONS ENVIRONMENT\n"
    + "Is this a good week for buying calls, puts, or staying in cash? Is implied volatility high or low? What type of options plays work best in this environment - momentum, event-driven, mean reversion?\n\n"
    + "RULES: Web search first. Specific numbers and dates. No stock picks. Pure macro context only.";
};

const SCANNER_CANDIDATES_PROMPT = function(liveStr, regimeData, accountCash) {
  var today = new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
  var regime = regimeData ? (regimeData.regime || "UNKNOWN") : "UNKNOWN";
  var bias = regimeData ? (regimeData.bias || "NEUTRAL") : "NEUTRAL";
  var vix = regimeData ? (regimeData.vix || "?") : "?";
  var cash = accountCash || 250;

  // Dynamic budget tier — scales automatically as account grows
  var maxPremium, maxStockPrice, budgetLabel, budgetNote, stockExamples;
  if (cash < 300) {
    maxPremium = 1.00;
    maxStockPrice = 80;
    budgetLabel = "MICRO ($250)";
    budgetNote = "Account is under $300. Options must cost under $100 per contract total. "
      + "Focus exclusively on low-priced stocks where ATM options are $0.30-$1.00 ask. "
      + "Avoid any stock above $80 — options will be too expensive.";
    stockExamples = "Examples of affordable stocks at this size: SOFI, PLTR, BAC, F, SNAP, XLE, SLV, HOOD, MARA, RIVN, NIO, VALE";
  } else if (cash < 500) {
    maxPremium = 1.50;
    maxStockPrice = 120;
    budgetLabel = "SMALL ($300-500)";
    budgetNote = "Account is $300-500. Options must cost under $150 per contract total. "
      + "Stocks under $120 are the sweet spot. ATM options should be $0.50-$1.50 ask.";
    stockExamples = "Examples: SOFI, PLTR, BAC, F, XLE, AMD (cheaper strikes), SNAP, UBER, LYFT, COIN, HOOD";
  } else if (cash < 1000) {
    maxPremium = 2.50;
    maxStockPrice = 200;
    budgetLabel = "GROWING ($500-1000)";
    budgetNote = "Account is $500-1000. Options must cost under $250 per contract total. "
      + "Mid-priced stocks now accessible. ATM options should be $1.00-$2.50 ask.";
    stockExamples = "Examples: SOFI, PLTR, AMD, COIN, UBER, XLE, GLD, META (cheaper strikes), NVDA (far OTM only)";
  } else if (cash < 3000) {
    maxPremium = 4.00;
    maxStockPrice = 350;
    budgetLabel = "ESTABLISHED ($1K-3K)";
    budgetNote = "Account is $1K-3K. Options must cost under $400 per contract total. "
      + "Most mid and large cap stocks now accessible. Can trade AAPL, MSFT, GOOGL cheaper strikes.";
    stockExamples = "Examples: AAPL, MSFT, AMD, NVDA, META, AMZN, GOOGL, XLE, GLD, SPY (OTM strikes)";
  } else {
    maxPremium = 8.00;
    maxStockPrice = 600;
    budgetLabel = "ADVANCED ($3K+)";
    budgetNote = "Account is $3K+. Full universe accessible. Options up to $800 per contract. "
      + "Can trade any liquid name including SPY ATM, NVDA ATM, TSLA.";
    stockExamples = "Full S&P 500 universe available including SPY, NVDA, TSLA, AMZN, GOOGL ATM strikes";
  }

  // Build regime-specific hunting instructions
  var regimeSection = "";
  var strategySection = "";

  if (regime === "TRENDING_BULL") {
    regimeSection = "REGIME: TRENDING BULL — Hunt CALL candidates aggressively.\n"
      + "Look for: stocks in strong uptrends with upcoming bullish catalysts, breaking out above resistance, "
      + "institutional accumulation, unusual call volume already appearing, sectors with inflows.\n"
      + "Avoid: stocks near resistance, overextended moves, anything with negative catalyst incoming.\n";
    strategySection = "CALL HUNTING STRATEGIES (use all 6 candidates for calls):\n"
      + "1. BREAKOUT+CATALYST - stock breaking above key resistance with event within 7 days\n"
      + "2. MOMENTUM+EARNINGS - strong trend stock with upcoming earnings expected to beat\n"
      + "3. UNUSUAL CALL FLOW - stock with 3x+ normal call volume in last 48 hours\n"
      + "4. SECTOR LEADER - strongest stock in the hottest sector right now\n"
      + "5. MEAN REVERSION UP - oversold stock bouncing from strong support\n"
      + "6. EVENT-DRIVEN CALL - Fed, CPI, FDA, product launch within 3 days with bullish setup\n";
  } else if (regime === "TRENDING_BEAR") {
    regimeSection = "REGIME: TRENDING BEAR — Hunt PUT candidates aggressively.\n"
      + "Look for: stocks breaking below key support, sectors under heavy institutional selling, "
      + "stocks with negative catalysts incoming, weak earnings expected, macro headwinds specific to the company, "
      + "unusual put volume appearing, stocks failing to hold moving averages.\n"
      + "Avoid: oversold stocks already down 15%+, any stock with positive catalyst incoming.\n";
    strategySection = "PUT HUNTING STRATEGIES (use all 6 candidates for puts):\n"
      + "1. BREAKDOWN+CATALYST - stock breaking below key support with negative event within 7 days\n"
      + "2. WEAK EARNINGS PLAY - stock expected to miss earnings or cut guidance\n"
      + "3. UNUSUAL PUT FLOW - stock with 3x+ normal put volume in last 48 hours\n"
      + "4. SECTOR LAGGARD - weakest stock in the weakest sector right now\n"
      + "5. MEAN REVERSION DOWN - overbought stock rolling over from resistance\n"
      + "6. MACRO HEADWIND PLAY - company directly hurt by current macro conditions (oil, rates, Iran)\n";
  } else if (regime === "HIGH_VOLATILITY") {
    regimeSection = "REGIME: HIGH VOLATILITY (VIX " + vix + ") — Hunt BINARY EVENT plays only.\n"
      + "Premiums are expensive. Only trade stocks with a guaranteed binary catalyst within 3 days "
      + "where the move will be large enough to overcome expensive premium. "
      + "Both calls and puts are valid — direction depends on the specific setup.\n"
      + "Avoid: any stock without a hard catalyst, momentum plays, mean reversion plays.\n";
    strategySection = "HIGH VOLATILITY STRATEGIES (binary events only):\n"
      + "1. EARNINGS BINARY - stock reporting earnings within 3 days, clear directional lean\n"
      + "2. FDA DECISION - binary FDA catalyst within 3 days\n"
      + "3. FED/CPI EVENT - macro event within 2 days with clear market impact\n"
      + "4. GEOPOLITICAL PLAY - sector directly impacted by current crisis (energy, defense)\n"
      + "5. TECHNICAL BREAKDOWN - stock at major make-or-break level with hard catalyst\n"
      + "6. SQUEEZE CANDIDATE - heavily shorted stock with catalyst for short squeeze\n";
  } else if (regime === "EVENT_DRIVEN") {
    regimeSection = "REGIME: EVENT DRIVEN — Catalyst plays only, both directions.\n"
      + "Focus exclusively on stocks with hard catalysts within 3 days. "
      + "Both calls and puts valid depending on the specific setup and direction of expected move. "
      + "The catalyst must be real and dated — not vague.\n"
      + "Avoid: anything without a specific dated catalyst within 3 days.\n";
    strategySection = "EVENT-DRIVEN STRATEGIES:\n"
      + "1. EARNINGS PLAY - reporting within 3 days, strong directional lean\n"
      + "2. FED/CPI/PPI - macro data release within 3 days\n"
      + "3. FDA CATALYST - drug approval or rejection within 3 days\n"
      + "4. PRODUCT LAUNCH - major product event within 3 days\n"
      + "5. LEGAL/REGULATORY - court ruling or regulatory decision within 3 days\n"
      + "6. ANALYST EVENT - investor day, guidance update within 3 days\n";
  } else {
    // CHOPPY_NEUTRAL or UNKNOWN — conservative
    regimeSection = "REGIME: CHOPPY/NEUTRAL — Be very selective, mean reversion only.\n"
      + "Market is going sideways. Options decay fast in chop. Only trade stocks with "
      + "a very clear and imminent catalyst that forces a directional move. "
      + "Both calls and puts valid. Size down on all plays.\n"
      + "Avoid: momentum plays, breakout plays, anything dependent on sustained trend.\n";
    strategySection = "CONSERVATIVE STRATEGIES (choppy market):\n"
      + "1. EARNINGS BINARY - must report within 2 days, not 7\n"
      + "2. HARD CATALYST MEAN REVERSION - oversold with dated catalyst within 3 days\n"
      + "3. SECTOR OUTLIER - one sector moving clearly despite choppy overall market\n"
      + "4. VOLATILITY COMPRESSION PLAY - stock coiling tight before known catalyst\n"
      + "5. MACRO EVENT PLAY - Fed or CPI within 2 days only\n"
      + "6. SQUEEZE SETUP - stock with high short interest and hard catalyst incoming\n";
  }

  return "You are the Head Quant at an asymmetric AI hedge fund focused on OPTIONS TRADING. Today: "+today+".\n\n"
    + "=== CURRENT MARKET REGIME ===\n"
    + regimeSection
    + "=== END REGIME ===\n\n"
    + "=== ACCOUNT BUDGET TIER: "+budgetLabel+" ===\n"
    + budgetNote+"\n"
    + "Max option ask price: $"+maxPremium+" per share ($"+(maxPremium*100).toFixed(0)+" per contract total)\n"
    + "Max underlying stock price: $"+maxStockPrice+"\n"
    + stockExamples+"\n"
    + "=== END BUDGET ===\n\n"
    + "Search the market RIGHT NOW and identify the 6 best stocks for options plays based on this regime AND budget.\n\n"
    + "Current market prices: "+liveStr+"\n\n"
    + "NON-NEGOTIABLE REQUIREMENTS for every candidate:\n"
    + "- Must have a REAL catalyst with a specific date within 1-7 days\n"
    + "- Must have liquid options (open interest above 500, volume above 100K daily minimum)\n"
    + "- Stock price MUST be under $"+maxStockPrice+" — options must be affordable\n"
    + "- ATM option ask price MUST be under $"+maxPremium+" per share ($"+(maxPremium*100).toFixed(0)+" per contract)\n"
    + "- Premium must NOT already be overpriced relative to expected move\n"
    + "- Must have realistic path to 50%+ gain on the option contract within 1-7 days\n"
    + "- Max 2 tech stocks across all 6 candidates\n"
    + "- Diversify across sectors — no more than 2 from same sector\n"
    + "- DO NOT suggest AAPL, MSFT, TSLA, NVDA, AMZN, GOOGL, SPY unless account is above $500\n\n"
    + strategySection
    + "\nIMPORTANT: You are hunting for the best RISK/REWARD setups for the option CONTRACT itself — "
    + "not just stocks that look interesting. The question is always: can this option realistically "
    + "return 50%+ within 1-7 days based on a real catalyst AND stay within the $"+(maxPremium*100).toFixed(0)+" per contract budget?\n\n"
    + "Return ONLY pure JSON:\n"
    + "{\"candidates\":[\"SOFI\",\"PLTR\",\"XLE\",\"BAC\",\"SNAP\",\"MARA\"]}";
};

const REGIME_PROMPT = function(liveStr, briefingSummary, spyIVRank, spyPCRatio, unusualTicker) {
  var today = new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
  var hasBriefing = briefingSummary && briefingSummary.length > 50;
  var hasIVRank = spyIVRank && spyIVRank !== "";
  var hasPCRatio = spyPCRatio && spyPCRatio !== "";
  var hasUnusual = unusualTicker && unusualTicker !== "";

  var prompt = "You are a Market Regime Detection specialist. Today: "+today+".\n\n"
    + "Your ONLY job is to determine the current market regime and whether conditions favor buying options RIGHT NOW.\n\n";

  if (hasBriefing) {
    prompt = prompt
      + "=== MACRO CONTEXT FROM TODAY'S BRIEFING ===\n"
      + briefingSummary + "\n"
      + "=== END MACRO CONTEXT ===\n\n"
      + "IMPORTANT: Use this macro context to inform your regime classification. If the briefing describes geopolitical shocks, oil spikes, Fed hawkishness, or sector selloffs, factor these heavily into your regime determination.\n\n";
  }

  if (hasIVRank || hasPCRatio || hasUnusual) {
    prompt = prompt + "=== OPTIONS MARKET DATA (from OptionCharts) ===\n";
    if (hasIVRank) prompt = prompt + "SPY IV Rank: " + spyIVRank + " (under 30 = cheap premiums, 30-60 = normal, above 60 = expensive/overpriced)\n";
    if (hasPCRatio) prompt = prompt + "SPY Put/Call Ratio: " + spyPCRatio + " (under 0.7 = bullish, 0.7-1.0 = neutral, above 1.0 = fear/bearish, above 1.5 = extreme fear)\n";
    if (hasUnusual) prompt = prompt + "Unusual Options Activity noted: " + unusualTicker + "\n";
    prompt = prompt
      + "=== END OPTIONS DATA ===\n\n"
      + "IMPORTANT: Use these options market readings to refine your regime. High IV Rank means expensive premiums - warn about cost. High Put/Call Ratio means institutional fear - factor into bias.\n\n";
  }

  prompt = prompt
    + "Now search for current technical data on:\n"
    + "1. VIX level and direction - is fear rising or falling?\n"
    + "2. SPY trend - above or below 20-day and 50-day moving averages?\n"
    + "3. Market breadth - are most stocks rising or falling today?\n"
    + "4. Recent realized volatility - has the market been choppy or trending?\n"
    + "5. Macro risk events in next 7 days - Fed, CPI, earnings season?\n\n"
    + "Classify the current regime as ONE of these:\n"
    + "TRENDING_BULL - market in clear uptrend, momentum plays work, buy calls\n"
    + "TRENDING_BEAR - market in clear downtrend, buy puts, avoid calls\n"
    + "CHOPPY_NEUTRAL - market going sideways, options decay fast, avoid buying premium\n"
    + "HIGH_VOLATILITY - VIX elevated above 25, premiums expensive, size down heavily\n"
    + "EVENT_DRIVEN - major catalyst coming within 3 days, event plays only\n\n"
    + "OVERRIDE RULES - these force a regime change regardless of price structure:\n"
    + "- If macro briefing shows geopolitical crisis OR oil shock: classify as HIGH_VOLATILITY or EVENT_DRIVEN, never TRENDING_BULL\n"
    + "- If SPY IV Rank above 60: warn that premiums are expensive, recommend smaller size\n"
    + "- If Put/Call Ratio above 1.0: lean bearish on bias even if price trend is bullish\n"
    + "- If Put/Call Ratio above 1.5: classify as HIGH_VOLATILITY minimum\n\n"
    + "Current market prices for context: "+liveStr+"\n\n"
    + "Respond in pure JSON only:\n"
    + "{\"regime\":\"TRENDING_BULL\",\"vix\":18.5,\"vix_direction\":\"falling\","
    + "\"spy_trend\":\"above 20MA and 50MA\",\"breadth\":\"65% of stocks advancing\","
    + "\"options_environment\":\"FAVORABLE\",\"bias\":\"CALLS\","
    + "\"iv_rank_warning\":\"\","
    + "\"pc_ratio_signal\":\"\","
    + "\"macro_override\":\"\","
    + "\"best_strategy\":\"Momentum + Catalyst plays. Buy ATM calls on strong stocks with upcoming catalysts.\","
    + "\"avoid\":\"Avoid buying puts unless clear breakdown signal.\","
    + "\"sizing_modifier\":1.0,"
    + "\"regime_summary\":\"Market is in a clean uptrend with falling volatility. Best week to buy calls on momentum stocks.\","
    + "\"trade_or_wait\":\"TRADE\","
    + "\"wait_reason\":\"\"}";

  return prompt;
};

const CHAT_SYSTEM = function(cash, positions) {
  var posStr = positions.length ? positions.map(function(o){ return o.symbol+" "+o.optionType+" $"+o.strike+" exp:"+o.expiry+" ("+o.contracts+" contract, paid $"+o.premium+")"; }).join(" | ") : "none";
  var totalPremium = positions.reduce(function(s,o){ return s+(o.contracts*o.premium*100); },0);
  var totalVal = cash + totalPremium;
  return "You are an expert options trader and quant analyst for Aidan's War Room.\n\n"
    + "ACCOUNT FACTS - always use these exact numbers:\n"
    + "Total account value: $"+totalVal.toFixed(2)+"\n"
    + "Cash available to deploy: $"+cash.toFixed(2)+"\n"
    + "Open options positions: "+posStr+"\n"
    + "Options premium at risk: $"+totalPremium.toFixed(2)+"\n\n"
    + "POSITION SIZING RULES:\n"
    + "- Max $"+Math.min(cash*0.4, 300).toFixed(0)+" per options trade (never risk more than 40% of cash on one trade)\n"
    + "- 1 contract maximum per trade until account reaches $1000\n"
    + "- Never suggest spending more than available cash $"+cash.toFixed(2)+"\n\n"
    + "You can answer questions about both options AND stocks. When asked about stocks give analysis but always relate it back to whether an options play makes sense.\n"
    + "Always include specific options contract recommendations (type, strike, expiry, estimated premium) when relevant.\n"
    + "Search for current market data when needed.";
};

const S = {
  app:   { background:"#050810", minHeight:"100vh", fontFamily:"'Courier New',monospace", color:"#e8e8e8" },
  hdr:   { background:"linear-gradient(135deg,#0a1428,#0d1f3c)", borderBottom:"2px solid #aa88ff40", padding:"14px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" },
  tkr:   { background:"#060a10", borderBottom:"1px solid #aa88ff20", padding:"7px 16px", overflowX:"auto", whiteSpace:"nowrap" },
  tabs:  { display:"flex", borderBottom:"1px solid #1a1a2a", background:"#060a10" },
  tab:   function(a){ return { flex:1, padding:"10px 2px", background:"none", border:"none", borderBottom: a?"2px solid #aa88ff":"2px solid transparent", color:a?"#aa88ff":"#445566", fontSize:10, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit" }; },
  card:  { background:"#0a0e18", border:"1px solid #1a1a2a", borderRadius:6, padding:14, marginBottom:10 },
  btn:   function(c,bg){ c=c||"#aa88ff"; bg=bg||"linear-gradient(135deg,#18082a,#300050)"; return { background:bg, border:"1px solid "+c+"60", color:c, padding:"12px", fontFamily:"inherit", fontSize:11, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", borderRadius:4, width:"100%" }; },
  inp:   { background:"#060a10", border:"1px solid #1a1a2a", color:"#ffffff", padding:"9px 10px", fontFamily:"inherit", fontSize:12, borderRadius:4, width:"100%", boxSizing:"border-box" },
  lbl:   { color:"#aa88ff", fontSize:10, letterSpacing:2, marginBottom:6, display:"block" },
};

export default function QuantDashboard() {
  const [optionsPositions, setOptionsPositions] = useState([]);
  const [trades,           setTrades]           = useState([]);
  const [briefing,         setBriefing]         = useState("");
  const [loading,          setLoading]          = useState(false);
  const [activeTab,        setActiveTab]        = useState("briefing");
  const [cashBalance,      setCashBalance]      = useState(STARTING_CASH);
  const [livePrices,       setLivePrices]       = useState({});
  const [lastUpdated,      setLastUpdated]      = useState(null);
  const [chatHistory,      setChatHistory]      = useState([]);
  const [chatInput,        setChatInput]        = useState("");
  const [chatLoading,      setChatLoading]      = useState(false);
  const [optionForm,       setOptionForm]       = useState({symbol:"",type:"CALL",strike:"",expiry:"",contracts:"1",premium:"",note:""});
  const [riskAlerts,       setRiskAlerts]       = useState([]);
  const [editingTrade,     setEditingTrade]     = useState(null);
  const [editForm,         setEditForm]         = useState({});
  const [scanResults,      setScanResults]      = useState([]);
  const [scanLoading,      setScanLoading]      = useState(false);
  const [scanStatus,       setScanStatus]       = useState("");
  const [manualSymbol,     setManualSymbol]     = useState("");
  const [manualLoading,    setManualLoading]    = useState(false);
  const [manualResult,     setManualResult]     = useState(null);
  const [regime,           setRegime]           = useState(null);
  const [regimeLoading,    setRegimeLoading]    = useState(false);
  const [sessionJournal,   setSessionJournal]   = useState([]);
  const [journalForm,      setJournalForm]      = useState({status:"NO_TRADE",notes:"",regime:""});
  const [journalOpen,      setJournalOpen]      = useState(false);
  const [spyIVRank,        setSpyIVRank]        = useState("");
  const [spyPCRatio,       setSpyPCRatio]       = useState("");
  const [unusualTicker,    setUnusualTicker]    = useState("");
  const [optionsInputSaved, setOptionsInputSaved] = useState(false);

  useEffect(function(){ loadData().catch(function(e){ console.error('loadData failed:',e); }); fetchLivePrices(); var iv=setInterval(fetchLivePrices,60000); return function(){ clearInterval(iv); }; },[]);
  useEffect(function(){ runRiskEngine(); },[optionsPositions, cashBalance]);

  function getDaysUntilExpiry(expiryStr){
    if(!expiryStr) return null;
    try{ var d=new Date(expiryStr); var diff=Math.ceil((d-new Date())/(1000*60*60*24)); return diff; }catch(e){ return null; }
  }

  function runRiskEngine(){
    var alerts=[];
    var totalPremium=optionsPositions.reduce(function(s,o){ return s+(o.contracts*o.premium*100); },0);
    var totalVal=cashBalance+totalPremium;
    if(cashBalance<=0) alerts.push({msg:"ACCOUNT EMPTY - No cash available to trade. Close a position or add funds.",color:"#ff2222"});
    else if(cashBalance<50) alerts.push({msg:"LOW CASH WARNING - Only $"+cashBalance.toFixed(2)+" remaining. Be very selective.",color:"#ffaa00"});
    if(totalPremium>cashBalance*1.5) alerts.push({msg:"OVEREXPOSED - Premium at risk exceeds 60% of account. Consider closing a position.",color:"#ff4444"});
    optionsPositions.forEach(function(o){
      var days=getDaysUntilExpiry(o.expiry);
      if(days!==null&&days<=0) alerts.push({msg:"EXPIRED - "+o.symbol+" "+o.optionType+" $"+o.strike+" has EXPIRED. Remove this position.",color:"#ff0000"});
      else if(days!==null&&days<=1) alerts.push({msg:"EXPIRING TODAY - "+o.symbol+" "+o.optionType+" $"+o.strike+" - CLOSE NOW OR LOSE EVERYTHING",color:"#ff2222"});
      else if(days!==null&&days<=2) alerts.push({msg:"EXPIRING SOON - "+o.symbol+" "+o.optionType+" $"+o.strike+" expires in "+days+" days - review now",color:"#ffaa00"});
    });
    setRiskAlerts(alerts);
  }

  async function fetchLivePrices(){
    var syms=["SPY","QQQ","NVDA","AAPL","MSFT","META","AMD","AMZN","TSLA","GLD","XLE","SOFI","MU","AMAT"];
    var extra=optionsPositions.map(function(o){ return o.symbol; });
    syms=[...new Set([...syms,...extra])];
    try{
      var r=await fetch("/api/prices?symbols="+syms.join(","));
      var res=await r.json();
      if(res&&Object.keys(res).length>0){ setLivePrices(res); setLastUpdated(new Date().toLocaleTimeString()); }
    }catch(e){ console.error("Price fetch failed:",e); }
  }

  async function loadData(){
    try{
      // Load from database first — timeout after 5 seconds to avoid hanging
      var controller = new AbortController();
      var timeout = setTimeout(function(){ controller.abort(); }, 5000);
      var r = await fetch("/api/db", {signal: controller.signal});
      clearTimeout(timeout);
      var res = await r.json();
      if(res.success && res.data){
        var d = res.data;
        if(d.op3) setOptionsPositions(JSON.parse(d.op3));
        if(d.tr3) setTrades(JSON.parse(d.tr3));
        if(d.ca3) setCashBalance(parseFloat(d.ca3));
        if(d.ch3) setChatHistory(JSON.parse(d.ch3));
        if(d.sr3) setScanResults(JSON.parse(d.sr3));
        if(d.rg3) setRegime(JSON.parse(d.rg3));
        if(d.sj3) setSessionJournal(JSON.parse(d.sj3));
        if(d.oi3){
          var oiParsed=JSON.parse(d.oi3);
          if(oiParsed.ivRank) setSpyIVRank(oiParsed.ivRank);
          if(oiParsed.pcRatio) setSpyPCRatio(oiParsed.pcRatio);
          if(oiParsed.unusual) setUnusualTicker(oiParsed.unusual);
        }
        return;
      }
    }catch(e){ console.warn("DB load failed, falling back to localStorage:", e.message); }
    // Fallback to localStorage if database unavailable
    try{
      var op=localStorage.getItem("op3"); if(op) setOptionsPositions(JSON.parse(op));
      var t=localStorage.getItem("tr3"); if(t) setTrades(JSON.parse(t));
      var c=localStorage.getItem("ca3"); if(c) setCashBalance(parseFloat(c));
      var ch=localStorage.getItem("ch3"); if(ch) setChatHistory(JSON.parse(ch));
      var sr=localStorage.getItem("sr3"); if(sr) setScanResults(JSON.parse(sr));
      var rg=localStorage.getItem("rg3"); if(rg) setRegime(JSON.parse(rg));
      var sj=localStorage.getItem("sj3"); if(sj) setSessionJournal(JSON.parse(sj));
      var oi=localStorage.getItem("oi3");
      if(oi){
        var oiParsed=JSON.parse(oi);
        if(oiParsed.ivRank) setSpyIVRank(oiParsed.ivRank);
        if(oiParsed.pcRatio) setSpyPCRatio(oiParsed.pcRatio);
        if(oiParsed.unusual) setUnusualTicker(oiParsed.unusual);
      }
    }catch(e){}
  }

  function saveToDb(key, value){
    var strVal = typeof value === "string" ? value : JSON.stringify(value);
    fetch("/api/db", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({key:key, value:strVal})
    }).catch(function(e){ console.warn("DB save failed for "+key+":", e.message); });
    // Also save to localStorage as backup
    try{ localStorage.setItem(key, strVal); }catch(e){}
  }

  function save(nop,nt,nc,nch){
    var opToSave=nop!==null?(nop!=null?nop:optionsPositions):optionsPositions;
    var trToSave=nt!==null?(nt!=null?nt:trades):trades;
    var caToSave=nc!==null?(nc!=null?nc:cashBalance):cashBalance;
    saveToDb("op3", JSON.stringify(opToSave));
    saveToDb("tr3", JSON.stringify(trToSave));
    saveToDb("ca3", String(caToSave));
    if(nch!==null) saveToDb("ch3", JSON.stringify(nch!=null?nch:chatHistory));
  }

  function saveOptionsInputs(){
    saveToDb("oi3", JSON.stringify({ivRank:spyIVRank,pcRatio:spyPCRatio,unusual:unusualTicker}));
    setOptionsInputSaved(true);
    setTimeout(function(){ setOptionsInputSaved(false); },2000);
  }

  function getBriefingSummary(){
    if(!briefing||briefing.length<50) return "";
    var lines=briefing.split("\n").filter(function(l){ return l.trim().length>20; });
    return lines.slice(0,20).join(" ").slice(0,1200);
  }

  async function callClaude(system,messages,search){
    if(search===undefined) search=true;
    var key=process.env.REACT_APP_ANTHROPIC_API_KEY;
    var body={model:"claude-haiku-4-5-20251001",max_tokens:1500,system:system,messages:messages};
    if(search) body.tools=[{type:"web_search_20250305",name:"web_search"}];
    var r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":key,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify(body)});
    var d=await r.json();
    if(d.error) throw new Error(d.error.message||"API error");
    return d.content.filter(function(b){ return b.type==="text"; }).map(function(b){ return b.text; }).join("\n");
  }

  function saveJournalEntry(entry){
    var newJournal=[...sessionJournal.filter(function(j){ return j.date!==entry.date; }),entry];
    newJournal.sort(function(a,b){ return new Date(b.date)-new Date(a.date); });
    setSessionJournal(newJournal);
    saveToDb("sj3", JSON.stringify(newJournal));
  }

  function logSession(){
    if(!journalForm.notes.trim()&&journalForm.status==="NO_TRADE") return;
    var today=new Date().toLocaleDateString();
    var regimeToday=regime?(regime.regime||"UNKNOWN"):"UNKNOWN";
    var entry={
      date:today,
      status:journalForm.status,
      notes:journalForm.notes,
      regime:regimeToday,
      vix:regime?(regime.vix||""):"",
      bias:regime?(regime.bias||""):"",
      timestamp:new Date().toISOString()
    };
    saveJournalEntry(entry);
    setJournalForm({status:"NO_TRADE",notes:"",regime:""});
    setJournalOpen(false);
  }

  function deleteJournalEntry(date){
    var newJournal=sessionJournal.filter(function(j){ return j.date!==date; });
    setSessionJournal(newJournal);
    saveToDb("sj3", JSON.stringify(newJournal));
  }

  async function getDailyBriefing(){
    setLoading(true); setBriefing("");
    try{
      var liveStr=Object.entries(livePrices).map(function(e){ return e[0]+":$"+(e[1].price?e[1].price.toFixed(2):"?")+"("+(e[1].change>=0?"+":"")+e[1].change.toFixed(2)+"%)"; }).join(", ");
      var txt=await callClaude(BRIEFING_PROMPT(),[{role:"user",content:"Deliver macro briefing for "+new Date().toLocaleDateString()+". Market prices: "+liveStr+". Search for latest macro news. Pure macro context only - no stock picks, no tickers."}]);
      setBriefing(txt);
    }catch(e){ setBriefing("Error - check connection and try again."); }
    setLoading(false);
  }

  function buildCommitteeResult(symbol,results,chainData){
    var names=["Wolf (Fundamentals)","Cohen (Price Action)","Dalio (Options Flow)","Ackman (Insider)"];
    var votes={};
    for(var i=0;i<4;i++){
      try{
        var txt=results[i];
        var clean=txt.split("\u0060\u0060\u0060json").join("").split("\u0060\u0060\u0060").join("").trim();
        var s=clean.indexOf("{"),e=clean.lastIndexOf("}");
        if(s===-1||e===-1) throw new Error("No JSON");
        var parsed=JSON.parse(clean.substring(s,e+1));
        if(!parsed.direction||typeof parsed.direction!=="string") parsed.direction="HOLD";
        parsed.direction=parsed.direction.toUpperCase().trim();
        if(["BUY","SELL","HOLD"].indexOf(parsed.direction)===-1) parsed.direction="HOLD";
        if(typeof parsed.conviction!=="number") parsed.conviction=0.5;
        if(typeof parsed.reasoning!=="string") parsed.reasoning=JSON.stringify(parsed.reasoning).slice(0,200);
        if(names[i]==="Cohen (Price Action)"&&parsed.rsi) parsed.technicals="RSI: "+parsed.rsi+" | MACD: "+(parsed.macd||"n/a")+" | MA: "+(parsed.ma_position||"n/a")+" | Sup: $"+(parsed.key_support||"?")+" | Res: $"+(parsed.key_resistance||"?");
        if(names[i]==="Dalio (Options Flow)"&&parsed.sector_flow) parsed.flowdata="Sector: "+(parsed.sector_flow||"n/a")+" | Options: "+(parsed.options_signal||"n/a")+" | vs SPY: "+(parsed.relative_strength||"n/a");
        if(parsed.option_type) parsed.optionsplay=parsed.option_type+" | Strike: $"+(parsed.option_strike||"?")+" | Expiry: "+(parsed.option_expiry||"3-5 days")+" | Est. Premium: "+(parsed.option_premium_est||"?");
        votes[names[i]]=parsed;
      }catch(err){
        var rawText=results[i]?results[i].split("\u0060\u0060\u0060json").join("").split("\u0060\u0060\u0060").join("").trim().slice(0,200):"No response";
        votes[names[i]]={direction:"HOLD",conviction:0.5,reasoning:rawText};
      }
    }
    var dirs=Object.values(votes).map(function(v){ return v.direction; });
    var buys=dirs.filter(function(d){ return d==="BUY"; }).length;
    var sells=dirs.filter(function(d){ return d==="SELL"; }).length;
    var consensus=buys>=2?"BUY":sells>=2?"SELL":"HOLD";
    var avgConv=Object.values(votes).reduce(function(s,v){ return s+(v.conviction||0.5); },0)/4;
    var stars=avgConv>0.75?"HIGH CONVICTION":avgConv>0.5?"MEDIUM CONVICTION":"SPECULATIVE";
    var consensusVotes=Object.values(votes).filter(function(v){ return v.direction===consensus; });
    var priceSource=consensusVotes.length>0?consensusVotes:Object.values(votes);
    var entries=priceSource.filter(function(v){ return v.entry&&typeof v.entry==="number"; }).map(function(v){ return v.entry; });
    var targets=priceSource.filter(function(v){ return v.target&&typeof v.target==="number"; }).map(function(v){ return v.target; });
    var stops=priceSource.filter(function(v){ return v.stop&&typeof v.stop==="number"; }).map(function(v){ return v.stop; });
    var entryAvg=entries.length?(entries.reduce(function(a,b){ return a+b; },0)/entries.length):null;
    var targetAvg=targets.length?(targets.reduce(function(a,b){ return a+b; },0)/targets.length):null;
    var stopAvg=stops.length?(stops.reduce(function(a,b){ return a+b; },0)/stops.length):null;
    var validEntry=entryAvg?"$"+entryAvg.toFixed(2):null;
    var validTarget=null,validStop=null;
    if(entryAvg&&targetAvg){
      if(consensus==="BUY"&&targetAvg>entryAvg) validTarget="$"+targetAvg.toFixed(2);
      else if(consensus==="SELL"&&targetAvg<entryAvg) validTarget="$"+targetAvg.toFixed(2);
      else if(consensus==="HOLD") validTarget="$"+targetAvg.toFixed(2);
    }
    if(entryAvg&&stopAvg){
      if(consensus==="BUY"&&stopAvg<entryAvg) validStop="$"+stopAvg.toFixed(2);
      else if(consensus==="SELL"&&stopAvg>entryAvg) validStop="$"+stopAvg.toFixed(2);
      else if(consensus==="HOLD") validStop="$"+stopAvg.toFixed(2);
    }
    var ackV=votes["Ackman (Insider)"]||{};
    var optV=Object.values(votes).filter(function(v){ return v.option_type; });
    var callC=optV.filter(function(v){ return v.option_type==="CALL"; }).length;
    var putC=optV.filter(function(v){ return v.option_type==="PUT"; }).length;
    var conOptType=callC>=putC?"CALL":"PUT";
    var strikes=optV.filter(function(v){ return v.option_strike&&typeof v.option_strike==="number"; }).map(function(v){ return v.option_strike; });
    var avgStrike=strikes.length?(strikes.reduce(function(a,b){ return a+b; },0)/strikes.length).toFixed(2):null;
    var prems=optV.map(function(v){ return v.option_premium_est||""; }).filter(Boolean);
    var horizons=Object.values(votes).filter(function(v){ return v.horizon_days&&typeof v.horizon_days==="number"; }).map(function(v){ return v.horizon_days; });
    var avgH=horizons.length?Math.round(horizons.reduce(function(a,b){ return a+b; },0)/horizons.length):3;
    var ttd=avgH<=3?"OPTIONS - SHORT":avgH<=5?"OPTIONS - MEDIUM":"OPTIONS - LONGER";
    var ttr=avgH<=3?"Agents see "+avgH+"-day window. Buy ATM or slightly OTM contract expiring in 3-4 days."
      :avgH<=5?"Agents see "+avgH+"-day window. Buy ATM contract expiring in 5-7 days."
      :"Agents see "+avgH+"-day window. Buy slightly ITM contract with 7+ days to give time to work.";
    var cohenV=votes["Cohen (Price Action)"]||{};
    // Use real chain data as trusted source — fallback to Cohen's parsed values if chain unavailable
    var realChain = chainData && !chainData.error ? chainData : null;
    var realAtm = realChain ? (consensus==="SELL" ? realChain.atmPut : realChain.atmCall) : null;
    var delta=realAtm&&realAtm.delta?realAtm.delta:(cohenV.delta||null);
    var theta=realAtm&&realAtm.theta?realAtm.theta:(cohenV.theta_daily||null);
    var openInterest=realAtm&&realAtm.openInterest?realAtm.openInterest:(cohenV.open_interest||null);
    var bidAskSpread=realAtm&&realAtm.spread?("$"+realAtm.spread):(cohenV.bid_ask_spread||null);
    var liquidityOk=realAtm?(realAtm.openInterest>=500&&parseFloat(realAtm.spread)<=0.15):(cohenV.liquidity_ok!==false);
    var daysToExpiry=realChain&&realChain.daysToExpiry?realChain.daysToExpiry:(cohenV.days_to_expiry||avgH);
    var realIV=realAtm&&realAtm.impliedVolatility?(realAtm.impliedVolatility+"%"):null;
    var liquidityGrade=realAtm?realAtm.liquidityGrade:null;
    var dataSource=realChain?"REAL CHAIN DATA":"AI ESTIMATED";
    var maxRisk=50;
    if(buys>=4||sells>=4) maxRisk=150;
    else if(buys>=3||sells>=3) maxRisk=100;
    else if(buys>=2||sells>=2) maxRisk=75;
    if(!liquidityOk) maxRisk=Math.min(maxRisk,50);
    var thetaWarning=null;
    if(daysToExpiry<=2) thetaWarning="HIGH THETA RISK - "+daysToExpiry+" days left, decay accelerating fast";
    else if(daysToExpiry<=3) thetaWarning="MODERATE THETA - sell if up 40%+ before expiry";
    var premNum=prems[0]?parseFloat(prems[0].replace(/[^0-9.]/g,"")):null;
    var takeProfit=premNum?"$"+(premNum*1.5).toFixed(2)+" (+50% gain) — take at least half off here":null;
    var stopLoss=premNum?"$"+(premNum*0.5).toFixed(2)+" (-50% loss) — exit immediately, do not hold":null;
    return {symbol:symbol,votes:votes,consensus:consensus,buys:buys,sells:sells,avgConv:avgConv.toFixed(2),stars:stars,
      entry:validEntry,target:validTarget,stop:validStop,
      insiderSignal:ackV.insider_signal||"NEUTRAL",insiderDetail:ackV.insider_detail||"No recent insider activity",
      consensusOptionType:conOptType,consensusStrike:avgStrike,consensusPremium:prems[0]||null,
      callCount:callC,putCount:putC,avgHorizon:avgH,tradeTypeDecision:ttd,tradeTypeReason:ttr,
      passesCommittee:buys>=2||sells>=2,
      delta:delta,theta:theta,openInterest:openInterest,bidAskSpread:bidAskSpread,liquidityOk:liquidityOk,
      daysToExpiry:daysToExpiry,maxRisk:maxRisk,thetaWarning:thetaWarning,takeProfit:takeProfit,stopLoss:stopLoss,
      realIV:realIV,liquidityGrade:liquidityGrade,dataSource:dataSource,stockPCRatio:realChain?realChain.stockPCRatio:null,
      avgCallIV:realChain?realChain.avgCallIV:null,realChainAvailable:!!realChain};
  }

  async function fetchOptionsChain(symbol, price){
    try{
      var priceParam = price ? "&price=" + price : "";
      var r = await fetch("/api/options?symbol=" + symbol + priceParam);
      var data = await r.json();
      if(data && !data.error) return data;
      return null;
    }catch(e){
      console.warn("Options chain fetch failed for " + symbol + ":", e.message);
      return null;
    }
  }

  async function runAgentsOnSymbol(symbol){
    var live=livePrices[symbol]||{};
    var livePrice=live.price||null;
    var priceStr="Price:$"+(live.price?live.price.toFixed(2):"?")+", Change:"+(live.change?live.change.toFixed(2):"0")+"%, High:$"+(live.high?live.high.toFixed(2):"?")+", Low:$"+(live.low?live.low.toFixed(2):"?")+", Vol:"+(live.volume||0).toLocaleString();
    var chainData = await fetchOptionsChain(symbol, livePrice);
    var results=await Promise.all([
      callClaude(WOLF_PROMPT(symbol),[{role:"user",content:"Analyze "+symbol+" fundamentals for options play. JSON only."}]),
      callClaude(COHEN_PROMPT(symbol,priceStr,chainData),[{role:"user",content:"Analyze technicals for "+symbol+" options timing: "+priceStr+". Use the real chain data provided. JSON only."}],false),
      callClaude(DALIO_PROMPT(symbol,priceStr),[{role:"user",content:"Search unusual options activity and sector flow for "+symbol+". JSON only."}]),
      callClaude(ACKMAN_PROMPT(symbol),[{role:"user",content:"Search SEC Form 4 filings for "+symbol+". JSON only."}]),
    ]);
    return buildCommitteeResult(symbol,results,chainData);
  }

  async function runRegimeFilter(){
    setRegimeLoading(true);
    try{
      var liveStr=Object.entries(livePrices).map(function(e){ return e[0]+":$"+(e[1].price?e[1].price.toFixed(2):"?"); }).join(", ");
      var briefSummary=getBriefingSummary();
      var promptStr=REGIME_PROMPT(liveStr, briefSummary, spyIVRank, spyPCRatio, unusualTicker);
      var txt=await callClaude(promptStr,[{role:"user",content:"Analyze current market regime right now. Search VIX, SPY trend, breadth, volatility. Return pure JSON only."}]);
      var clean=txt.split("\u0060\u0060\u0060json").join("").split("\u0060\u0060\u0060").join("").trim();
      var s=clean.indexOf("{"),e=clean.lastIndexOf("}");
      var parsed=JSON.parse(clean.substring(s,e+1));
      setRegime(parsed);
      saveToDb("rg3", JSON.stringify(parsed));
    }catch(err){ setRegime({regime:"UNKNOWN",options_environment:"UNKNOWN",trade_or_wait:"WAIT",regime_summary:"Could not determine regime. Try again.",wait_reason:"Analysis failed - "+err.message}); }
    setRegimeLoading(false);
  }

  async function runMarketScan(){
    setScanLoading(true); setScanResults([]);
    var regimeName = regime ? (regime.regime||"UNKNOWN").replace(/_/g," ") : "UNKNOWN";
    var regimeBias = regime ? (regime.bias||"NEUTRAL") : "NEUTRAL";
    var huntingMsg = regime && regime.trade_or_wait==="WAIT" ? "Scan blocked — bad conditions"
      : regime && regime.regime==="TRENDING_BEAR" ? "Hunting PUT candidates (bearish regime)..."
      : regime && regime.regime==="HIGH_VOLATILITY" ? "Hunting binary event plays (high volatility)..."
      : regime && regime.regime==="EVENT_DRIVEN" ? "Hunting catalyst plays (event driven)..."
      : regime && regime.regime==="CHOPPY_NEUTRAL" ? "Hunting conservative setups (choppy market)..."
      : "Hunting CALL candidates (bull regime)...";
    setScanStatus(huntingMsg);
    try{
      var liveStr=Object.entries(livePrices).map(function(e){ return e[0]+":$"+(e[1].price?e[1].price.toFixed(2):"?"); }).join(", ");
      var userMsg = "Search market now for best options plays based on current regime: "+regimeName+" (bias: "+regimeBias+"). Today: "+new Date().toLocaleDateString()+". Return 6 candidates as pure JSON only.";
      var candTxt=await callClaude(SCANNER_CANDIDATES_PROMPT(liveStr, regime, cashBalance),[{role:"user",content:userMsg}]);
      var clean=candTxt.split("\u0060\u0060\u0060json").join("").split("\u0060\u0060\u0060").join("").trim();
      var s=clean.indexOf("{"),e=clean.lastIndexOf("}");
      var parsed=JSON.parse(clean.substring(s,e+1));
      var candidates=parsed.candidates||[];
      if(!candidates.length) throw new Error("No candidates returned");
      setScanStatus("Found "+candidates.length+" candidates. Running 4 agents on each...");
      var approved=[];
      for(var b=0;b<candidates.length;b+=2){
        var batch=candidates.slice(b,b+2);
        setScanStatus("Analyzing: "+batch.join(" + ")+"... ("+(Math.min(b+2,candidates.length))+" of "+candidates.length+")");
        var batchResults=await Promise.all(batch.map(function(sym){ return runAgentsOnSymbol(sym); }));
        batchResults.forEach(function(result){
          if(result.passesCommittee){
            approved.push(result);
            setScanResults(function(prev){ var next=[...prev,result]; saveToDb("sr3",JSON.stringify(next)); return next; });
          }
        });
        if(b+2<candidates.length){ setScanStatus("Pausing between batches..."); await new Promise(function(res){ setTimeout(res,3000); }); }
      }
      if(approved.length===0) setScanStatus("Scan complete. No plays passed the committee today. Try again or check manual symbol.");
      else setScanStatus("Scan complete. "+approved.length+" options play"+(approved.length>1?"s":"")+" approved by committee.");
    }catch(err){ setScanStatus("Scan error: "+err.message+". Please try again."); }
    setScanLoading(false);
  }

  async function runManualSymbol(){
    if(!manualSymbol) return;
    setManualLoading(true); setManualResult(null);
    try{ var result=await runAgentsOnSymbol(manualSymbol); setManualResult(result); }
    catch(err){ setManualResult({symbol:manualSymbol,error:err.message}); }
    setManualLoading(false);
  }

  function logOptionTrade(){
    if(!optionForm.symbol||!optionForm.strike||!optionForm.premium) return;
    var contracts=parseInt(optionForm.contracts)||1;
    var premium=parseFloat(optionForm.premium);
    var totalCost=contracts*premium*100;
    if(totalCost>cashBalance){ alert("Not enough cash. Available: $"+cashBalance.toFixed(2)); return; }
    var trade={type:"OPTION",action:"BUY",symbol:optionForm.symbol.toUpperCase(),optionType:optionForm.type,strike:parseFloat(optionForm.strike),expiry:optionForm.expiry,contracts:contracts,premium:premium,total:totalCost,note:optionForm.note,date:new Date().toLocaleDateString(),status:"OPEN"};
    var newCash=cashBalance-totalCost;
    var newOptions=[...optionsPositions,trade];
    var newTrades=[trade,...trades];
    setOptionsPositions(newOptions); setCashBalance(newCash); setTrades(newTrades);
    setOptionForm({symbol:"",type:"CALL",strike:"",expiry:"",contracts:"1",premium:"",note:""});
    save(newOptions,newTrades,newCash,null);
  }

  function closeOptionPosition(idx,closePrice){
    var pos=optionsPositions[idx]; if(!pos) return;
    var sellPrice=closePrice?parseFloat(closePrice):0;
    var proceeds=sellPrice*pos.contracts*100;
    var pnl=proceeds-(pos.contracts*pos.premium*100);
    var newCash=cashBalance+proceeds;
    var newOptions=optionsPositions.filter(function(_,i){ return i!==idx; });
    var closeTrade=Object.assign({},pos,{action:"SELL",closePrice:sellPrice,proceeds:proceeds,pnl:pnl,date:new Date().toLocaleDateString(),status:"CLOSED"});
    var newTrades=[closeTrade,...trades];
    setOptionsPositions(newOptions); setCashBalance(newCash); setTrades(newTrades);
    save(newOptions,newTrades,newCash,null);
  }

  function deleteTrade(idx){
    var t=trades[idx]; if(!t) return;
    var newTrades=trades.filter(function(_,i){ return i!==idx; });
    var newCash=cashBalance;
    var newOpts=[...optionsPositions];
    if(t.type==="OPTION"){
      if(t.action==="BUY"){ newCash+=t.total; newOpts=newOpts.filter(function(o){ return !(o.symbol===t.symbol&&o.strike===t.strike&&o.expiry===t.expiry); }); }
      else if(t.action==="SELL"){ newCash-=(t.proceeds||0); }
    }
    setTrades(newTrades); setCashBalance(newCash); setOptionsPositions(newOpts);
    save(newOpts,newTrades,newCash,null);
  }

  function startEditTrade(idx){ setEditingTrade(idx); setEditForm(Object.assign({},trades[idx])); }

  function saveEditTrade(){
    if(editingTrade===null) return;
    var updated=Object.assign({},editForm);
    var newTrades=trades.map(function(t,i){ return i===editingTrade?updated:t; });
    setTrades(newTrades); setEditingTrade(null); setEditForm({});
    save(null,newTrades,null,null);
  }

  async function sendChat(){
    if(!chatInput.trim()) return;
    setChatLoading(true);
    var uMsg={role:"user",content:chatInput};
    var newH=[...chatHistory,uMsg]; setChatHistory(newH); setChatInput("");
    try{
      var txt=await callClaude(CHAT_SYSTEM(cashBalance,optionsPositions),newH.slice(-10));
      var fH=[...newH,{role:"assistant",content:txt}]; setChatHistory(fH); save(null,null,null,fH);
    }catch(e){ setChatHistory([...newH,{role:"assistant",content:"Error. Please retry."}]); }
    setChatLoading(false);
  }

  var totalPremiumAtRisk = optionsPositions.reduce(function(s,o){ return s+(o.contracts*o.premium*100); },0);
  var totalValue = cashBalance + totalPremiumAtRisk;
  var totalPnL = trades.filter(function(t){ return t.action==="SELL"&&t.pnl; }).reduce(function(s,t){ return s+(t.pnl||0); },0);
  var closedTrades = trades.filter(function(t){ return t.action==="SELL"&&t.pnl!==undefined; });
  var winCount = closedTrades.filter(function(t){ return t.pnl>0; }).length;
  var winRate = closedTrades.length>0?((winCount/closedTrades.length)*100).toFixed(0):"--";
  var avgHoldDays = (function(){
    var openTrades = trades.filter(function(t){ return t.action==="BUY"; });
    var paired = closedTrades.map(function(ct){
      var match = openTrades.find(function(ot){ return ot.symbol===ct.symbol&&ot.strike===ct.strike&&ot.expiry===ct.expiry; });
      if(!match) return null;
      try{
        var d1=new Date(match.date); var d2=new Date(ct.date);
        return Math.max(0,Math.ceil((d2-d1)/(1000*60*60*24)));
      }catch(e){ return null; }
    }).filter(function(d){ return d!==null; });
    return paired.length>0?(paired.reduce(function(a,b){ return a+b; },0)/paired.length).toFixed(1):"--";
  })();
  // Group all activity by date for trades tab
  var allDates = (function(){
    var dateSet={};
    trades.forEach(function(t){ if(t.date) dateSet[t.date]=true; });
    sessionJournal.forEach(function(j){ if(j.date) dateSet[j.date]=true; });
    // Safe sort — compare strings directly, most recent first
    // Dates stored as toLocaleDateString so sort by timestamp from journal when available
    return Object.keys(dateSet).sort(function(a,b){
      var ja=sessionJournal.find(function(j){ return j.date===a; });
      var jb=sessionJournal.find(function(j){ return j.date===b; });
      if(ja&&ja.timestamp&&jb&&jb.timestamp) return jb.timestamp.localeCompare(ja.timestamp);
      var ta=trades.filter(function(t){ return t.date===a; });
      var tb=trades.filter(function(t){ return t.date===b; });
      if(ta.length&&tb.length&&ta[0].timestamp&&tb[0].timestamp) return tb[0].timestamp.localeCompare(ta[0].timestamp);
      return b.localeCompare(a);
    });
  })();

  function renderVerdictCard(result,keyPrefix){
    if(!result) return null;
    if(result.error) return React.createElement("div",{key:keyPrefix,style:{color:"#ff6644",fontSize:11,padding:10,background:"#0a0e18",borderRadius:6,marginBottom:10}},"Error analyzing "+result.symbol+": "+result.error);
    var C=result;
    var consColor=C.consensus==="BUY"?"#00ff88":C.consensus==="SELL"?"#ff4444":"#ffcc00";
    var convColor=C.stars==="HIGH CONVICTION"?"#00ff88":C.stars==="MEDIUM CONVICTION"?"#ffcc00":"#ff8844";
    var optColor=C.consensusOptionType==="CALL"?"#00ff88":"#ff4444";
    return React.createElement("div",{key:keyPrefix,style:{border:"2px solid "+consColor+"50",borderRadius:8,marginBottom:16,overflow:"hidden"}},
      React.createElement("div",{style:{background:"linear-gradient(135deg,#0a1020,#0d1535)",padding:"12px 14px",borderBottom:"1px solid "+consColor+"30"}},
        React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}},
          React.createElement("span",{style:{color:"#ffffff",fontWeight:"bold",fontSize:20}},C.symbol),
          React.createElement("span",{style:{color:convColor,fontWeight:"bold",fontSize:11,letterSpacing:1}},C.stars)
        ),
        React.createElement("div",{style:{display:"flex",gap:14,alignItems:"center",flexWrap:"wrap"}},
          React.createElement("span",{style:{color:consColor,fontSize:14,fontWeight:"bold"}},C.consensus),
          React.createElement("span",{style:{color:"#00ff88",fontSize:12}},"Buy: "+C.buys+"/4"),
          React.createElement("span",{style:{color:"#ff6666",fontSize:12}},"Sell: "+C.sells+"/4"),
          React.createElement("span",{style:{color:"#aaaaaa",fontSize:11}},"Conviction: "+C.avgConv),
          React.createElement("span",{style:{color:"#888888",fontSize:11}},"Avg hold: "+C.avgHorizon+"d")
        )
      ),
      React.createElement("div",{style:{padding:"12px 14px",background:"#07090f"}},
        C.passesCommittee&&C.consensusOptionType&&React.createElement("div",{style:{background:C.consensusOptionType==="CALL"?"#001a0d":"#1a0000",borderRadius:6,padding:"12px 14px",marginBottom:12,border:"2px solid "+optColor+"60"}},
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}},
            React.createElement("span",{style:{color:"#888",fontSize:9,letterSpacing:2}},"COMMITTEE OPTIONS RECOMMENDATION"),
            React.createElement("span",{style:{background:C.realChainAvailable?"#001a2a":"#1a0800",border:"1px solid "+(C.realChainAvailable?"#00ccff40":"#ff884440"),borderRadius:3,padding:"2px 6px",fontSize:8,color:C.realChainAvailable?"#00ccff":"#ff8844",letterSpacing:1}},C.realChainAvailable?"REAL DATA":"AI ESTIMATED"),
            React.createElement("span",{style:{color:optColor,fontSize:18,fontWeight:"bold"}},(C.consensusOptionType==="CALL"?"BUY CALL":"BUY PUT"))
          ),
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:8}},
            C.consensusStrike&&React.createElement("div",{style:{background:"#ffffff10",borderRadius:4,padding:"8px",textAlign:"center"}},
              React.createElement("div",{style:{color:"#666",fontSize:9,marginBottom:2}},"STRIKE PRICE"),
              React.createElement("div",{style:{color:"#00ccff",fontSize:14,fontWeight:"bold"}},"$"+C.consensusStrike)
            ),
            C.avgHorizon&&React.createElement("div",{style:{background:"#ffffff10",borderRadius:4,padding:"8px",textAlign:"center"}},
              React.createElement("div",{style:{color:"#666",fontSize:9,marginBottom:2}},"EXPIRY"),
              React.createElement("div",{style:{color:"#ffcc00",fontSize:14,fontWeight:"bold"}},C.avgHorizon+" days out")
            ),
            C.consensusPremium&&React.createElement("div",{style:{background:"#ff000015",borderRadius:4,padding:"8px",textAlign:"center",border:"1px solid #ff444420"}},
              React.createElement("div",{style:{color:"#ff4444aa",fontSize:9,marginBottom:2}},"EST. COST"),
              React.createElement("div",{style:{color:"#ff8866",fontSize:13,fontWeight:"bold"}},C.consensusPremium)
            )
          ),
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6,marginBottom:10}},
            C.delta&&React.createElement("div",{style:{background:"#ffffff08",borderRadius:4,padding:"6px 8px",textAlign:"center"}},
              React.createElement("div",{style:{color:"#666",fontSize:9,marginBottom:2}},"DELTA"),
              React.createElement("div",{style:{color:"#88ccff",fontSize:12,fontWeight:"bold"}},C.delta),
              React.createElement("div",{style:{color:"#556677",fontSize:8}},"moves per $1")
            ),
            C.theta&&React.createElement("div",{style:{background:"#ffffff08",borderRadius:4,padding:"6px 8px",textAlign:"center"}},
              React.createElement("div",{style:{color:"#666",fontSize:9,marginBottom:2}},"THETA/DAY"),
              React.createElement("div",{style:{color:"#ff8844",fontSize:12,fontWeight:"bold"}},C.theta),
              React.createElement("div",{style:{color:"#556677",fontSize:8}},"decay per day")
            ),
            C.openInterest&&React.createElement("div",{style:{background:C.openInterest>500?"#001a0d":"#1a0800",borderRadius:4,padding:"6px 8px",textAlign:"center",border:"1px solid "+(C.openInterest>500?"#00ff8830":"#ff884430")}},
              React.createElement("div",{style:{color:"#666",fontSize:9,marginBottom:2}},"OPEN INT."),
              React.createElement("div",{style:{color:C.openInterest>500?"#00ff88":"#ff8844",fontSize:12,fontWeight:"bold"}},C.openInterest),
              React.createElement("div",{style:{color:"#556677",fontSize:8}},C.openInterest>500?"liquid":"low liquidity")
            ),
            React.createElement("div",{style:{background:C.liquidityOk?"#001a0d":"#1a0800",borderRadius:4,padding:"6px 8px",textAlign:"center",border:"1px solid "+(C.liquidityOk?"#00ff8830":"#ff444430")}},
              React.createElement("div",{style:{color:"#666",fontSize:9,marginBottom:2}},"LIQUIDITY"),
              React.createElement("div",{style:{color:C.liquidityOk?"#00ff88":"#ff4444",fontSize:12,fontWeight:"bold"}},C.liquidityGrade||(C.liquidityOk?"OK":"POOR")),
              C.bidAskSpread&&React.createElement("div",{style:{color:"#556677",fontSize:8}},"spread: "+C.bidAskSpread)
            )
          ),
          C.realIV&&React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:8}},
            React.createElement("div",{style:{background:"#ffffff08",borderRadius:4,padding:"6px 8px",textAlign:"center"}},
              React.createElement("div",{style:{color:"#666",fontSize:9,marginBottom:2}},"IMPLIED VOL"),
              React.createElement("div",{style:{color:"#ffcc00",fontSize:12,fontWeight:"bold"}},C.realIV),
              React.createElement("div",{style:{color:"#556677",fontSize:8}},"real chain data")
            ),
            C.stockPCRatio&&React.createElement("div",{style:{background:"#ffffff08",borderRadius:4,padding:"6px 8px",textAlign:"center"}},
              React.createElement("div",{style:{color:"#666",fontSize:9,marginBottom:2}},"STOCK P/C RATIO"),
              React.createElement("div",{style:{color:parseFloat(C.stockPCRatio)>1.0?"#ff4444":parseFloat(C.stockPCRatio)<0.7?"#00ff88":"#ffcc00",fontSize:12,fontWeight:"bold"}},C.stockPCRatio),
              React.createElement("div",{style:{color:"#556677",fontSize:8}},parseFloat(C.stockPCRatio)>1.0?"bearish positioning":"bullish positioning")
            )
          ),
          React.createElement("div",{style:{background:"#0a0820",borderRadius:4,padding:"8px 10px",marginBottom:8,border:"1px solid #aa88ff20"}},
            React.createElement("div",{style:{color:"#aa88ff",fontSize:9,letterSpacing:2,marginBottom:4}},"POSITION SIZING — "+C.buys+"/4 AGENTS"),
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"}},
              React.createElement("span",{style:{color:"#cccccc",fontSize:11}},"Recommended max risk:"),
              React.createElement("span",{style:{color:"#ffcc00",fontSize:14,fontWeight:"bold"}},"$"+C.maxRisk+" (1 contract)")
            ),
            React.createElement("div",{style:{color:"#556677",fontSize:9,marginTop:2}},
              C.buys>=4||C.sells>=4?"4/4 agents agree — highest sizing allowed":
              C.buys>=3||C.sells>=3?"3/4 agents agree — medium sizing":
              "2/4 agents agree — minimum sizing, be cautious"
            )
          ),
          C.thetaWarning&&React.createElement("div",{style:{background:"#1a0800",borderRadius:4,padding:"7px 10px",marginBottom:8,border:"1px solid #ff884430"}},
            React.createElement("span",{style:{color:"#ff8844",fontSize:10,fontWeight:"bold"}},"THETA: "+C.thetaWarning)
          ),
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:8}},
            C.takeProfit&&React.createElement("div",{style:{background:"#001a0d",borderRadius:4,padding:"7px 10px",border:"1px solid #00ff8830"}},
              React.createElement("div",{style:{color:"#00ff88",fontSize:9,letterSpacing:1,marginBottom:2}},"TAKE PROFIT"),
              React.createElement("div",{style:{color:"#00ff88",fontSize:11,fontWeight:"bold"}},C.takeProfit)
            ),
            C.stopLoss&&React.createElement("div",{style:{background:"#1a0000",borderRadius:4,padding:"7px 10px",border:"1px solid #ff444430"}},
              React.createElement("div",{style:{color:"#ff4444",fontSize:9,letterSpacing:1,marginBottom:2}},"STOP LOSS"),
              React.createElement("div",{style:{color:"#ff6666",fontSize:11,fontWeight:"bold"}},C.stopLoss)
            )
          ),
          React.createElement("div",{style:{color:"#778899",fontSize:10,lineHeight:1.6}},C.tradeTypeReason)
        ),
        !C.passesCommittee&&React.createElement("div",{style:{background:"#1a0a00",borderRadius:6,padding:"10px 14px",marginBottom:12,border:"2px solid #ff880040",textAlign:"center"}},
          React.createElement("div",{style:{color:"#ff8844",fontSize:13,fontWeight:"bold",marginBottom:4}},"COMMITTEE REJECTED"),
          React.createElement("div",{style:{color:"#aaaaaa",fontSize:11}},"Only "+C.buys+"/4 agents agree. Need 2/4 minimum to trade. Do not buy this options play.")
        ),
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}},
          React.createElement("div",{style:{background:"#003322",border:"2px solid #00ff8850",borderRadius:6,padding:"8px",textAlign:"center"}},
            React.createElement("div",{style:{color:"#00ff8899",fontSize:9,letterSpacing:2,marginBottom:2}},"STOCK ENTRY"),
            React.createElement("div",{style:{color:"#00ff88",fontSize:11,fontWeight:"bold"}},C.entry||"-")
          ),
          React.createElement("div",{style:{background:"#001a33",border:"2px solid #00ccff50",borderRadius:6,padding:"8px",textAlign:"center"}},
            React.createElement("div",{style:{color:"#00ccff99",fontSize:9,letterSpacing:2,marginBottom:2}},"STOCK TARGET"),
            React.createElement("div",{style:{color:"#00ccff",fontSize:11,fontWeight:"bold"}},C.target||"-")
          ),
          React.createElement("div",{style:{background:"#330000",border:"2px solid #ff444450",borderRadius:6,padding:"8px",textAlign:"center"}},
            React.createElement("div",{style:{color:"#ff444499",fontSize:9,letterSpacing:2,marginBottom:2}},"STOCK STOP"),
            React.createElement("div",{style:{color:"#ff6666",fontSize:11,fontWeight:"bold"}},C.stop||"-")
          )
        ),
        C.insiderSignal&&C.insiderSignal!=="NEUTRAL"&&React.createElement("div",{style:{background:"#1a1200",borderRadius:4,padding:"6px 10px",marginBottom:8,border:"1px solid #ffaa0030"}},
          React.createElement("span",{style:{color:"#ffaa00",fontSize:9,letterSpacing:2}},"INSIDER: "),
          React.createElement("span",{style:{color:C.insiderSignal==="BUYING"?"#00ff88":"#ff4444",fontSize:11,fontWeight:"bold"}},"INSIDER "+C.insiderSignal+" — "),
          React.createElement("span",{style:{color:"#888888",fontSize:10}},C.insiderDetail)
        ),
        React.createElement("div",{style:{marginBottom:10}},
          Object.entries(C.votes).map(function(e){
            var agent=e[0],vote=e[1];
            var vc=vote.direction==="BUY"?"#00ff88":vote.direction==="SELL"?"#ff4444":"#ffcc00";
            return React.createElement("div",{key:agent,style:{marginBottom:5,padding:"6px 10px",background:"#04060e",borderRadius:3,borderLeft:"3px solid "+vc}},
              React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:2}},
                React.createElement("span",{style:{color:"#cccccc",fontSize:10,fontWeight:"bold"}},agent),
                React.createElement("span",{style:{color:vc,fontSize:10,fontWeight:"bold"}},vote.direction+" · "+((vote.conviction||0.5)*100).toFixed(0)+"%")
              ),
              React.createElement("div",{style:{color:"#aaaaaa",fontSize:10,lineHeight:1.4}},vote.reasoning),
              vote.technicals&&React.createElement("div",{style:{color:"#4488ff",fontSize:9,marginTop:2}},vote.technicals),
              vote.flowdata&&React.createElement("div",{style:{color:"#aa88ff",fontSize:9,marginTop:2}},vote.flowdata),
              vote.optionsplay&&React.createElement("div",{style:{color:"#00ff88",fontSize:9,marginTop:2,fontWeight:"bold"}},"-> "+vote.optionsplay)
            );
          })
        ),
        C.passesCommittee&&React.createElement("div",{style:{display:"flex",gap:8}},
          React.createElement("button",{style:Object.assign({},S.btn("#00ff88","linear-gradient(135deg,#003322,#006644)"),{flex:1,padding:"9px",fontSize:10}),onClick:function(){ setActiveTab("portfolio"); }},"APPROVE — LOG THIS TRADE"),
          React.createElement("button",{style:Object.assign({},S.btn("#ff4444","linear-gradient(135deg,#1a0606,#2a0000)"),{flex:1,padding:"9px",fontSize:10}),onClick:function(){
            if(manualResult&&manualResult.symbol===C.symbol) setManualResult(null);
            setScanResults(function(prev){ return prev.filter(function(r){ return r.symbol!==C.symbol; }); });
          }},"REJECT")
        )
      )
    );
  }

  function fmtBriefing(text){
    var lines=text.split("\n"),output=[];
    lines.forEach(function(line,i){
      var lt=line.trim();
      if(/^[📊🏦📅🌍⚠️💡]/.test(lt)) output.push(React.createElement("div",{key:i,style:{color:"#aa88ff",fontWeight:"bold",marginTop:20,marginBottom:8,fontSize:14,borderBottom:"2px solid #aa88ff25",paddingBottom:6}},lt));
      else if(lt.startsWith("|")&&!lt.includes("---")){
        var cells=lt.split("|").filter(function(c){ return c.trim(); });
        var isHdr=i+1<lines.length&&(lines[i+1]||"").includes("---");
        output.push(React.createElement("div",{key:i,style:{display:"grid",gridTemplateColumns:"repeat("+cells.length+",1fr)",gap:3,marginBottom:3}},
          cells.map(function(c,j){ return React.createElement("div",{key:j,style:{padding:"4px 8px",background:isHdr?"#1a1a2a":"#0c1018",border:"1px solid #1a1a2a",borderRadius:3,color:isHdr?"#aa88ff":"#cccccc",fontSize:11,textAlign:"center"}},c.trim()); })
        ));
      }
      else if(lt.startsWith("-")||lt.startsWith("*")) output.push(React.createElement("div",{key:i,style:{color:"#cccccc",paddingLeft:14,marginBottom:4,fontSize:12}},"-> "+lt.slice(1).trim()));
      else if(lt==="") output.push(React.createElement("div",{key:i,style:{height:6}}));
      else output.push(React.createElement("div",{key:i,style:{color:"#cccccc",fontSize:12,marginBottom:3,lineHeight:1.7}},lt));
    });
    return output;
  }

  var TABS=["briefing","scanner","portfolio","risk","trades","chat"];

  return (
    React.createElement("div",{style:S.app},
      React.createElement("div",{style:S.hdr},
        React.createElement("div",null,
          React.createElement("div",{style:{fontSize:9,color:"#aa88ff",letterSpacing:3}},"OPTIONS TRADING SYSTEM"),
          React.createElement("div",{style:{fontSize:18,fontWeight:"bold",color:"#fff"}},"Aidan's War Room"),
          React.createElement("div",{style:{fontSize:10,color:"#778899",marginTop:2}},
            React.createElement("span",{style:{color:"#aa88ff"}},"Robinhood Options"),
            " · Goal: ",
            React.createElement("span",{style:{color:"#ffcc00"}},"$250 -> $1K -> $5K -> $10K")
          )
        ),
        React.createElement("div",{style:{textAlign:"right"}},
          React.createElement("div",{style:{fontSize:9,color:"#444",letterSpacing:2}},"ACCOUNT VALUE"),
          React.createElement("div",{style:{fontSize:20,fontWeight:"bold",color:"#aa88ff"}},"$",totalValue.toFixed(2)),
          React.createElement("div",{style:{fontSize:11,color:"#778899"}},
            "Cash: ",React.createElement("span",{style:{color:"#00ff88",fontWeight:"bold"}},"$",cashBalance.toFixed(2)),
            " · P&L: ",React.createElement("span",{style:{color:totalPnL>=0?"#00ff88":"#ff4444",fontWeight:"bold"}},(totalPnL>=0?"+":"")+totalPnL.toFixed(2))
          )
        )
      ),

      riskAlerts.map(function(a,i){ return React.createElement("div",{key:i,style:{background:"#180808",borderBottom:"1px solid "+a.color+"60",padding:"7px 16px",fontSize:12,color:a.color,fontWeight:"bold"}},a.msg); }),

      React.createElement("div",{style:S.tkr},
        React.createElement("div",{style:{display:"inline-flex",gap:16,alignItems:"center"}},
          Object.entries(livePrices).map(function(e){
            var sym=e[0],d=e[1];
            return React.createElement("span",{key:sym,style:{display:"inline-flex",gap:4,alignItems:"center"}},
              React.createElement("span",{style:{color:"#556677",fontSize:10}},sym),
              React.createElement("span",{style:{color:"#ffffff",fontSize:11,fontWeight:"bold"}},"$"+d.price.toFixed(2)),
              React.createElement("span",{style:{color:d.change>=0?"#00ff88":"#ff4444",fontSize:10}},(d.change>=0?"^":"v")+Math.abs(d.change).toFixed(2)+"%")
            );
          }),
          React.createElement("button",{onClick:fetchLivePrices,style:{background:"none",border:"none",color:"#aa88ff25",cursor:"pointer",fontSize:13}},"R"),
          lastUpdated&&React.createElement("span",{style:{color:"#445566",fontSize:9}},lastUpdated)
        )
      ),

      React.createElement("div",{style:S.tabs},TABS.map(function(t){ return React.createElement("button",{key:t,onClick:function(){ setActiveTab(t); },style:S.tab(activeTab===t)},t); })),

      React.createElement("div",{style:{padding:14}},

        activeTab==="briefing"&&React.createElement("div",null,
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:10}},
            React.createElement("span",{style:{color:"#aa88ff",fontSize:10,letterSpacing:2}},new Date().toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"}).toUpperCase()),
            React.createElement("span",{style:{color:"#aaaaaa",fontSize:11}},"Cash: ",React.createElement("span",{style:{color:"#00ff88",fontWeight:"bold"}},"$",cashBalance.toFixed(2)))
          ),
          regime&&React.createElement("div",{style:{
            display:"flex",justifyContent:"space-between",alignItems:"center",
            padding:"6px 12px",background:"#0a0e18",borderRadius:4,
            border:"1px solid "+(regime.trade_or_wait==="TRADE"?"#00ff8830":regime.trade_or_wait==="WAIT"?"#ff444430":"#ffcc0030"),
            marginBottom:8
          }},
            React.createElement("span",{style:{color:"#556677",fontSize:10}},"Market Regime: "),
            React.createElement("span",{style:{color:regime.trade_or_wait==="TRADE"?"#00ff88":regime.trade_or_wait==="WAIT"?"#ff4444":"#ffcc00",fontSize:10,fontWeight:"bold"}},(regime.regime||"").replace(/_/g," ")),
            React.createElement("span",{style:{color:"#556677",fontSize:10,marginLeft:8}},"VIX: "),
            React.createElement("span",{style:{color:regime.vix>25?"#ff4444":regime.vix>18?"#ffcc00":"#00ff88",fontSize:10,fontWeight:"bold"}},regime.vix||"?"),
            React.createElement("span",{style:{color:regime.trade_or_wait==="TRADE"?"#00ff88":regime.trade_or_wait==="WAIT"?"#ff4444":"#ffcc00",fontSize:10,fontWeight:"bold",marginLeft:8}},regime.trade_or_wait==="TRADE"?"TRADE":"WAIT")
          ),
          React.createElement("button",{onClick:getDailyBriefing,disabled:loading,style:S.btn()},
            loading?"Searching macro data...":"GET MACRO MARKET BRIEFING"
          ),
          React.createElement("div",{style:{marginTop:8,marginBottom:12,padding:"8px 12px",background:"#0a0e18",borderRadius:4,border:"1px solid #1a1a2a",display:"flex",justifyContent:"space-between",alignItems:"center"}},
            React.createElement("span",{style:{color:"#445566",fontSize:10}},"Fed · Inflation · Geopolitics · Sector Rotation · Options Environment"),
            React.createElement("span",{style:{color:"#aa88ff",fontSize:10,cursor:"pointer"},onClick:function(){ setActiveTab("scanner"); }},"-> OPTIONS PLAYS IN SCANNER TAB")
          ),
          briefing?React.createElement("div",{style:{background:"#070a12",border:"1px solid #1a1a2a",borderRadius:6,padding:16,lineHeight:1.65}},fmtBriefing(briefing))
          :React.createElement("div",{style:{textAlign:"center",padding:50,color:"#334455",border:"1px dashed #2a2a4a",borderRadius:4}},
            React.createElement("div",{style:{fontSize:28,marginBottom:8}},""),
            React.createElement("div",{style:{fontSize:10,letterSpacing:2,color:"#aa88ff"}},"GET MACRO CONTEXT BEFORE TRADING"),
            React.createElement("div",{style:{fontSize:10,color:"#445566",marginTop:6}},"Fed · Inflation · Geopolitics · Options Environment"),
            React.createElement("div",{style:{fontSize:10,color:"#334455",marginTop:4}},"Trade ideas -> SCANNER tab")
          )
        ),

        activeTab==="scanner"&&React.createElement("div",null,
          React.createElement("div",{style:S.lbl},"AI OPTIONS SCANNER — 4-AGENT COMMITTEE"),
          React.createElement("div",{style:{fontSize:11,color:"#778899",marginBottom:8,lineHeight:1.6}},
            "Scans the entire market for the best options plays today. Runs all 4 agents on each candidate. Only plays with 2/4+ agent votes are shown. Premiums matched to your account size."
          ),
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,padding:"8px 12px",background:"#07090f",borderRadius:4,border:"1px solid #1a2a3a"}},
            React.createElement("div",null,
              React.createElement("span",{style:{color:"#556677",fontSize:9,letterSpacing:1}},"BUDGET TIER: "),
              React.createElement("span",{style:{color:"#ffcc00",fontSize:10,fontWeight:"bold"}},
                cashBalance<300?"MICRO — stocks under $80":
                cashBalance<500?"SMALL — stocks under $120":
                cashBalance<1000?"GROWING — stocks under $200":
                cashBalance<3000?"ESTABLISHED — stocks under $350":
                "ADVANCED — full universe"
              )
            ),
            React.createElement("div",null,
              React.createElement("span",{style:{color:"#556677",fontSize:9,letterSpacing:1}},"MAX PREMIUM: "),
              React.createElement("span",{style:{color:"#00ff88",fontSize:10,fontWeight:"bold"}},
                cashBalance<300?"$100/contract":
                cashBalance<500?"$150/contract":
                cashBalance<1000?"$250/contract":
                cashBalance<3000?"$400/contract":
                "$800/contract"
              ),
              React.createElement("span",{style:{color:"#334455",fontSize:9,marginLeft:8}},"unlocks with account growth")
            )
          ),

          React.createElement("div",{style:{background:"#07090f",border:"1px solid #1a2a3a",borderRadius:6,padding:"12px 14px",marginBottom:12}},
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}},
              React.createElement("span",{style:{color:"#00ccff",fontSize:10,letterSpacing:2}},"OPTIONCHARTS DATA — SPY MARKET INPUTS"),
              optionsInputSaved&&React.createElement("span",{style:{color:"#00ff88",fontSize:10}},"SAVED")
            ),
            React.createElement("div",{style:{fontSize:10,color:"#445566",marginBottom:10}},"Enter from optioncharts.io/options/SPY before running regime. Takes 30 seconds and makes regime significantly more accurate."),
            React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:6}},
              React.createElement("div",null,
                React.createElement("div",{style:{color:"#556677",fontSize:9,letterSpacing:1,marginBottom:3}},"SPY IV RANK (0-100)"),
                React.createElement("div",{style:{color:"#334455",fontSize:8,marginBottom:4}},"Under 30 = cheap  |  30-60 = normal  |  60+ = expensive"),
                React.createElement("input",{
                  placeholder:"e.g. 42",
                  value:spyIVRank,
                  onChange:function(e){ setSpyIVRank(e.target.value); },
                  style:Object.assign({},S.inp,{
                    borderColor:spyIVRank?(parseFloat(spyIVRank)<30?"#00ff8860":parseFloat(spyIVRank)>60?"#ff444460":"#ffcc0060"):"#1a1a2a"
                  })
                }),
                spyIVRank&&React.createElement("div",{style:{fontSize:9,marginTop:3,color:parseFloat(spyIVRank)<30?"#00ff88":parseFloat(spyIVRank)>60?"#ff4444":"#ffcc00"}},
                  parseFloat(spyIVRank)<30?"Premiums cheap — good time to buy":parseFloat(spyIVRank)>60?"Premiums expensive — size down":"Premiums normal"
                )
              ),
              React.createElement("div",null,
                React.createElement("div",{style:{color:"#556677",fontSize:9,letterSpacing:1,marginBottom:3}},"SPY PUT/CALL RATIO"),
                React.createElement("div",{style:{color:"#334455",fontSize:8,marginBottom:4}},"Under 0.7 = bullish  |  0.7-1.0 = neutral  |  1.0+ = fear"),
                React.createElement("input",{
                  placeholder:"e.g. 0.85",
                  value:spyPCRatio,
                  onChange:function(e){ setSpyPCRatio(e.target.value); },
                  style:Object.assign({},S.inp,{
                    borderColor:spyPCRatio?(parseFloat(spyPCRatio)<0.7?"#00ff8860":parseFloat(spyPCRatio)>1.0?"#ff444460":"#ffcc0060"):"#1a1a2a"
                  })
                }),
                spyPCRatio&&React.createElement("div",{style:{fontSize:9,marginTop:3,color:parseFloat(spyPCRatio)<0.7?"#00ff88":parseFloat(spyPCRatio)>1.0?"#ff4444":"#ffcc00"}},
                  parseFloat(spyPCRatio)<0.7?"Market bullish — calls favored":parseFloat(spyPCRatio)>1.5?"Extreme fear — potential reversal":parseFloat(spyPCRatio)>1.0?"Fear rising — lean bearish":"Neutral positioning"
                )
              )
            ),
            React.createElement("div",{style:{marginBottom:8}},
              React.createElement("div",{style:{color:"#556677",fontSize:9,letterSpacing:1,marginBottom:3}},"UNUSUAL ACTIVITY (optional — from Market Trends tab)"),
              React.createElement("input",{
                placeholder:"e.g. NVDA unusual call volume 5x, XLE put sweep",
                value:unusualTicker,
                onChange:function(e){ setUnusualTicker(e.target.value); },
                style:S.inp
              })
            ),
            React.createElement("button",{
              onClick:saveOptionsInputs,
              style:Object.assign({},S.btn("#00ccff","linear-gradient(135deg,#001a2a,#002a3a)"),{padding:"8px",fontSize:10})
            },"SAVE — REGIME WILL USE THESE INPUTS")
          ),

          React.createElement("div",{style:{marginBottom:12}},
            React.createElement("button",{onClick:runRegimeFilter,disabled:regimeLoading,style:Object.assign({},S.btn("#ffcc00","linear-gradient(135deg,#1a1400,#2a2000)"),{marginBottom:8})},
              regimeLoading?"ANALYZING MARKET REGIME...":"CHECK MARKET REGIME FIRST"
            ),
            briefing&&React.createElement("div",{style:{background:"#001a0d",borderRadius:3,padding:"5px 10px",marginBottom:6,border:"1px solid #00ff8820"}},
              React.createElement("span",{style:{color:"#00ff88",fontSize:9,letterSpacing:1}},"BRIEFING LOADED: "),
              React.createElement("span",{style:{color:"#445566",fontSize:9}},"Macro context from today's briefing will be used in regime analysis")
            ),
            (spyIVRank||spyPCRatio)&&React.createElement("div",{style:{background:"#001a2a",borderRadius:3,padding:"5px 10px",marginBottom:6,border:"1px solid #00ccff20"}},
              React.createElement("span",{style:{color:"#00ccff",fontSize:9,letterSpacing:1}},"OPTIONS DATA LOADED: "),
              React.createElement("span",{style:{color:"#445566",fontSize:9}},
                spyIVRank?"IV Rank: "+spyIVRank+" ":"",
                spyPCRatio?"P/C: "+spyPCRatio+" ":"",
                unusualTicker?"Unusual: "+unusualTicker:""
              )
            ),
            regime&&React.createElement("div",{style:{
              background:regime.trade_or_wait==="TRADE"?"#001a0d":regime.trade_or_wait==="WAIT"?"#1a0000":"#0a0a0a",
              borderRadius:6,padding:"12px 14px",
              border:"2px solid "+(regime.trade_or_wait==="TRADE"?"#00ff8860":regime.trade_or_wait==="WAIT"?"#ff444460":"#ffcc0060")
            }},
              React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}},
                React.createElement("span",{style:{color:"#888",fontSize:9,letterSpacing:2}},"MARKET REGIME"),
                React.createElement("span",{style:{
                  color:regime.trade_or_wait==="TRADE"?"#00ff88":regime.trade_or_wait==="WAIT"?"#ff4444":"#ffcc00",
                  fontSize:16,fontWeight:"bold"
                }},
                  regime.trade_or_wait==="TRADE"?"CONDITIONS FAVORABLE":
                  regime.trade_or_wait==="WAIT"?"WAIT — BAD CONDITIONS":"CAUTION"
                )
              ),
              React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:10}},
                React.createElement("div",{style:{background:"#ffffff08",borderRadius:4,padding:"6px 8px",textAlign:"center"}},
                  React.createElement("div",{style:{color:"#555",fontSize:9,marginBottom:2}},"REGIME"),
                  React.createElement("div",{style:{color:"#aa88ff",fontSize:11,fontWeight:"bold"}},(regime.regime||"?").replace(/_/g," "))
                ),
                React.createElement("div",{style:{background:"#ffffff08",borderRadius:4,padding:"6px 8px",textAlign:"center"}},
                  React.createElement("div",{style:{color:"#555",fontSize:9,marginBottom:2}},"VIX"),
                  React.createElement("div",{style:{
                    color:regime.vix>25?"#ff4444":regime.vix>18?"#ffcc00":"#00ff88",
                    fontSize:11,fontWeight:"bold"
                  }},regime.vix||"?",React.createElement("span",{style:{fontSize:9,marginLeft:4}},regime.vix_direction||""))
                ),
                React.createElement("div",{style:{background:"#ffffff08",borderRadius:4,padding:"6px 8px",textAlign:"center"}},
                  React.createElement("div",{style:{color:"#555",fontSize:9,marginBottom:2}},"BIAS"),
                  React.createElement("div",{style:{
                    color:regime.bias==="CALLS"?"#00ff88":regime.bias==="PUTS"?"#ff4444":"#ffcc00",
                    fontSize:11,fontWeight:"bold"
                  }},regime.bias||"NEUTRAL")
                )
              ),
              (regime.iv_rank_warning||regime.pc_ratio_signal||regime.macro_override)&&React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:4,marginBottom:8}},
                regime.iv_rank_warning&&regime.iv_rank_warning!==""&&React.createElement("div",{style:{background:"#1a0800",borderRadius:3,padding:"5px 8px",border:"1px solid #ff884430"}},
                  React.createElement("span",{style:{color:"#ff8844",fontSize:9,letterSpacing:1}},"IV RANK: "),
                  React.createElement("span",{style:{color:"#ffaa66",fontSize:9}},regime.iv_rank_warning)
                ),
                regime.pc_ratio_signal&&regime.pc_ratio_signal!==""&&React.createElement("div",{style:{background:"#1a1400",borderRadius:3,padding:"5px 8px",border:"1px solid #ffcc0030"}},
                  React.createElement("span",{style:{color:"#ffcc00",fontSize:9,letterSpacing:1}},"PUT/CALL: "),
                  React.createElement("span",{style:{color:"#ddaa44",fontSize:9}},regime.pc_ratio_signal)
                ),
                regime.macro_override&&regime.macro_override!==""&&React.createElement("div",{style:{background:"#1a0000",borderRadius:3,padding:"5px 8px",border:"1px solid #ff444430"}},
                  React.createElement("span",{style:{color:"#ff4444",fontSize:9,letterSpacing:1}},"MACRO OVERRIDE: "),
                  React.createElement("span",{style:{color:"#ff8888",fontSize:9}},regime.macro_override)
                )
              ),
              React.createElement("div",{style:{color:"#cccccc",fontSize:11,lineHeight:1.6,marginBottom:6}},regime.regime_summary),
              regime.best_strategy&&React.createElement("div",{style:{background:"#ffffff06",borderRadius:3,padding:"6px 8px",marginBottom:4}},
                React.createElement("span",{style:{color:"#00ff88",fontSize:9,letterSpacing:1}},"BEST STRATEGY: "),
                React.createElement("span",{style:{color:"#aaaaaa",fontSize:10}},regime.best_strategy)
              ),
              regime.avoid&&React.createElement("div",{style:{background:"#ffffff06",borderRadius:3,padding:"6px 8px",marginBottom:4}},
                React.createElement("span",{style:{color:"#ff4444",fontSize:9,letterSpacing:1}},"AVOID: "),
                React.createElement("span",{style:{color:"#aaaaaa",fontSize:10}},regime.avoid)
              ),
              regime.trade_or_wait==="WAIT"&&regime.wait_reason&&React.createElement("div",{style:{background:"#1a0000",borderRadius:3,padding:"6px 8px",border:"1px solid #ff444430"}},
                React.createElement("span",{style:{color:"#ff4444",fontSize:10,fontWeight:"bold"}},"WHY WAIT: "),
                React.createElement("span",{style:{color:"#ff8888",fontSize:10}},regime.wait_reason)
              )
            )
          ),
          React.createElement("button",{onClick:runMarketScan,disabled:scanLoading||(regime&&regime.trade_or_wait==="WAIT"),style:Object.assign({},S.btn(),(regime&&regime.trade_or_wait==="WAIT")?{opacity:0.4,cursor:"not-allowed"}:{})},
            scanLoading?"SCANNING... (2-3 minutes, running in batches)":regime&&regime.trade_or_wait==="WAIT"?"SCAN BLOCKED — BAD MARKET CONDITIONS":regime&&regime.regime==="TRENDING_BEAR"?"SCAN — HUNTING PUTS (BEARISH REGIME)":regime&&regime.regime==="HIGH_VOLATILITY"?"SCAN — BINARY EVENT PLAYS ONLY":regime&&regime.regime==="EVENT_DRIVEN"?"SCAN — CATALYST PLAYS ONLY":regime&&regime.regime==="CHOPPY_NEUTRAL"?"SCAN — CONSERVATIVE MODE":"SCAN — HUNTING CALLS (BULL REGIME)"
          ),
          scanStatus&&React.createElement("div",{style:{marginTop:8,marginBottom:8,padding:"8px 12px",background:"#0a0e18",borderRadius:4,border:"1px solid #1a1a2a",color:scanLoading?"#ffcc00":"#aa88ff",fontSize:11,letterSpacing:1}},scanStatus),
          scanResults.length>0&&React.createElement("div",{style:{marginTop:12}},
            React.createElement("div",{style:{color:"#aa88ff",fontSize:10,letterSpacing:2,marginBottom:12,padding:"6px 10px",background:"#0d0820",borderRadius:4,border:"1px solid #aa88ff30"}},
              scanResults.length+" COMMITTEE-APPROVED OPTIONS PLAY"+(scanResults.length>1?"S":"")
            ),
            scanResults.map(function(result,idx){ return renderVerdictCard(result,"scan"+idx); })
          ),
          React.createElement("div",{style:Object.assign({},S.card,{marginTop:20,border:"1px solid #1a1a3a"})},
            React.createElement("div",{style:S.lbl},"MANUAL SYMBOL CHECK"),
            React.createElement("div",{style:{fontSize:10,color:"#445566",marginBottom:8}},"Check a specific stock for an options play. All 4 agents analyze it."),
            React.createElement("div",{style:{display:"flex",gap:6}},
              React.createElement("input",{placeholder:"e.g. NVDA, SOFI, AMD",value:manualSymbol,onChange:function(e){ setManualSymbol(e.target.value.toUpperCase()); },onKeyDown:function(e){ if(e.key==="Enter") runManualSymbol(); },style:Object.assign({},S.inp,{flex:1})}),
              React.createElement("button",{onClick:runManualSymbol,disabled:manualLoading||!manualSymbol,style:Object.assign({},S.btn("#4488ff","linear-gradient(135deg,#080f28,#001055)"),{width:"auto",padding:"8px 16px",fontSize:10})},
                manualLoading?"...":"RUN AGENTS"
              )
            ),
            manualResult&&React.createElement("div",{style:{marginTop:12}},renderVerdictCard(manualResult,"manual"))
          )
        ),

        activeTab==="portfolio"&&React.createElement("div",null,
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:12}},
            [["CASH","$"+cashBalance.toFixed(2),"#00ff88"],["AT RISK","$"+totalPremiumAtRisk.toFixed(2),"#ff8844"],["TOTAL","$"+totalValue.toFixed(2),"#aa88ff"]].map(function(item){
              return React.createElement("div",{key:item[0],style:{background:"#06080f",border:"1px solid #0a0a1a",borderRadius:4,padding:"10px",textAlign:"center"}},
                React.createElement("div",{style:{color:"#556677",fontSize:9,letterSpacing:2,marginBottom:3}},item[0]),
                React.createElement("div",{style:{color:item[2],fontSize:15,fontWeight:"bold"}},item[1])
              );
            })
          ),
          React.createElement("div",{style:{marginBottom:12}},
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}},
              React.createElement("span",{style:S.lbl},"OPEN OPTIONS POSITIONS (",optionsPositions.length,")")
            ),
            optionsPositions.length===0?React.createElement("div",{style:{textAlign:"center",padding:30,color:"#334455",border:"1px dashed #2a2a4a",borderRadius:4}},
              React.createElement("div",{style:{fontSize:24,marginBottom:8}},""),
              React.createElement("div",{style:{fontSize:10,letterSpacing:2,color:"#aa88ff"}},"NO OPEN POSITIONS"),
              React.createElement("div",{style:{fontSize:10,color:"#445566",marginTop:6}},"Use scanner to find plays, then log them below")
            ):optionsPositions.map(function(o,idx){
              var days=getDaysUntilExpiry(o.expiry);
              var uc=days!==null&&days<=0?"#ff0000":days!==null&&days<=1?"#ff2222":days!==null&&days<=2?"#ffaa00":"#aa88ff";
              var totalCost=o.contracts*o.premium*100;
              return React.createElement("div",{key:idx,style:{background:"#0a0e18",border:"2px solid "+uc+"40",borderRadius:8,padding:14,marginBottom:10,borderLeft:"4px solid "+uc}},
                React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}},
                  React.createElement("div",null,
                    React.createElement("span",{style:{color:"#fff",fontWeight:"bold",fontSize:16}},o.symbol),
                    React.createElement("span",{style:{color:o.optionType==="CALL"?"#00ff88":"#ff4444",fontWeight:"bold",fontSize:14,marginLeft:8}},o.optionType),
                    React.createElement("span",{style:{color:"#cccccc",fontSize:13,marginLeft:6}},"$"+o.strike+" strike")
                  ),
                  React.createElement("span",{style:{color:uc,fontSize:12,fontWeight:"bold"}},(days!==null?(days<=0?"EXPIRED":days+" days left"):"exp: "+o.expiry))
                ),
                React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6,marginBottom:10}},
                  React.createElement("div",{style:{background:"#ffffff08",borderRadius:4,padding:"6px 8px",textAlign:"center"}},React.createElement("div",{style:{color:"#555",fontSize:9,marginBottom:2}},"CONTRACTS"),React.createElement("div",{style:{color:"#ccc",fontSize:14,fontWeight:"bold"}},o.contracts)),
                  React.createElement("div",{style:{background:"#ffffff08",borderRadius:4,padding:"6px 8px",textAlign:"center"}},React.createElement("div",{style:{color:"#555",fontSize:9,marginBottom:2}},"PAID/SHARE"),React.createElement("div",{style:{color:"#ffcc00",fontSize:14,fontWeight:"bold"}},"$"+o.premium)),
                  React.createElement("div",{style:{background:"#ffffff08",borderRadius:4,padding:"6px 8px",textAlign:"center"}},React.createElement("div",{style:{color:"#555",fontSize:9,marginBottom:2}},"TOTAL COST"),React.createElement("div",{style:{color:"#ffcc00",fontSize:14,fontWeight:"bold"}},"$"+totalCost.toFixed(0))),
                  React.createElement("div",{style:{background:"#ff000015",borderRadius:4,padding:"6px 8px",textAlign:"center",border:"1px solid #ff444420"}},React.createElement("div",{style:{color:"#ff4444aa",fontSize:9,marginBottom:2}},"MAX LOSS"),React.createElement("div",{style:{color:"#ff6666",fontSize:14,fontWeight:"bold"}},"$"+totalCost.toFixed(0)))
                ),
                days!==null&&days<=1&&React.createElement("div",{style:{background:"#2a0000",borderRadius:4,padding:"8px 10px",marginBottom:8,border:"1px solid #ff222240",textAlign:"center"}},
                  React.createElement("span",{style:{color:"#ff2222",fontSize:12,fontWeight:"bold"}},(days<=0?"EXPIRED — ":"EXPIRING TODAY — ")+"CLOSE ON ROBINHOOD NOW OR LOSE EVERYTHING")
                ),
                o.note&&React.createElement("div",{style:{color:"#667788",fontSize:10,marginBottom:8}},o.note),
                React.createElement("div",{style:{display:"flex",gap:6}},
                  React.createElement("input",{placeholder:"Close price (what you sold for e.g. 3.50)",id:"close_"+idx,style:Object.assign({},S.inp,{flex:1,fontSize:11})}),
                  React.createElement("button",{
                    onClick:function(ci){ return function(){ var cp=document.getElementById("close_"+ci).value; closeOptionPosition(ci,cp||"0"); }; }(idx),
                    style:Object.assign({},S.btn("#ff8844","linear-gradient(135deg,#1a0800,#2a1000)"),{width:"auto",padding:"8px 14px",fontSize:10})
                  },"CLOSE POSITION")
                )
              );
            })
          ),
          React.createElement("div",{style:Object.assign({},S.card,{border:"2px solid #aa88ff30"})},
            React.createElement("div",{style:S.lbl},"LOG OPTIONS TRADE (BUY TO OPEN)"),
            React.createElement("div",{style:{fontSize:10,color:"#445566",marginBottom:10}},"After executing on Robinhood, log it here to track it."),
            React.createElement("div",{style:{display:"flex",gap:6,marginBottom:6}},
              React.createElement("input",{placeholder:"SYMBOL",value:optionForm.symbol,onChange:function(e){ setOptionForm(Object.assign({},optionForm,{symbol:e.target.value.toUpperCase()})); },style:Object.assign({},S.inp,{flex:1})}),
              React.createElement("select",{value:optionForm.type,onChange:function(e){ setOptionForm(Object.assign({},optionForm,{type:e.target.value})); },style:Object.assign({},S.inp,{width:"auto",color:optionForm.type==="CALL"?"#00ff88":"#ff4444"})},
                React.createElement("option",{value:"CALL"},"CALL"),
                React.createElement("option",{value:"PUT"},"PUT")
              )
            ),
            React.createElement("div",{style:{display:"flex",gap:6,marginBottom:6}},
              React.createElement("input",{placeholder:"Strike e.g. 220",type:"number",value:optionForm.strike,onChange:function(e){ setOptionForm(Object.assign({},optionForm,{strike:e.target.value})); },style:Object.assign({},S.inp,{flex:1})}),
              React.createElement("input",{placeholder:"Expiry e.g. 2026-05-20",value:optionForm.expiry,onChange:function(e){ setOptionForm(Object.assign({},optionForm,{expiry:e.target.value})); },style:Object.assign({},S.inp,{flex:1})})
            ),
            React.createElement("div",{style:{display:"flex",gap:6,marginBottom:6}},
              React.createElement("input",{placeholder:"Contracts e.g. 1",type:"number",value:optionForm.contracts,onChange:function(e){ setOptionForm(Object.assign({},optionForm,{contracts:e.target.value})); },style:Object.assign({},S.inp,{flex:1})}),
              React.createElement("input",{placeholder:"Premium paid e.g. 1.50",type:"number",value:optionForm.premium,onChange:function(e){ setOptionForm(Object.assign({},optionForm,{premium:e.target.value})); },style:Object.assign({},S.inp,{flex:1})})
            ),
            optionForm.contracts&&optionForm.premium&&React.createElement("div",{style:{background:"#0d0820",borderRadius:4,padding:"8px 10px",marginBottom:8,border:"1px solid #aa88ff20",display:"flex",justifyContent:"space-between",alignItems:"center"}},
              React.createElement("span",{style:{color:"#aa88ff",fontSize:11}},"Total cost: "),
              React.createElement("span",{style:{color:parseInt(optionForm.contracts||1)*parseFloat(optionForm.premium||0)*100>cashBalance?"#ff4444":"#ffcc00",fontWeight:"bold",fontSize:15}},"$"+(parseInt(optionForm.contracts||1)*parseFloat(optionForm.premium||0)*100).toFixed(0)),
              React.createElement("span",{style:{color:"#445566",fontSize:10}},"of $"+cashBalance.toFixed(2)+" available")
            ),
            React.createElement("input",{placeholder:"Note e.g. Scanner approved 3/4 bullish MACD crossover",value:optionForm.note,onChange:function(e){ setOptionForm(Object.assign({},optionForm,{note:e.target.value})); },style:Object.assign({},S.inp,{marginBottom:8})}),
            React.createElement("button",{onClick:logOptionTrade,style:S.btn()},"CONFIRM — LOG OPTIONS TRADE")
          ),
          React.createElement("div",{style:Object.assign({},S.card,{marginTop:8,border:"1px solid #1a2a3a"})},
            React.createElement("div",{style:S.lbl},"SET CASH BALANCE"),
            React.createElement("div",{style:{fontSize:10,color:"#445566",marginBottom:8}},"Update when you add or withdraw funds from Robinhood."),
            React.createElement("div",{style:{display:"flex",gap:8}},
              React.createElement("input",{placeholder:"Enter cash balance e.g. 250",type:"number",id:"cashInput",style:Object.assign({},S.inp,{flex:1})}),
              React.createElement("button",{onClick:function(){
                var val=parseFloat(document.getElementById("cashInput").value);
                if(!isNaN(val)&&val>=0){ setCashBalance(val); saveToDb("ca3",String(val)); document.getElementById("cashInput").value=""; }
              },style:Object.assign({},S.btn("#4488ff","linear-gradient(135deg,#060e24,#000e44)"),{width:"auto",padding:"0 16px"})},"SET")
            )
          )
        ),

        activeTab==="risk"&&React.createElement("div",null,
          React.createElement("div",{style:S.lbl},"RISK MANAGEMENT"),
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:12}},
            [
              ["Cash Available","$"+cashBalance.toFixed(2),"#00ff88"],
              ["Premium At Risk","$"+totalPremiumAtRisk.toFixed(2),"#ff8844"],
              ["Account Total","$"+totalValue.toFixed(2),"#aa88ff"],
              ["Realized P&L",(totalPnL>=0?"+":"")+"$"+totalPnL.toFixed(2),totalPnL>=0?"#00ff88":"#ff4444"],
              ["Open Positions",optionsPositions.length+" contracts","#cccccc"],
              ["Cash %",totalValue>0?((cashBalance/totalValue)*100).toFixed(0)+"%":"100%",cashBalance/totalValue>0.5?"#00ff88":"#ffcc00"],
              ["Goal Progress","$"+totalValue.toFixed(0)+" / $1,000",totalValue>=1000?"#00ff88":"#aa88ff"],
              ["To Goal $1K","$"+(Math.max(0,1000-totalValue)).toFixed(2),totalValue>=1000?"#00ff88":"#ffcc00"],
            ].map(function(item){
              return React.createElement("div",{key:item[0],style:{background:"#05070e",border:"1px solid #0a0a1a",borderRadius:4,padding:"8px 10px"}},
                React.createElement("div",{style:{color:"#667788",fontSize:9,letterSpacing:1,marginBottom:3}},item[0]),
                React.createElement("div",{style:{color:item[2],fontSize:13,fontWeight:"bold"}},item[1])
              );
            })
          ),
          React.createElement("div",{style:S.card},
            React.createElement("div",{style:S.lbl},"OPTIONS RULES"),
            [
              {label:"Max per trade",rule:"$"+Math.min(cashBalance*0.4,300).toFixed(0)+" (40% of cash)"},
              {label:"Contracts per trade",rule:"1 contract until $1,000"},
              {label:"Min agent votes",rule:"2/4 agents must agree"},
              {label:"Max expiry",rule:"7 days out maximum"},
              {label:"Take profit at",rule:"50%+ gain — don't get greedy"},
              {label:"Never hold to expiry",rule:"Sell the day before at latest"},
            ].map(function(r){
              return React.createElement("div",{key:r.label,style:{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #08080a"}},
                React.createElement("span",{style:{color:"#aaaaaa",fontSize:11}},r.label),
                React.createElement("span",{style:{color:"#778899",fontSize:11}},r.rule)
              );
            })
          ),
          React.createElement("div",{style:S.card},
            React.createElement("div",{style:S.lbl},"ACTIVE ALERTS (",riskAlerts.length,")"),
            riskAlerts.length===0?React.createElement("div",{style:{color:"#aa88ff66",fontSize:12,textAlign:"center",padding:20}},"All clear — no active risk alerts")
            :riskAlerts.map(function(a,idx){
              return React.createElement("div",{key:idx,style:{padding:"7px 10px",background:"#05070e",borderRadius:3,marginBottom:6,borderLeft:"3px solid "+a.color}},
                React.createElement("div",{style:{color:a.color,fontSize:11,fontWeight:"bold"}},a.msg)
              );
            })
          ),
          optionsPositions.length>0&&React.createElement("div",{style:S.card},
            React.createElement("div",{style:S.lbl},"OPEN POSITIONS EXPIRY TRACKER"),
            optionsPositions.map(function(o,idx){
              var days=getDaysUntilExpiry(o.expiry);
              var uc=days!==null&&days<=0?"#ff0000":days!==null&&days<=1?"#ff2222":days!==null&&days<=2?"#ffaa00":"#aa88ff";
              return React.createElement("div",{key:idx,style:{padding:"8px 10px",background:"#04060e",borderRadius:3,marginBottom:6,borderLeft:"3px solid "+uc}},
                React.createElement("div",{style:{display:"flex",justifyContent:"space-between"}},
                  React.createElement("span",{style:{color:"#ddd",fontWeight:"bold",fontSize:12}},o.symbol+" "+o.optionType+" $"+o.strike),
                  React.createElement("span",{style:{color:uc,fontSize:11,fontWeight:"bold"}},(days!==null?(days<=0?"EXPIRED":days+" days left"):"exp: "+o.expiry))
                ),
                React.createElement("div",{style:{color:"#667788",fontSize:10,marginTop:2}},o.contracts+" contract · paid $"+o.premium+" · total at risk $"+(o.contracts*o.premium*100).toFixed(0))
              );
            })
          ),
          React.createElement("div",{style:S.card},
            React.createElement("div",{style:S.lbl},"MILESTONE TRACKER"),
            [[250,1000],[1000,5000],[5000,10000]].map(function(m){
              var from=m[0],to=m[1];
              var pct=Math.min(100,Math.max(0,((totalValue-from)/(to-from))*100));
              var active=totalValue>=from&&totalValue<to;
              var done=totalValue>=to;
              return React.createElement("div",{key:from,style:{marginBottom:10,padding:"8px 10px",background:active?"#0d0820":"#04060e",borderRadius:4,border:active?"1px solid #aa88ff30":"1px solid #08080a"}},
                React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:4}},
                  React.createElement("span",{style:{color:done?"#00ff88":active?"#aa88ff":"#445566",fontSize:11,fontWeight:"bold"}},(done?"DONE ":""),"$"+from+" -> $"+to),
                  React.createElement("span",{style:{color:done?"#00ff88":active?"#ffcc00":"#445566",fontSize:11}},(done?"COMPLETE":active?pct.toFixed(0)+"%":"LOCKED"))
                ),
                React.createElement("div",{style:{height:4,background:"#08080a",borderRadius:2}},
                  React.createElement("div",{style:{width:pct+"%",height:"100%",background:done?"#00ff88":active?"#aa88ff":"#223333",borderRadius:2,transition:"width 0.5s"}})
                )
              );
            })
          )
        ),

        activeTab==="trades"&&React.createElement("div",null,

          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6,marginBottom:12}},
            [
              ["REALIZED P&L",(totalPnL>=0?"+":"")+totalPnL.toFixed(2),totalPnL>=0?"#00ff88":"#ff4444"],
              ["WIN RATE",winRate+(winRate!=="--"?"%":""),"#aa88ff"],
              ["CLOSED TRADES",closedTrades.length,"#cccccc"],
              ["AVG HOLD",avgHoldDays+(avgHoldDays!=="--"?" days":""),"#ffcc00"],
            ].map(function(item){
              return React.createElement("div",{key:item[0],style:{background:"#05070e",border:"1px solid #0a0a1a",borderRadius:4,padding:"8px 10px",textAlign:"center"}},
                React.createElement("div",{style:{color:"#556677",fontSize:8,letterSpacing:1,marginBottom:3}},item[0]),
                React.createElement("div",{style:{color:item[2],fontSize:13,fontWeight:"bold"}},item[1])
              );
            })
          ),

          React.createElement("button",{
            onClick:function(){ setJournalOpen(function(o){ return !o; }); },
            style:Object.assign({},S.btn("#00ccff","linear-gradient(135deg,#001a2a,#002a3a)"),{marginBottom:10,padding:"10px",fontSize:10})
          },journalOpen?"CANCEL SESSION LOG":"LOG TODAY'S SESSION — TRADE OR NO TRADE"),

          journalOpen&&React.createElement("div",{style:{background:"#07090f",border:"1px solid #00ccff30",borderRadius:6,padding:"12px 14px",marginBottom:12}},
            React.createElement("div",{style:{color:"#00ccff",fontSize:10,letterSpacing:2,marginBottom:10}},"SESSION LOG — "+new Date().toLocaleDateString()),
            React.createElement("div",{style:{marginBottom:8}},
              React.createElement("div",{style:{color:"#556677",fontSize:9,letterSpacing:1,marginBottom:6}},"SESSION STATUS"),
              React.createElement("div",{style:{display:"flex",gap:6}},
                ["TRADED","NO_TRADE","PARTIAL"].map(function(s){
                  var label=s==="NO_TRADE"?"NO TRADE":s==="PARTIAL"?"PARTIAL DAY":s;
                  var sc=s==="TRADED"?"#00ff88":s==="PARTIAL"?"#ffcc00":"#ff8844";
                  return React.createElement("button",{key:s,
                    onClick:function(){ setJournalForm(function(f){ return Object.assign({},f,{status:s}); }); },
                    style:{flex:1,padding:"8px 4px",background:journalForm.status===s?"#0a1a0a":"#04060e",
                      border:"1px solid "+(journalForm.status===s?sc+"80":sc+"20"),
                      color:journalForm.status===s?sc:"#445566",fontSize:9,cursor:"pointer",borderRadius:3,fontFamily:"inherit",letterSpacing:1}
                  },label);
                })
              )
            ),
            React.createElement("div",{style:{marginBottom:8}},
              React.createElement("div",{style:{color:"#556677",fontSize:9,letterSpacing:1,marginBottom:4}},
                journalForm.status==="NO_TRADE"?"WHY NO TRADE TODAY":"SESSION NOTES"
              ),
              React.createElement("input",{
                type:"text",
                placeholder:journalForm.status==="NO_TRADE"
                  ?"Why no trade? e.g. Regime WAIT, P/C 2.22, waiting for NVDA earnings"
                  :"Notes e.g. Took SOFI call 3/4 agents, choppy open but held support",
                value:journalForm.notes,
                onChange:function(e){ setJournalForm(function(f){ return Object.assign({},f,{notes:e.target.value}); }); },
                style:Object.assign({},S.inp,{fontSize:11})
              }),
              regime&&React.createElement("div",{style:{fontSize:9,color:"#334455",marginTop:4}},
                "Regime auto-saved: "+(regime.regime||"UNKNOWN").replace(/_/g," ")+" | VIX: "+(regime.vix||"?")+" | Bias: "+(regime.bias||"?")
              )
            ),
            React.createElement("button",{
              onClick:logSession,
              disabled:!journalForm.notes.trim(),
              style:Object.assign({},S.btn("#00ff88","linear-gradient(135deg,#001a0d,#003322)"),{padding:"10px",fontSize:10})
            },"SAVE SESSION LOG")
          ),

          (trades.length===0&&sessionJournal.length===0)?React.createElement("div",{style:{textAlign:"center",padding:40,color:"#334455",border:"1px dashed #2a2a4a",borderRadius:4}},
            React.createElement("div",{style:{fontSize:10,letterSpacing:2,color:"#aa88ff"}},"NO HISTORY YET"),
            React.createElement("div",{style:{fontSize:10,color:"#445566",marginTop:6}},"Trades and session logs will appear here grouped by day")
          ):allDates.map(function(date){
            var dayTrades=trades.filter(function(t){ return t.date===date; });
            var dayJournal=sessionJournal.find(function(j){ return j.date===date; });
            var dayClosedPnL=dayTrades.filter(function(t){ return t.action==="SELL"&&t.pnl; }).reduce(function(s,t){ return s+(t.pnl||0); },0);
            var hasClosedTrades=dayTrades.some(function(t){ return t.action==="SELL"; });
            var statusColor=dayJournal?(dayJournal.status==="TRADED"?"#00ff88":dayJournal.status==="PARTIAL"?"#ffcc00":"#ff8844"):"#334455";

            return React.createElement("div",{key:date,style:{marginBottom:16}},

              React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 10px",background:"#0a0e18",borderRadius:4,marginBottom:8,borderLeft:"3px solid "+(dayJournal?statusColor:"#1a1a2a")}},
                React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10}},
                  React.createElement("span",{style:{color:"#aa88ff",fontSize:11,fontWeight:"bold"}},date),
                  dayJournal&&React.createElement("span",{style:{color:statusColor,fontSize:9,letterSpacing:1}},
                    dayJournal.status==="NO_TRADE"?"NO TRADE":dayJournal.status==="PARTIAL"?"PARTIAL":""
                  ),
                  dayJournal&&dayJournal.regime&&React.createElement("span",{style:{color:"#334455",fontSize:9}},dayJournal.regime.replace(/_/g," "))
                ),
                React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8}},
                  hasClosedTrades&&React.createElement("span",{style:{color:dayClosedPnL>=0?"#00ff88":"#ff4444",fontSize:11,fontWeight:"bold"}},(dayClosedPnL>=0?"+":"")+dayClosedPnL.toFixed(2)+" closed"),
                  dayTrades.length>0&&React.createElement("span",{style:{color:"#445566",fontSize:9}},dayTrades.length+" trade"+(dayTrades.length>1?"s":"")),
                  dayJournal&&React.createElement("button",{
                    onClick:function(d){ return function(){ if(window.confirm("Delete this session log?")) deleteJournalEntry(d); }; }(date),
                    style:{background:"none",border:"none",color:"#334455",fontSize:9,cursor:"pointer",fontFamily:"inherit"}
                  },"x")
                )
              ),

              dayJournal&&dayJournal.notes&&React.createElement("div",{style:{background:"#04060e",borderRadius:4,padding:"8px 10px",marginBottom:6,border:"1px solid "+(dayJournal.status==="NO_TRADE"?"#ff884420":"#00ff8820")}},
                React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}},
                  React.createElement("div",{style:{color:"#556677",fontSize:8,letterSpacing:1}},dayJournal.status==="NO_TRADE"?"WHY NO TRADE":"SESSION NOTES"),
                  dayJournal.vix&&React.createElement("div",{style:{color:"#445566",fontSize:8}},"VIX: "+dayJournal.vix+(dayJournal.bias?" | "+dayJournal.bias.replace(/_/g," "):""))
                ),
                React.createElement("div",{style:{color:"#aaaaaa",fontSize:11,lineHeight:1.5}},dayJournal.notes)
              ),

              dayTrades.map(function(t,idx){
                var globalIdx=trades.indexOf(t);
                var isBuy=t.action==="BUY";
                var bc=isBuy?(t.optionType==="CALL"?"#aa88ff":"#ff88aa"):"#00ff88";
                if(!isBuy&&t.pnl<0) bc="#ff4444";
                var isEditing=editingTrade===globalIdx;
                return React.createElement("div",{key:idx,style:{background:"#0a0e18",border:"1px solid #1a1a2a",borderRadius:6,padding:12,marginBottom:6,borderLeft:"3px solid "+bc}},
                  React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}},
                    React.createElement("div",null,
                      React.createElement("span",{style:{color:bc,fontWeight:"bold",fontSize:11,marginRight:8}},isBuy?"OPENED":"CLOSED"),
                      React.createElement("span",{style:{color:"#ffffff",fontSize:13,fontWeight:"bold"}},t.symbol),
                      React.createElement("span",{style:{color:t.optionType==="CALL"?"#00ff88":"#ff4444",fontSize:12,marginLeft:6}},t.optionType),
                      React.createElement("span",{style:{color:"#cccccc",fontSize:11,marginLeft:4}},"$"+t.strike)
                    ),
                    React.createElement("div",{style:{display:"flex",gap:6,alignItems:"center"}},
                      React.createElement("button",{onClick:function(i){ return function(){ startEditTrade(i); }; }(globalIdx),style:{background:"#0a1428",border:"1px solid #4488ff60",color:"#4488ff",padding:"2px 7px",fontSize:9,cursor:"pointer",borderRadius:3,fontFamily:"inherit"}},"EDIT"),
                      React.createElement("button",{onClick:function(i){ return function(){ if(window.confirm("Delete this trade?")) deleteTrade(i); }; }(globalIdx),style:{background:"#1a0606",border:"1px solid #ff444460",color:"#ff4444",padding:"2px 7px",fontSize:9,cursor:"pointer",borderRadius:3,fontFamily:"inherit"}},"DELETE")
                    )
                  ),
                  isEditing?React.createElement("div",{style:{marginTop:8,padding:"10px",background:"#04060e",borderRadius:4,border:"1px solid #4488ff30"}},
                    React.createElement("div",{style:{color:"#4488ff",fontSize:9,letterSpacing:2,marginBottom:8}},"EDIT TRADE"),
                    React.createElement("div",{style:{display:"flex",gap:6,marginBottom:6}},
                      React.createElement("input",{value:editForm.symbol||"",onChange:function(e){ setEditForm(Object.assign({},editForm,{symbol:e.target.value.toUpperCase()})); },style:Object.assign({},S.inp,{flex:1}),placeholder:"Symbol"}),
                      React.createElement("input",{value:editForm.strike||"",onChange:function(e){ setEditForm(Object.assign({},editForm,{strike:e.target.value})); },style:Object.assign({},S.inp,{flex:1}),placeholder:"Strike"})
                    ),
                    React.createElement("div",{style:{display:"flex",gap:6,marginBottom:6}},
                      React.createElement("input",{value:editForm.premium||"",onChange:function(e){ setEditForm(Object.assign({},editForm,{premium:e.target.value})); },style:Object.assign({},S.inp,{flex:1}),placeholder:"Premium"}),
                      React.createElement("input",{value:editForm.expiry||"",onChange:function(e){ setEditForm(Object.assign({},editForm,{expiry:e.target.value})); },style:Object.assign({},S.inp,{flex:1}),placeholder:"Expiry"})
                    ),
                    React.createElement("input",{value:editForm.note||"",onChange:function(e){ setEditForm(Object.assign({},editForm,{note:e.target.value})); },style:Object.assign({},S.inp,{marginBottom:8}),placeholder:"Note"}),
                    React.createElement("div",{style:{display:"flex",gap:6}},
                      React.createElement("button",{onClick:saveEditTrade,style:Object.assign({},S.btn("#4488ff","linear-gradient(135deg,#060e24,#000e44)"),{flex:1,padding:"8px",fontSize:10})},"SAVE"),
                      React.createElement("button",{onClick:function(){ setEditingTrade(null); setEditForm({}); },style:Object.assign({},S.btn("#888","linear-gradient(135deg,#0a0a0a,#141414)"),{flex:1,padding:"8px",fontSize:10})},"CANCEL")
                    )
                  ):React.createElement("div",null,
                    React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"}},
                      React.createElement("span",{style:{color:"#aaaaaa",fontSize:11}},t.contracts+" contract · exp: "+t.expiry),
                      React.createElement("div",null,
                        isBuy?React.createElement("span",{style:{color:"#ff8844",fontSize:12}},"Cost: $"+t.total.toFixed(0))
                        :React.createElement("span",{style:{color:t.pnl>=0?"#00ff88":"#ff4444",fontSize:13,fontWeight:"bold"}},(t.pnl>=0?"+":"")+t.pnl.toFixed(2)+" P&L")
                      )
                    ),
                    t.note&&React.createElement("div",{style:{color:"#556677",fontSize:10,marginTop:3}},t.note)
                  )
                );
              })
            );
          })
        ),

        activeTab==="chat"&&React.createElement("div",null,
          React.createElement("div",{style:S.lbl},"ASK YOUR QUANT"),
          React.createElement("div",{style:{fontSize:10,color:"#445566",marginBottom:10}},"Ask anything — options plays, stock analysis, market questions, strategy. Your account size and positions are always known."),
          React.createElement("div",{style:{background:"#04060e",border:"1px solid #0a0a1a",borderRadius:4,padding:12,minHeight:220,maxHeight:420,overflowY:"auto",marginBottom:10}},
            chatHistory.length===0?React.createElement("div",{style:{color:"#334455",fontSize:10,letterSpacing:2,textAlign:"center",marginTop:70}},
              React.createElement("div",{style:{fontSize:24,marginBottom:8}},""),
              React.createElement("div",null,"ASK ANYTHING — OPTIONS, STOCKS, STRATEGY, MARKET"),
              React.createElement("div",{style:{color:"#aa88ff",marginTop:8,fontSize:10}},"Account size and positions always factored into recommendations")
            ):chatHistory.map(function(m,idx){
              return React.createElement("div",{key:idx,style:{marginBottom:14}},
                React.createElement("div",{style:{fontSize:9,color:m.role==="user"?"#aa88ffaa":"#4488ffaa",letterSpacing:2,marginBottom:4}},m.role==="user"?"YOU":"QUANT"),
                React.createElement("div",{style:{color:m.role==="user"?"#eee":"#ccc",fontSize:12,lineHeight:1.6}},typeof m.content==="string"?m.content:"")
              );
            }),
            chatLoading&&React.createElement("div",{style:{color:"#aa88ff66",fontSize:10,letterSpacing:2}},"Searching...")
          ),
          React.createElement("div",{style:{display:"flex",gap:8}},
            React.createElement("input",{placeholder:"Best call on NVDA? Is ON a good options play? What is SPY doing?",value:chatInput,onChange:function(e){ setChatInput(e.target.value); },onKeyDown:function(e){ if(e.key==="Enter") sendChat(); },style:Object.assign({},S.inp,{flex:1})}),
            React.createElement("button",{onClick:sendChat,disabled:chatLoading,style:Object.assign({},S.btn("#4488ff","linear-gradient(135deg,#060e24,#000e44)"),{width:"auto",padding:"8px 16px"})},"GO")
          )
        )

      )
    )
  );
}
