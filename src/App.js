/* eslint-disable */
import React, { useState, useEffect } from "react";

const INITIAL_PORTFOLIO = [
  { symbol: "USO",  shares: 0.33995,  avgPrice: 132.37, value: 47.15 },
  { symbol: "NVDA", shares: 0.74883,  avgPrice: 200.31, value: 164.52 },
  { symbol: "MU",   shares: 0.78741,  avgPrice: 480.04, value: 628.74 },
  { symbol: "BITX", shares: 16.72725, avgPrice: 17.99,  value: 350.77 },
  { symbol: "SPY",  shares: 6.39058,  avgPrice: 656.05, value: 4724.43 },
];
const PEAK_VALUE = 6222;

const WOLF_PROMPT = function(sym) {
  return "You are Agent Wolf - a Warren Buffett-style analyst. You see FUNDAMENTALS ONLY. No charts, no news.\n"
    + "Search for "+sym+" P/E ratio, revenue growth, earnings history, profit margins, debt, free cash flow.\n"
    + "Based ONLY on fundamentals, give your vote. Also recommend the best options play.\n"
    + "Respond in pure JSON only:\n"
    + "{\"direction\":\"BUY\",\"conviction\":0.8,\"entry\":750,\"target\":850,\"stop\":695,"
    + "\"reasoning\":\"Strong earnings growth\",\"horizon_days\":5,"
    + "\"option_type\":\"CALL\",\"option_strike\":760,\"option_expiry\":\"3-5 days\",\"option_premium_est\":\"$2.50-$4.00\"}";
};

const COHEN_PROMPT = function(sym, price) {
  return "You are Agent Cohen - an elite technical analyst. You see PRICE DATA ONLY.\n"
    + "Current price data: "+price+"\n\n"
    + "Search for RSI (14-day), MACD, 20/50-day moving averages, volume trend, support/resistance, Bollinger Bands for "+sym+".\n"
    + "Based on technicals, give your vote and recommend the best options play.\n"
    + "Respond in pure JSON only (no markdown):\n"
    + "{\"direction\":\"BUY\",\"conviction\":0.8,\"entry\":750,\"target\":800,\"stop\":720,"
    + "\"reasoning\":\"RSI neutral, MACD bullish crossover\",\"horizon_days\":3,"
    + "\"rsi\":45,\"macd\":\"bullish crossover\",\"ma_position\":\"above 20MA and 50MA\","
    + "\"key_support\":720,\"key_resistance\":800,"
    + "\"option_type\":\"CALL\",\"option_strike\":755,\"option_expiry\":\"3-5 days\",\"option_premium_est\":\"$2.00-$3.50\"}";
};

const DALIO_PROMPT = function(sym, price) {
  return "You are Agent Dalio - an institutional flow and sector rotation specialist.\n"
    + "Current price data for "+sym+": "+price+"\n\n"
    + "Search for sector rotation flows, unusual options activity on "+sym+", institutional positioning, relative strength vs SPY.\n"
    + "Give your vote and recommend the specific options contract to trade.\n"
    + "Respond in pure JSON only (no markdown):\n"
    + "{\"direction\":\"BUY\",\"conviction\":0.8,\"entry\":750,\"target\":820,\"stop\":710,"
    + "\"reasoning\":\"Institutions rotating into sector\",\"horizon_days\":3,"
    + "\"sector_flow\":\"INFLOW\",\"options_signal\":\"BULLISH - unusual call volume 3x average\","
    + "\"relative_strength\":\"outperforming SPY by 2.3 percent\","
    + "\"option_type\":\"CALL\",\"option_strike\":755,\"option_expiry\":\"3-5 days\",\"option_premium_est\":\"$2.50-$4.00\"}";
};

const ACKMAN_PROMPT = function(sym) {
  return "You are Agent Ackman - an activist investor like Bill Ackman. You see FUNDAMENTALS and INSIDER TRANSACTION DATA only.\n"
    + "Search for "+sym+" recent SEC Form 4 insider filings, CEO/CFO/Director transactions in the last 90 days.\n"
    + "Also check fundamentals and recommend options play based on insider activity.\n"
    + "Respond in pure JSON only (no markdown):\n"
    + "{\"direction\":\"BUY\",\"conviction\":0.85,\"entry\":750,\"target\":900,\"stop\":690,"
    + "\"reasoning\":\"CEO bought stock recently\",\"horizon_days\":7,"
    + "\"insider_signal\":\"BUYING\",\"insider_detail\":\"CEO purchased shares recently\","
    + "\"option_type\":\"CALL\",\"option_strike\":760,\"option_expiry\":\"5-7 days\",\"option_premium_est\":\"$3.00-$5.00\"}";
};

const BRIEFING_PROMPT = function() {
  var today = new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
  return "You are the Head Macro Analyst at an asymmetric AI hedge fund. Today: "+today+".\n\n"
    + "Your ONLY job is to deliver a pure macro market briefing. Do NOT recommend any specific stocks or trade ideas. Do NOT include entry/target/stop levels. Do NOT mention any individual tickers.\n\n"
    + "Search the web for the most current market conditions RIGHT NOW and deliver this briefing:\n\n"
    + "📊 MARKET OVERVIEW\n"
    + "Overall market direction and sentiment today. Bull or bear bias. What is the S&P 500 doing.\n\n"
    + "🏦 MACRO DRIVERS\n"
    + "The 2-3 biggest forces driving markets right now. Fed policy, inflation data, geopolitical events, dollar strength, bond yields, oil prices. What is the single most important thing happening.\n\n"
    + "📅 KEY EVENTS THIS WEEK\n"
    + "Every major economic event, Fed speech, CPI/PPI/jobs data, earnings reports that could move markets. Format: Date | Event | Expected market impact UP or DOWN.\n\n"
    + "🌍 SECTOR ROTATION\n"
    + "Which sectors are hot right now and which are being sold. Where is institutional money flowing. Which sectors to avoid.\n\n"
    + "⚠️ RISK FACTORS\n"
    + "Top 3 risks that could cause a major market move in either direction this week. Be specific.\n\n"
    + "💡 MARKET BIAS\n"
    + "One paragraph summary. Overall tone for the week. Offensive or defensive posture. What kind of trades work best in this environment.\n\n"
    + "RULES: Web search first for current data. Be specific with numbers and dates. No stock picks. No trade ideas. Pure macro context only.";
};

const SCANNER_CANDIDATES_PROMPT = function(liveStr) {
  var today = new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
  return "You are the Head Quant at an asymmetric AI hedge fund. Today: "+today+".\n\n"
    + "Search the market RIGHT NOW and identify the 6 best stock candidates for short-term trades (1-5 days).\n\n"
    + "Current market prices: "+liveStr+"\n\n"
    + "Use these strategies to find candidates:\n"
    + "1. MOMENTUM+CATALYST - trending stock with event within 7 days\n"
    + "2. MEAN REVERSION DIP - strong stock pulled back 5-15% to support\n"
    + "3. FACTOR QUALITY - fundamentally strong, institutions buying\n"
    + "4. EVENT-DRIVEN - CPI, Fed, earnings, FDA dates\n"
    + "5. SENTIMENT+OPTIONS - unusual call volume, analyst upgrades\n"
    + "6. RELATIVE STRENGTH - outperforming SPY last 1-4 weeks\n\n"
    + "Requirements: volume above 500K daily, price above $3, at least 3 quality factors, max 2 tech stocks.\n\n"
    + "Return ONLY pure JSON - no explanation, no markdown:\n"
    + "{\"candidates\":[\"AAPL\",\"XLE\",\"SOFI\",\"META\",\"GLD\",\"AMD\"]}";
};

const S = {
  app:   { background:"#050810", minHeight:"100vh", fontFamily:"'Courier New',monospace", color:"#e8e8e8" },
  hdr:   { background:"linear-gradient(135deg,#0a1428,#0d1f3c)", borderBottom:"2px solid #00ff8840", padding:"14px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" },
  tkr:   { background:"#060a10", borderBottom:"1px solid #00ff8820", padding:"7px 16px", overflowX:"auto", whiteSpace:"nowrap" },
  tabs:  { display:"flex", borderBottom:"1px solid #1a2a1a", background:"#060a10" },
  tab:   function(a){ return { flex:1, padding:"10px 2px", background:"none", border:"none", borderBottom: a?"2px solid #00ff88":"2px solid transparent", color:a?"#00ff88":"#556655", fontSize:10, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit" }; },
  card:  { background:"#0a0e18", border:"1px solid #1a2a1a", borderRadius:6, padding:14, marginBottom:10 },
  btn:   function(c,bg){ c=c||"#00ff88"; bg=bg||"linear-gradient(135deg,#003322,#006644)"; return { background:bg, border:"1px solid "+c+"60", color:c, padding:"12px", fontFamily:"inherit", fontSize:11, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", borderRadius:4, width:"100%" }; },
  inp:   { background:"#060a10", border:"1px solid #1a2a1a", color:"#ffffff", padding:"9px 10px", fontFamily:"inherit", fontSize:12, borderRadius:4, width:"100%", boxSizing:"border-box" },
  lbl:   { color:"#668866", fontSize:10, letterSpacing:2, marginBottom:6, display:"block" },
};

export default function QuantDashboard() {
  const [portfolio,        setPortfolio]        = useState(INITIAL_PORTFOLIO);
  const [optionsPositions, setOptionsPositions]  = useState([]);
  const [trades,           setTrades]           = useState([]);
  const [briefing,         setBriefing]         = useState("");
  const [loading,          setLoading]          = useState(false);
  const [activeTab,        setActiveTab]        = useState("briefing");
  const [cashBalance,      setCashBalance]      = useState(500);
  const [livePrices,       setLivePrices]       = useState({});
  const [lastUpdated,      setLastUpdated]      = useState(null);
  const [chatHistory,      setChatHistory]      = useState([]);
  const [chatInput,        setChatInput]        = useState("");
  const [chatLoading,      setChatLoading]      = useState(false);
  const [tradeForm,        setTradeForm]        = useState({symbol:"",action:"BUY",shares:"",price:"",note:""});
  const [optionForm,       setOptionForm]       = useState({symbol:"",type:"CALL",strike:"",expiry:"",contracts:"1",premium:"",note:""});
  const [riskAlerts,       setRiskAlerts]       = useState([]);
  const [portfolioView,    setPortfolioView]    = useState("stocks");
  const [editingTrade,     setEditingTrade]     = useState(null);
  const [editForm,         setEditForm]         = useState({});
  const [scanResults,      setScanResults]      = useState([]);
  const [scanLoading,      setScanLoading]      = useState(false);
  const [scanStatus,       setScanStatus]       = useState("");
  const [manualSymbol,     setManualSymbol]     = useState("");
  const [manualLoading,    setManualLoading]    = useState(false);
  const [manualResult,     setManualResult]     = useState(null);

  useEffect(function(){ loadData(); fetchLivePrices(); var iv=setInterval(fetchLivePrices,60000); return function(){ clearInterval(iv); }; }, []);
  useEffect(function(){ if(Object.keys(livePrices).length>0) runRiskEngine(); }, [livePrices]);

  function getDaysUntilExpiry(expiryStr) {
    if(!expiryStr) return null;
    try{ var d=new Date(expiryStr); var now=new Date(); return Math.ceil((d-now)/(1000*60*60*24)); }catch(e){ return null; }
  }

  function runRiskEngine() {
    var alerts=[];
    var stockVal=portfolio.reduce(function(s,p){ return s+p.value; },0);
    var optVal=optionsPositions.reduce(function(s,o){ return s+(o.contracts*o.premium*100); },0);
    var totalVal=stockVal+optVal+cashBalance;
    var dayChange=portfolio.reduce(function(s,p){ var l=livePrices[p.symbol]; return s+(l?(l.change/100)*p.value:0); },0);
    var dayPct=totalVal>0?(dayChange/totalVal)*100:0;
    var drawdown=((totalVal-PEAK_VALUE)/PEAK_VALUE)*100;
    if(dayPct<=-2.5) alerts.push({msg:"CIRCUIT BREAKER: Down "+dayPct.toFixed(2)+"% today - preserve cash, no new trades",color:"#ff2222"});
    if(drawdown<=-8)  alerts.push({msg:"DRAWDOWN ALERT: "+drawdown.toFixed(2)+"% from peak - risk management active",color:"#ff4444"});
    portfolio.forEach(function(p){
      var l=livePrices[p.symbol]; if(!l) return;
      var pct=((l.price-p.avgPrice)/p.avgPrice)*100;
      if(pct<=-8) alerts.push({msg:"STOP ZONE - "+p.symbol+": Down "+pct.toFixed(1)+"% from avg - consider cutting",color:"#ff6644"});
      if(pct>=15)  alerts.push({msg:"TARGET ZONE - "+p.symbol+": Up "+pct.toFixed(1)+"% - consider trimming",color:"#00ccff"});
    });
    optionsPositions.forEach(function(o){
      var days=getDaysUntilExpiry(o.expiry);
      if(days!==null&&days<=1) alerts.push({msg:"OPTIONS EXPIRY ALERT - "+o.symbol+" "+o.optionType+" $"+o.strike+" expires in "+days+" day(s) - CLOSE OR LOSE",color:"#ff2222"});
      else if(days!==null&&days<=2) alerts.push({msg:"OPTIONS WARNING - "+o.symbol+" "+o.optionType+" $"+o.strike+" expires in "+days+" days - review position",color:"#ffaa00"});
    });
    var techVal=portfolio.filter(function(p){ return ["NVDA","MU","AMAT","AMD","AAPL","MSFT","SMH"].indexOf(p.symbol)>=0; }).reduce(function(s,p){ return s+p.value; },0);
    var invested=portfolio.reduce(function(s,p){ return s+p.value; },0);
    if(invested>0&&(techVal/invested)>0.60) alerts.push({msg:"CORRELATION RISK: "+((techVal/invested)*100).toFixed(0)+"% in tech - highly correlated",color:"#ffcc00"});
    setRiskAlerts(alerts);
  }

  async function fetchLivePrices() {
    var syms=[...new Set([...portfolio.map(function(p){ return p.symbol; }),"SPY","QQQ","NVDA","MU","AMAT","AMD","AAPL","MSFT","META","SMH","GLD","TLT","XLE"])];
    try{
      var r=await fetch("/api/prices?symbols="+syms.join(","));
      var res=await r.json();
      if(res&&Object.keys(res).length>0){
        setLivePrices(res); setLastUpdated(new Date().toLocaleTimeString());
        setPortfolio(function(prev){ return prev.map(function(p){ var l=res[p.symbol]; return l?Object.assign({},p,{value:l.price*p.shares,livePrice:l.price}):p; }); });
      }
    }catch(e){ console.error("Price fetch failed:",e); }
  }

  function loadData(){
    try{
      var p=localStorage.getItem("pf3"); if(p) setPortfolio(JSON.parse(p));
      var t=localStorage.getItem("tr3"); if(t) setTrades(JSON.parse(t));
      var c=localStorage.getItem("ca3"); if(c) setCashBalance(parseFloat(c));
      var ch=localStorage.getItem("ch3"); if(ch) setChatHistory(JSON.parse(ch));
      var op=localStorage.getItem("op3"); if(op) setOptionsPositions(JSON.parse(op));
      var sr=localStorage.getItem("sr3"); if(sr) setScanResults(JSON.parse(sr));
    }catch(e){}
  }

  function save(np,nt,nc,nch,nop){
    try{
      var pfToSave=np!==null?(np!=null?np:portfolio):portfolio;
      var trToSave=nt!==null?(nt!=null?nt:trades):trades;
      var caToSave=nc!==null?(nc!=null?nc:cashBalance):cashBalance;
      var opToSave=nop!==null?(nop!=null?nop:optionsPositions):optionsPositions;
      localStorage.setItem("pf3",JSON.stringify(pfToSave));
      localStorage.setItem("tr3",JSON.stringify(trToSave));
      localStorage.setItem("ca3",String(caToSave));
      localStorage.setItem("op3",JSON.stringify(opToSave));
      if(nch!==null) localStorage.setItem("ch3",JSON.stringify(nch!=null?nch:chatHistory));
    }catch(e){ console.error("Save failed:",e); }
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

  async function getDailyBriefing(){
    setLoading(true); setBriefing("");
    try{
      var liveStr=Object.entries(livePrices).map(function(e){ var s=e[0],d=e[1]; return s+":$"+(d.price?d.price.toFixed(2):"?")+"("+(d.change>=0?"+":"")+(d.change?d.change.toFixed(2):"0")+"%)"; }).join(", ");
      var txt=await callClaude(BRIEFING_PROMPT(),[{role:"user",content:"Deliver the macro market briefing for today "+new Date().toLocaleDateString()+". Current prices for context: "+liveStr+". Search for latest macro news, Fed activity, economic data, geopolitical events. Pure macro context only - no stock picks, no trade ideas, no individual tickers."}]);
      setBriefing(txt);
    }catch(e){ setBriefing("Error - check connection and try again."); }
    setLoading(false);
  }

  function buildCommitteeResult(symbol,results){
    var names=["Wolf (Fundamentals)","Cohen (Price Action)","Dalio (Sector + Flow)","Ackman (Insider + Fund.)"];
    var votes={};
    for(var i=0;i<4;i++){
      try{
        var txt=results[i];
        var clean=txt.split("\u0060\u0060\u0060json").join("").split("\u0060\u0060\u0060").join("").trim();
        var s=clean.indexOf("{"),e=clean.lastIndexOf("}");
        var parsed=JSON.parse(clean.substring(s,e+1));
        if(names[i]==="Cohen (Price Action)"&&parsed.rsi) parsed.technicals="RSI: "+parsed.rsi+" | MACD: "+(parsed.macd||"n/a")+" | MA: "+(parsed.ma_position||"n/a")+" | Sup: $"+(parsed.key_support||"?")+" | Res: $"+(parsed.key_resistance||"?");
        if(names[i]==="Dalio (Sector + Flow)"&&parsed.sector_flow) parsed.flowdata="Sector: "+(parsed.sector_flow||"n/a")+" | Options: "+(parsed.options_signal||"n/a")+" | vs SPY: "+(parsed.relative_strength||"n/a");
        if(parsed.option_type) parsed.optionsplay=(parsed.option_type)+" | Strike: $"+(parsed.option_strike||"?")+" | Expiry: "+(parsed.option_expiry||"3-5 days")+" | Premium: "+(parsed.option_premium_est||"?");
        votes[names[i]]=parsed;
      }catch(err){ votes[names[i]]={direction:"HOLD",conviction:0.5,reasoning:results[i]?results[i].slice(0,120):"No response"}; }
    }
    var dirs=Object.values(votes).map(function(v){ return v.direction; });
    var buys=dirs.filter(function(d){ return d==="BUY"; }).length;
    var sells=dirs.filter(function(d){ return d==="SELL"; }).length;
    var consensus=buys>=2?"BUY":sells>=2?"SELL":"HOLD";
    var avgConv=Object.values(votes).reduce(function(s,v){ return s+(v.conviction||0.5); },0)/4;
    var stars=avgConv>0.75?"HIGH CONVICTION":avgConv>0.5?"MEDIUM CONVICTION":"SPECULATIVE";
    var entries=Object.values(votes).filter(function(v){ return v.entry; }).map(function(v){ return v.entry; });
    var targets=Object.values(votes).filter(function(v){ return v.target; }).map(function(v){ return v.target; });
    var stops=Object.values(votes).filter(function(v){ return v.stop; }).map(function(v){ return v.stop; });
    var ackV=votes["Ackman (Insider + Fund.)"]||{};
    var optV=Object.values(votes).filter(function(v){ return v.option_type; });
    var callC=optV.filter(function(v){ return v.option_type==="CALL"; }).length;
    var putC=optV.filter(function(v){ return v.option_type==="PUT"; }).length;
    var conOptType=callC>=putC?"CALL":"PUT";
    var strikes=optV.filter(function(v){ return v.option_strike; }).map(function(v){ return v.option_strike; });
    var avgStrike=strikes.length?(strikes.reduce(function(a,b){ return a+b; },0)/strikes.length).toFixed(2):null;
    var prems=optV.map(function(v){ return v.option_premium_est||""; }).filter(Boolean);
    var horizons=Object.values(votes).filter(function(v){ return v.horizon_days; }).map(function(v){ return v.horizon_days; });
    var avgH=horizons.length?Math.round(horizons.reduce(function(a,b){ return a+b; },0)/horizons.length):5;
    var ttd=avgH<=3?"OPTIONS":avgH<=5?"OPTIONS_OR_STOCK":"STOCK";
    var ttr=avgH<=3?"Agents see "+avgH+"-day avg hold. Short window favors options — move expected fast, theta minimal."
      :avgH<=5?"Agents see "+avgH+"-day avg hold. Either works — options for 3/4+ conviction, stock for safer play."
      :"Agents see "+avgH+"-day avg hold. Longer window favors stock — theta decay hurts options at this horizon.";
    return {symbol:symbol,votes:votes,consensus:consensus,buys:buys,sells:sells,avgConv:avgConv.toFixed(2),stars:stars,
      entry:entries.length?"$"+Math.min.apply(null,entries).toFixed(2)+"-$"+Math.max.apply(null,entries).toFixed(2):null,
      target:targets.length?"$"+(targets.reduce(function(a,b){ return a+b; },0)/targets.length).toFixed(2):null,
      stop:stops.length?"$"+Math.min.apply(null,stops).toFixed(2):null,
      insiderSignal:ackV.insider_signal||"NEUTRAL",insiderDetail:ackV.insider_detail||"No recent insider activity",
      consensusOptionType:conOptType,consensusStrike:avgStrike,consensusPremium:prems[0]||null,
      callCount:callC,putCount:putC,avgHorizon:avgH,tradeTypeDecision:ttd,tradeTypeReason:ttr,passesCommittee:buys>=2};
  }

  async function runAgentsOnSymbol(symbol){
    var live=livePrices[symbol]||{};
    var priceStr="Price:$"+(live.price?live.price.toFixed(2):"?")+", Change:"+(live.change?live.change.toFixed(2):"0")+"%, High:$"+(live.high?live.high.toFixed(2):"?")+", Low:$"+(live.low?live.low.toFixed(2):"?")+", Vol:"+(live.volume||0).toLocaleString();
    var results=await Promise.all([
      callClaude(WOLF_PROMPT(symbol),[{role:"user",content:"Search and analyze "+symbol+" fundamentals only. Return JSON vote."}]),
      callClaude(COHEN_PROMPT(symbol,priceStr),[{role:"user",content:"Analyze price data for "+symbol+": "+priceStr+". Return JSON vote."}],false),
      callClaude(DALIO_PROMPT(symbol,priceStr),[{role:"user",content:"Search sector flow and options activity for "+symbol+". Return JSON vote."}]),
      callClaude(ACKMAN_PROMPT(symbol),[{role:"user",content:"Search SEC Form 4 filings and fundamentals for "+symbol+". Return JSON vote."}]),
    ]);
    return buildCommitteeResult(symbol,results);
  }

  async function runMarketScan(){
    setScanLoading(true); setScanResults([]); setScanStatus("Searching market for best candidates...");
    try{
      var liveStr=Object.entries(livePrices).map(function(e){ return e[0]+":$"+(e[1].price?e[1].price.toFixed(2):"?"); }).join(", ");
      var candTxt=await callClaude(SCANNER_CANDIDATES_PROMPT(liveStr),[{role:"user",content:"Search market now. Return 6 best short-term trade candidates as JSON. Today: "+new Date().toLocaleDateString()+". Pure JSON only - no explanation."}]);
      var clean=candTxt.split("\u0060\u0060\u0060json").join("").split("\u0060\u0060\u0060").join("").trim();
      var s=clean.indexOf("{"),e=clean.lastIndexOf("}");
      var parsed=JSON.parse(clean.substring(s,e+1));
      var candidates=parsed.candidates||[];
      if(!candidates.length) throw new Error("No candidates returned");
      setScanStatus("Found "+candidates.length+" candidates. Running 4 agents on each in batches...");
      var approved=[];
      for(var b=0;b<candidates.length;b+=2){
        var batch=candidates.slice(b,b+2);
        setScanStatus("Analyzing: "+batch.join(" + ")+"... ("+(Math.min(b+2,candidates.length))+" of "+candidates.length+" done)");
        var batchResults=await Promise.all(batch.map(function(sym){ return runAgentsOnSymbol(sym); }));
        batchResults.forEach(function(result){
          if(result.passesCommittee){
            approved.push(result);
            setScanResults(function(prev){ var next=[...prev,result]; try{ localStorage.setItem("sr3",JSON.stringify(next)); }catch(ex){} return next; });
          }
        });
        if(b+2<candidates.length){ setScanStatus("Pausing briefly between batches..."); await new Promise(function(res){ setTimeout(res,3000); }); }
      }
      if(approved.length===0) setScanStatus("Scan complete. No candidates passed the committee today. Market conditions may be unfavorable — try again later.");
      else setScanStatus("Scan complete. "+approved.length+" agent-approved trade"+(approved.length>1?"s":"")+" found and ready.");
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

  function logTrade(){
    if(!tradeForm.symbol||!tradeForm.shares||!tradeForm.price) return;
    var trade=Object.assign({},tradeForm,{type:"STOCK",date:new Date().toLocaleDateString(),shares:parseFloat(tradeForm.shares),price:parseFloat(tradeForm.price),total:parseFloat(tradeForm.shares)*parseFloat(tradeForm.price)});
    var newTrades=[trade,...trades],newPF=[...portfolio],newCash=cashBalance;
    if(trade.action==="BUY"){
      newCash-=trade.total;
      var ex=newPF.find(function(p){ return p.symbol===trade.symbol.toUpperCase(); });
      if(ex){ var ts=ex.shares+trade.shares; ex.avgPrice=((ex.shares*ex.avgPrice)+(trade.shares*trade.price))/ts; ex.shares=ts; ex.value=ex.shares*trade.price; }
      else newPF.push({symbol:trade.symbol.toUpperCase(),shares:trade.shares,avgPrice:trade.price,value:trade.total});
    }else{
      newCash+=trade.total;
      newPF=newPF.map(function(p){ if(p.symbol!==trade.symbol.toUpperCase()) return p; var rem=p.shares-trade.shares; return rem<=0.001?null:Object.assign({},p,{shares:rem,value:rem*trade.price}); }).filter(Boolean);
    }
    setTrades(newTrades); setPortfolio(newPF); setCashBalance(newCash);
    setTradeForm({symbol:"",action:"BUY",shares:"",price:"",note:""}); save(newPF,newTrades,newCash,null,null);
  }

  function logOptionTrade(){
    if(!optionForm.symbol||!optionForm.strike||!optionForm.premium) return;
    var contracts=parseInt(optionForm.contracts)||1,premium=parseFloat(optionForm.premium),totalCost=contracts*premium*100;
    var trade={type:"OPTION",action:"BUY",symbol:optionForm.symbol.toUpperCase(),optionType:optionForm.type,strike:parseFloat(optionForm.strike),expiry:optionForm.expiry,contracts:contracts,premium:premium,total:totalCost,note:optionForm.note,date:new Date().toLocaleDateString(),status:"OPEN"};
    var newCash=cashBalance-totalCost,newOptions=[...optionsPositions,trade],newTrades=[trade,...trades];
    setOptionsPositions(newOptions); setCashBalance(newCash); setTrades(newTrades);
    setOptionForm({symbol:"",type:"CALL",strike:"",expiry:"",contracts:"1",premium:"",note:""}); save(null,newTrades,newCash,null,newOptions);
  }

  function closeOptionPosition(idx){
    var pos=optionsPositions[idx]; if(!pos) return;
    var newOptions=optionsPositions.filter(function(_,i){ return i!==idx; });
    var closeTrade=Object.assign({},pos,{action:"SELL",date:new Date().toLocaleDateString(),status:"CLOSED"});
    setOptionsPositions(newOptions); setTrades([closeTrade,...trades]); save(null,[closeTrade,...trades],null,null,newOptions);
  }

  function deleteTrade(idx){
    var t=trades[idx]; if(!t) return;
    var newTrades=trades.filter(function(_,i){ return i!==idx; }),newPF=[...portfolio],newCash=cashBalance,newOpts=[...optionsPositions];
    if(t.type==="OPTION"){
      if(t.action==="BUY"){ newCash+=t.total; newOpts=newOpts.filter(function(o){ return !(o.symbol===t.symbol&&o.strike===t.strike&&o.expiry===t.expiry); }); }
    }else{
      if(t.action==="BUY"){
        newCash+=t.total;
        newPF=newPF.map(function(p){ if(p.symbol!==t.symbol) return p; var rem=p.shares-t.shares; return rem<=0.001?null:Object.assign({},p,{shares:rem,value:rem*(livePrices[p.symbol]?livePrices[p.symbol].price:p.avgPrice)}); }).filter(Boolean);
      }else{
        newCash-=t.total;
        var ex=newPF.find(function(p){ return p.symbol===t.symbol; });
        if(ex){ ex.shares+=t.shares; ex.value=ex.shares*(livePrices[ex.symbol]?livePrices[ex.symbol].price:ex.avgPrice); }
        else newPF.push({symbol:t.symbol,shares:t.shares,avgPrice:t.price,value:t.shares*t.price});
      }
    }
    setTrades(newTrades); setPortfolio(newPF); setCashBalance(newCash); setOptionsPositions(newOpts);
    save(newPF,newTrades,newCash,null,newOpts);
  }

  function startEditTrade(idx){ setEditingTrade(idx); setEditForm(Object.assign({},trades[idx])); }

  function saveEditTrade(){
    if(editingTrade===null) return;
    var old=trades[editingTrade];
    var updated=Object.assign({},editForm,{shares:parseFloat(editForm.shares)||old.shares,price:parseFloat(editForm.price)||old.price,total:(parseFloat(editForm.shares)||old.shares)*(parseFloat(editForm.price)||old.price)});
    var newTrades=trades.map(function(t,i){ return i===editingTrade?updated:t; });
    setTrades(newTrades); setEditingTrade(null); setEditForm({}); save(null,newTrades,null,null,null);
  }

  async function sendChat(){
    if(!chatInput.trim()) return;
    setChatLoading(true);
    var uMsg={role:"user",content:chatInput};
    var newH=[...chatHistory,uMsg]; setChatHistory(newH); setChatInput("");
    try{
      var stockVal=portfolio.reduce(function(s,p){ return s+p.value; },0);
      var optVal=optionsPositions.reduce(function(s,o){ return s+(o.contracts*o.premium*100); },0);
      var totalVal=stockVal+optVal+cashBalance;
      var portStr=portfolio.map(function(p){ return p.symbol+": $"+(livePrices[p.symbol]?livePrices[p.symbol].price.toFixed(2):"?")+" ("+p.shares.toFixed(4)+"sh, value $"+p.value.toFixed(2)+")"; }).join(" | ");
      var optStr=optionsPositions.length?optionsPositions.map(function(o){ return o.symbol+" "+o.optionType+" $"+o.strike+" exp:"+o.expiry; }).join(", "):"none";
      var sys="You are an expert quant trader and options specialist for Aidan War Room. CRITICAL ACCOUNT FACTS use these exact numbers always: TOTAL PORTFOLIO VALUE: $"+totalVal.toFixed(2)+". Stock value: $"+stockVal.toFixed(2)+". Cash available: $"+cashBalance.toFixed(2)+". Options value: $"+optVal.toFixed(2)+". Positions: "+portStr+". Open options: "+optStr+". POSITION SIZING RULES: Max $300-500 per options contract (1 contract). Max 15 percent of $"+totalVal.toFixed(2)+" per trade which equals $"+(totalVal*0.15).toFixed(0)+". Never suggest position sizes larger than cash available $"+cashBalance.toFixed(2)+". This is a small retail account always size recommendations to this exact account size. Always include options play recommendations where relevant. Search for current market data."
      var txt=await callClaude(sys,newH.slice(-10));
      var fH=[...newH,{role:"assistant",content:txt}]; setChatHistory(fH); save(null,null,null,fH,null);
    }catch(e){ setChatHistory([...newH,{role:"assistant",content:"Error. Please retry."}]); }
    setChatLoading(false);
  }

  var totalStockValue   = portfolio.reduce(function(s,p){ return s+p.value; },0);
  var totalOptionsValue = optionsPositions.reduce(function(s,o){ return s+(o.contracts*o.premium*100); },0);
  var totalInvested     = portfolio.reduce(function(s,p){ return s+(p.shares*p.avgPrice); },0);
  var totalValue        = totalStockValue+totalOptionsValue+cashBalance;
  var totalPnL          = portfolio.reduce(function(s,p){ return s+(p.value-p.shares*p.avgPrice); },0);
  var drawdown          = ((totalValue-PEAK_VALUE)/PEAK_VALUE)*100;
  var dayChange         = portfolio.reduce(function(s,p){ return s+(livePrices[p.symbol]?(livePrices[p.symbol].change/100)*p.value:0); },0);

  function renderVerdictCard(result,keyPrefix){
    if(!result) return null;
    if(result.error) return React.createElement("div",{key:keyPrefix,style:{color:"#ff6644",fontSize:11,padding:10,background:"#0a0e18",borderRadius:6,marginBottom:10}},"Error analyzing "+result.symbol+": "+result.error);
    var C=result;
    var consColor=C.consensus==="BUY"?"#00ff88":C.consensus==="SELL"?"#ff4444":"#ffcc00";
    var convColor=C.stars==="HIGH CONVICTION"?"#00ff88":C.stars==="MEDIUM CONVICTION"?"#ffcc00":"#ff8844";
    return React.createElement("div",{key:keyPrefix,style:{border:"2px solid "+consColor+"50",borderRadius:8,marginBottom:16,overflow:"hidden"}},
      React.createElement("div",{style:{background:"linear-gradient(135deg,#0a1428,#0d1f3c)",padding:"12px 14px",borderBottom:"1px solid "+consColor+"30"}},
        React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}},
          React.createElement("span",{style:{color:"#ffffff",fontWeight:"bold",fontSize:18}},C.symbol),
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
        C.tradeTypeDecision&&(function(){
          var isOpt=C.tradeTypeDecision==="OPTIONS",isBoth=C.tradeTypeDecision==="OPTIONS_OR_STOCK";
          var bdC=isOpt?"#00ff88":isBoth?"#ffcc00":"#4488ff";
          var lbC=isOpt?"#00ff88":isBoth?"#ffcc00":"#4488ff";
          var icon=isOpt?"📊":isBoth?"⚖️":"📈";
          var label=isOpt?"USE OPTIONS":isBoth?"OPTIONS OR STOCK":"USE STOCK";
          return React.createElement("div",{style:{background:isOpt?"#0a1a0a":isBoth?"#1a1400":"#0a0a1a",borderRadius:6,padding:"10px 12px",marginBottom:10,border:"2px solid "+bdC}},
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}},
              React.createElement("span",{style:{color:"#888",fontSize:9,letterSpacing:2}},"COMMITTEE DECISION"),
              React.createElement("span",{style:{color:lbC,fontSize:14,fontWeight:"bold"}},icon+" "+label)
            ),
            React.createElement("div",{style:{color:"#cccccc",fontSize:11,marginBottom:isOpt&&C.consensusStrike?6:0}},C.tradeTypeReason),
            isOpt&&C.consensusStrike&&React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginTop:6}},
              React.createElement("div",{style:{background:"#ffffff08",borderRadius:4,padding:"5px 8px",textAlign:"center"}},
                React.createElement("div",{style:{color:"#666",fontSize:9,marginBottom:2}},"CONTRACT"),
                React.createElement("div",{style:{color:C.consensusOptionType==="CALL"?"#00ff88":"#ff4444",fontSize:13,fontWeight:"bold"}},(C.consensusOptionType==="CALL"?"📈":"📉")+" "+C.consensusOptionType)
              ),
              React.createElement("div",{style:{background:"#ffffff08",borderRadius:4,padding:"5px 8px",textAlign:"center"}},
                React.createElement("div",{style:{color:"#666",fontSize:9,marginBottom:2}},"AVG STRIKE"),
                React.createElement("div",{style:{color:"#00ccff",fontSize:13,fontWeight:"bold"}},"$"+C.consensusStrike)
              ),
              C.consensusPremium&&React.createElement("div",{style:{background:"#ff000015",borderRadius:4,padding:"5px 8px",textAlign:"center",border:"1px solid #ff444420"}},
                React.createElement("div",{style:{color:"#ff4444aa",fontSize:9,marginBottom:2}},"MAX RISK"),
                React.createElement("div",{style:{color:"#ff8866",fontSize:13,fontWeight:"bold"}},"$"+(parseFloat((C.consensusPremium||"0").replace(/[^0-9.]/g,""))*100).toFixed(0))
              )
            )
          );
        })(),
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}},
          React.createElement("div",{style:{background:"#003322",border:"2px solid #00ff8850",borderRadius:6,padding:"8px",textAlign:"center"}},
            React.createElement("div",{style:{color:"#00ff8899",fontSize:9,letterSpacing:2,marginBottom:2}},"ENTRY"),
            React.createElement("div",{style:{color:"#00ff88",fontSize:11,fontWeight:"bold"}},C.entry||"-")
          ),
          React.createElement("div",{style:{background:"#001a33",border:"2px solid #00ccff50",borderRadius:6,padding:"8px",textAlign:"center"}},
            React.createElement("div",{style:{color:"#00ccff99",fontSize:9,letterSpacing:2,marginBottom:2}},"TARGET"),
            React.createElement("div",{style:{color:"#00ccff",fontSize:11,fontWeight:"bold"}},C.target||"-")
          ),
          React.createElement("div",{style:{background:"#330000",border:"2px solid #ff444450",borderRadius:6,padding:"8px",textAlign:"center"}},
            React.createElement("div",{style:{color:"#ff444499",fontSize:9,letterSpacing:2,marginBottom:2}},"STOP"),
            React.createElement("div",{style:{color:"#ff6666",fontSize:11,fontWeight:"bold"}},C.stop||"-")
          )
        ),
        C.insiderSignal&&C.insiderSignal!=="NEUTRAL"&&React.createElement("div",{style:{background:"#1a1200",borderRadius:4,padding:"6px 10px",marginBottom:8,border:"1px solid #ffaa0030"}},
          React.createElement("span",{style:{color:"#ffaa00",fontSize:9,letterSpacing:2}},"INSIDER: "),
          React.createElement("span",{style:{color:C.insiderSignal==="BUYING"?"#00ff88":"#ff4444",fontSize:11,fontWeight:"bold"}},"👁 "+C.insiderSignal+" — "),
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
              React.createElement("div",{style:{color:"#aaaaaa",fontSize:10,lineHeight:1.4,marginBottom:vote.technicals||vote.flowdata||vote.optionsplay?2:0}},vote.reasoning),
              vote.technicals&&React.createElement("div",{style:{color:"#4488ff",fontSize:9}},vote.technicals),
              vote.flowdata&&React.createElement("div",{style:{color:"#aa88ff",fontSize:9}},vote.flowdata),
              vote.optionsplay&&React.createElement("div",{style:{color:"#cc99ff",fontSize:9}},"Options: "+vote.optionsplay)
            );
          })
        ),
        React.createElement("div",{style:{display:"flex",gap:8}},
          React.createElement("button",{style:Object.assign({},S.btn("#00ff88"),{flex:1,padding:"9px",fontSize:10}),onClick:function(){ setActiveTab("portfolio"); }},"APPROVE — LOG TRADE"),
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
      if(/^[📊🏦📅🌍⚠️💡]/.test(lt)) output.push(React.createElement("div",{key:i,style:{color:"#00ff88",fontWeight:"bold",marginTop:20,marginBottom:8,fontSize:14,borderBottom:"2px solid #00ff8825",paddingBottom:6}},lt));
      else if(lt.startsWith("|")&&!lt.includes("---")){
        var cells=lt.split("|").filter(function(c){ return c.trim(); });
        var isHdr=i+1<lines.length&&(lines[i+1]||"").includes("---");
        output.push(React.createElement("div",{key:i,style:{display:"grid",gridTemplateColumns:"repeat("+cells.length+",1fr)",gap:3,marginBottom:3}},
          cells.map(function(c,j){ return React.createElement("div",{key:j,style:{padding:"4px 8px",background:isHdr?"#1a2a1a":"#0c1018",border:"1px solid #1a2a1a",borderRadius:3,color:isHdr?"#00ff88":"#cccccc",fontSize:11,textAlign:"center"}},c.trim()); })
        ));
      }
      else if(lt.startsWith("-")||lt.startsWith("*")) output.push(React.createElement("div",{key:i,style:{color:"#cccccc",paddingLeft:14,marginBottom:4,fontSize:12}},"→ "+lt.slice(1).trim()));
      else if(lt==="") output.push(React.createElement("div",{key:i,style:{height:6}}));
      else output.push(React.createElement("div",{key:i,style:{color:"#cccccc",fontSize:12,marginBottom:3,lineHeight:1.7}},lt));
    });
    return output;
  }

  var TABS=["briefing","scanner","risk","portfolio","trades","chat"];

  return (
    <div style={S.app}>
      <div style={S.hdr}>
        <div>
          <div style={{fontSize:9,color:"#00ff88",letterSpacing:3}}>ASYMMETRIC AI FUND</div>
          <div style={{fontSize:18,fontWeight:"bold",color:"#fff"}}>Aidan's War Room</div>
          <div style={{fontSize:10,color:"#778877",marginTop:2}}>
            Today: <span style={{color:dayChange>=0?"#00ff88":"#ff4444"}}>{dayChange>=0?"+":""}{dayChange.toFixed(2)}</span>
            {" · "}Drawdown: <span style={{color:drawdown>=-4?"#00ff88":drawdown>=-8?"#ffcc00":"#ff4444"}}>{drawdown.toFixed(1)}%</span>
            {optionsPositions.length>0&&<span style={{color:"#aa88ff",marginLeft:8}}> · Options: {optionsPositions.length} open</span>}
          </div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:9,color:"#444",letterSpacing:2}}>TOTAL VALUE</div>
          <div style={{fontSize:20,fontWeight:"bold",color:"#00ff88"}}>{"$"}{totalValue.toFixed(2)}</div>
          <div style={{fontSize:11,color:totalPnL>=0?"#00ff88":"#ff4444"}}>{totalPnL>=0?"+":""}{totalPnL.toFixed(2)} P&L</div>
        </div>
      </div>

      {riskAlerts.map(function(a,i){ return React.createElement("div",{key:i,style:{background:"#180808",borderBottom:"1px solid "+a.color+"60",padding:"7px 16px",fontSize:12,color:a.color,fontWeight:"bold"}},a.msg); })}

      <div style={S.tkr}>
        <div style={{display:"inline-flex",gap:16,alignItems:"center"}}>
          {Object.entries(livePrices).map(function(e){
            var sym=e[0],d=e[1];
            return React.createElement("span",{key:sym,style:{display:"inline-flex",gap:4,alignItems:"center"}},
              React.createElement("span",{style:{color:"#778877",fontSize:10}},sym),
              React.createElement("span",{style:{color:"#ffffff",fontSize:11,fontWeight:"bold"}},"$"+d.price.toFixed(2)),
              React.createElement("span",{style:{color:d.change>=0?"#00ff88":"#ff4444",fontSize:10}},(d.change>=0?"▲":"▼")+Math.abs(d.change).toFixed(2)+"%")
            );
          })}
          <button onClick={fetchLivePrices} style={{background:"none",border:"none",color:"#00ff8825",cursor:"pointer",fontSize:13}}>⟳</button>
          {lastUpdated&&<span style={{color:"#556655",fontSize:9}}>{lastUpdated}</span>}
        </div>
      </div>

      <div style={S.tabs}>{TABS.map(function(t){ return React.createElement("button",{key:t,onClick:function(){ setActiveTab(t); },style:S.tab(activeTab===t)},t); })}</div>

      <div style={{padding:14}}>

        {activeTab==="briefing"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
              <span style={{color:"#669966",fontSize:10,letterSpacing:2}}>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"}).toUpperCase()}</span>
              <span style={{color:"#aaaaaa",fontSize:11}}>Cash: <span style={{color:"#00ff88",fontWeight:"bold"}}>{"$"}{cashBalance.toFixed(2)}</span></span>
            </div>
            <button onClick={getDailyBriefing} disabled={loading} style={S.btn()}>
              {loading?"⟳ Searching macro data...":"▶ GET MACRO MARKET BRIEFING"}
            </button>
            <div style={{marginTop:8,marginBottom:12,padding:"8px 12px",background:"#0a0e18",borderRadius:4,border:"1px solid #1a2a1a",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{color:"#556655",fontSize:10}}>Fed · Inflation · Geopolitics · Sector Rotation · Key Events · Risks</span>
              <span style={{color:"#aa88ff",fontSize:10,cursor:"pointer"}} onClick={function(){ setActiveTab("scanner"); }}>→ TRADE IDEAS IN SCANNER TAB</span>
            </div>
            {briefing?(
              <div style={{background:"#070a12",border:"1px solid #1a2a1a",borderRadius:6,padding:16,lineHeight:1.65}}>{fmtBriefing(briefing)}</div>
            ):(
              <div style={{textAlign:"center",padding:50,color:"#446644",border:"1px dashed #2a4a2a",borderRadius:4}}>
                <div style={{fontSize:28,marginBottom:8}}>🌍</div>
                <div style={{fontSize:10,letterSpacing:2}}>HIT BRIEFING FOR MACRO MARKET CONTEXT</div>
                <div style={{fontSize:10,color:"#556655",marginTop:6}}>Fed · Inflation · Geopolitics · Sector Rotation · Key Events</div>
                <div style={{fontSize:10,color:"#aa88ff",marginTop:4}}>For trade ideas → go to SCANNER tab</div>
              </div>
            )}
          </div>
        )}

        {activeTab==="scanner"&&(
          <div>
            <div style={S.lbl}>AI MARKET SCANNER — 4-AGENT COMMITTEE</div>
            <div style={{fontSize:11,color:"#889988",marginBottom:12,lineHeight:1.6}}>
              Automatically searches the entire market, finds the best candidates, then runs all 4 agents on each one. Only stocks that get 2/4+ agent votes are shown. No symbol input needed.
            </div>
            <button onClick={runMarketScan} disabled={scanLoading} style={S.btn("#00ff88","linear-gradient(135deg,#003322,#006644)")}>
              {scanLoading?"⟳ SCANNING... (this takes 2-3 minutes, batching to avoid rate limits)":"▶ SCAN MARKET — FIND AGENT-APPROVED TRADES"}
            </button>
            {scanStatus&&React.createElement("div",{style:{marginTop:8,marginBottom:8,padding:"8px 12px",background:"#0a0e18",borderRadius:4,border:"1px solid #1a2a1a",color:scanLoading?"#ffcc00":"#00ff88",fontSize:11,letterSpacing:1}},scanStatus)}
            {scanResults.length>0&&(
              <div style={{marginTop:12}}>
                <div style={{color:"#00ff88",fontSize:10,letterSpacing:2,marginBottom:12,padding:"6px 10px",background:"#001a0d",borderRadius:4,border:"1px solid #00ff8830"}}>
                  {"✓ "+scanResults.length+" AGENT-APPROVED TRADE"+(scanResults.length>1?"S":"")+" — COMMITTEE PASSED 2/4+ VOTES"}
                </div>
                {scanResults.map(function(result,idx){ return renderVerdictCard(result,"scan"+idx); })}
              </div>
            )}
            <div style={Object.assign({},S.card,{marginTop:20,border:"1px solid #1a2a3a"})}>
              <div style={S.lbl}>MANUAL SYMBOL CHECK</div>
              <div style={{fontSize:10,color:"#556655",marginBottom:8}}>Want to check a specific stock yourself? Run all 4 agents on any symbol.</div>
              <div style={{display:"flex",gap:6,marginBottom:8}}>
                <input placeholder="e.g. NVDA, SOFI, AMD" value={manualSymbol} onChange={function(e){ setManualSymbol(e.target.value.toUpperCase()); }} onKeyDown={function(e){ if(e.key==="Enter") runManualSymbol(); }} style={Object.assign({},S.inp,{flex:1})}/>
                <button onClick={runManualSymbol} disabled={manualLoading||!manualSymbol} style={Object.assign({},S.btn("#4488ff","linear-gradient(135deg,#080f28,#001055)"),{width:"auto",padding:"8px 16px",fontSize:10})}>
                  {manualLoading?"⟳":"RUN AGENTS"}
                </button>
              </div>
              {manualResult&&renderVerdictCard(manualResult,"manual")}
            </div>
          </div>
        )}

        {activeTab==="risk"&&(
          <div>
            <div style={S.lbl}>INSTITUTIONAL RISK MANAGEMENT</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:12}}>
              {[["Stock Value","$"+totalStockValue.toFixed(2),"#00ff88"],["Options Value","$"+totalOptionsValue.toFixed(2),"#aa88ff"],["Cash Buffer","$"+cashBalance.toFixed(2)+" ("+((cashBalance/totalValue)*100).toFixed(0)+"%)","#4488ff"],["Total Value","$"+totalValue.toFixed(2),"#ffffff"],["Open P&L",(totalPnL>=0?"+":"")+"$"+totalPnL.toFixed(2),totalPnL>=0?"#00ff88":"#ff4444"],["Today",(dayChange>=0?"+":"")+"$"+dayChange.toFixed(2),dayChange>=0?"#00ff88":"#ff4444"],["Drawdown",drawdown.toFixed(2)+"%",drawdown>=-4?"#00ff88":drawdown>=-8?"#ffcc00":"#ff4444"],["CB Status",drawdown<=-8?"TRIGGERED":drawdown<=-4?"WARNING":"CLEAR",drawdown<=-8?"#ff4444":drawdown<=-4?"#ffcc00":"#00ff88"]].map(function(item){
                return React.createElement("div",{key:item[0],style:{background:"#05070e",border:"1px solid #0a120a",borderRadius:4,padding:"8px 10px"}},
                  React.createElement("div",{style:{color:"#889988",fontSize:9,letterSpacing:1,marginBottom:3}},item[0]),
                  React.createElement("div",{style:{color:item[2],fontSize:13,fontWeight:"bold"}},item[1])
                );
              })}
            </div>
            <div style={S.card}>
              <div style={S.lbl}>CIRCUIT BREAKERS</div>
              {[{label:"Daily Loss Limit",limit:"2.5%",triggered:dayChange/totalValue*100<=-2.5},{label:"Max Drawdown",limit:"8% from peak",triggered:drawdown<=-8},{label:"Position Stop",limit:"8% per position",triggered:false},{label:"Options Max Risk",limit:"$300 per contract",triggered:false}].map(function(cb){
                return React.createElement("div",{key:cb.label,style:{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #08080a"}},
                  React.createElement("span",{style:{color:"#aaaaaa",fontSize:11}},cb.label),
                  React.createElement("span",{style:{color:"#889988",fontSize:11}},"Limit: "+cb.limit),
                  React.createElement("span",{style:{color:cb.triggered?"#ff4444":"#00ff88",fontSize:11,fontWeight:"bold"}},cb.triggered?"ACTIVE":"CLEAR")
                );
              })}
            </div>
            {optionsPositions.length>0&&React.createElement("div",{style:S.card},
              React.createElement("div",{style:S.lbl},"OPEN OPTIONS POSITIONS"),
              optionsPositions.map(function(o,idx){
                var days=getDaysUntilExpiry(o.expiry);
                var urgColor=days!==null&&days<=1?"#ff2222":days!==null&&days<=2?"#ffaa00":"#aa88ff";
                return React.createElement("div",{key:idx,style:{padding:"8px 10px",background:"#04060e",borderRadius:3,marginBottom:6,borderLeft:"3px solid "+urgColor}},
                  React.createElement("div",{style:{display:"flex",justifyContent:"space-between"}},
                    React.createElement("span",{style:{color:"#ddd",fontWeight:"bold",fontSize:12}},o.symbol+" "+o.optionType+" $"+o.strike),
                    React.createElement("span",{style:{color:urgColor,fontSize:11}},(days!==null?days+" days left":"exp: "+o.expiry))
                  ),
                  React.createElement("div",{style:{color:"#aaaaaa",fontSize:10,marginTop:2}},o.contracts+" contract(s) · premium $"+o.premium+" · cost $"+(o.contracts*o.premium*100).toFixed(0))
                );
              })
            )}
            <div style={S.card}>
              <div style={S.lbl}>ACTIVE ALERTS ({riskAlerts.length})</div>
              {riskAlerts.length===0?React.createElement("div",{style:{color:"#00ff8866",fontSize:12,textAlign:"center",padding:20}},"All clear - no active risk alerts"):riskAlerts.map(function(a,idx){ return React.createElement("div",{key:idx,style:{padding:"7px 10px",background:"#05070e",borderRadius:3,marginBottom:6,borderLeft:"3px solid "+a.color}},React.createElement("div",{style:{color:a.color,fontSize:11}},a.msg)); })}
            </div>
            <div style={S.card}>
              <div style={S.lbl}>POSITION RISK MAP</div>
              {portfolio.map(function(p){
                var live=livePrices[p.symbol];
                var pnlPct=live?((live.price-p.avgPrice)/p.avgPrice)*100:0;
                var weight=(p.value/(totalValue-cashBalance))*100;
                var rc=pnlPct<=-8?"#ff4444":pnlPct<=-4?"#ff8844":pnlPct>=15?"#00ccff":"#00ff88";
                return React.createElement("div",{key:p.symbol,style:{marginBottom:8,padding:"8px 10px",background:"#04060e",borderRadius:3,borderLeft:"3px solid "+rc}},
                  React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:3}},React.createElement("span",{style:{color:"#ddd",fontWeight:"bold",fontSize:12}},p.symbol),React.createElement("span",{style:{color:rc,fontSize:12,fontWeight:"bold"}},(pnlPct>=0?"+":"")+pnlPct.toFixed(1)+"%")),
                  React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:4}},React.createElement("span",{style:{color:"#aaaaaa",fontSize:10}},"Weight: "+weight.toFixed(1)+"%"),React.createElement("span",{style:{color:"#aaaaaa",fontSize:10}},"$"+p.value.toFixed(2)),React.createElement("span",{style:{color:"#ff444460",fontSize:10}},"Stop: $"+(p.avgPrice*0.92).toFixed(2))),
                  React.createElement("div",{style:{height:3,background:"#08080a",borderRadius:2}},React.createElement("div",{style:{width:Math.min(weight,100)+"%",height:"100%",background:rc,borderRadius:2,opacity:0.7}}))
                );
              })}
            </div>
          </div>
        )}

        {activeTab==="portfolio"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6,marginBottom:12}}>
              {[["STOCKS","$"+totalStockValue.toFixed(0),"#00ff88"],["OPTIONS","$"+totalOptionsValue.toFixed(0),"#aa88ff"],["CASH","$"+cashBalance.toFixed(0),"#4488ff"],["TOTAL","$"+totalValue.toFixed(0),"#ffffff"]].map(function(item){
                return React.createElement("div",{key:item[0],style:{background:"#06080f",border:"1px solid #0a120a",borderRadius:4,padding:"8px",textAlign:"center"}},
                  React.createElement("div",{style:{color:"#889988",fontSize:9,letterSpacing:2,marginBottom:2}},item[0]),
                  React.createElement("div",{style:{color:item[2],fontSize:13,fontWeight:"bold"}},item[1])
                );
              })}
            </div>
            <div style={{display:"flex",gap:6,marginBottom:12}}>
              <button onClick={function(){ setPortfolioView("stocks"); }} style={Object.assign({},S.btn(portfolioView==="stocks"?"#00ff88":"#446644",portfolioView==="stocks"?"linear-gradient(135deg,#003322,#006644)":"linear-gradient(135deg,#060a0a,#0a1010)"),{flex:1,padding:"8px",fontSize:10})}>STOCKS ({portfolio.length})</button>
              <button onClick={function(){ setPortfolioView("options"); }} style={Object.assign({},S.btn(portfolioView==="options"?"#aa88ff":"#443366",portfolioView==="options"?"linear-gradient(135deg,#18082a,#300050)":"linear-gradient(135deg,#060a0a,#0a1010)"),{flex:1,padding:"8px",fontSize:10})}>OPTIONS ({optionsPositions.length})</button>
            </div>
            {portfolioView==="stocks"&&portfolio.map(function(p,idx){
              var live=livePrices[p.symbol];
              var pnlPct=live?((live.price-p.avgPrice)/p.avgPrice)*100:((p.value/(p.shares*p.avgPrice))-1)*100;
              var pnlD=p.value-p.shares*p.avgPrice;
              var atStop=pnlPct<=-8,atTgt=pnlPct>=15;
              var bc=atStop?"#ff4444":atTgt?"#00ccff":pnlPct>=0?"#00ff88":"#ff6644";
              return React.createElement("div",{key:idx,style:Object.assign({},S.card,{borderLeft:"3px solid "+bc})},
                React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:4}},
                  React.createElement("div",null,React.createElement("span",{style:{color:"#fff",fontWeight:"bold",fontSize:14}},p.symbol),atStop&&React.createElement("span",{style:{color:"#ff6666",fontSize:10,marginLeft:8}},"STOP ZONE"),atTgt&&React.createElement("span",{style:{color:"#00ddff",fontSize:10,marginLeft:8}},"TARGET ZONE")),
                  React.createElement("span",{style:{color:"#ddd",fontSize:13}},"$"+p.value.toFixed(2))
                ),
                React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:live?4:0}},
                  React.createElement("span",{style:{color:"#aaaaaa",fontSize:10}},p.shares.toFixed(4)+"sh @ $"+p.avgPrice.toFixed(2)),
                  React.createElement("span",{style:{color:pnlPct>=0?"#00ff88":"#ff4444",fontSize:12,fontWeight:"bold"}},(pnlPct>=0?"+":"")+pnlPct.toFixed(2)+"% ("+(pnlD>=0?"+":"")+"$"+pnlD.toFixed(2)+")")
                ),
                live&&React.createElement("div",{style:{display:"flex",gap:10,fontSize:10}},
                  React.createElement("span",{style:{color:"#999"}},"Live: "),React.createElement("span",{style:{color:"#fff"}},"$"+live.price.toFixed(2)),
                  React.createElement("span",{style:{color:"#999"}},"H: "),React.createElement("span",{style:{color:"#ccc"}},"$"+(live.high?live.high.toFixed(2):"-")),
                  React.createElement("span",{style:{color:"#999"}},"L: "),React.createElement("span",{style:{color:"#ccc"}},"$"+(live.low?live.low.toFixed(2):"-")),
                  React.createElement("span",{style:{color:live.change>=0?"#00ff8850":"#ff444450"}},(live.change>=0?"▲":"▼")+Math.abs(live.change).toFixed(2)+"%")
                )
              );
            })}
            {portfolioView==="options"&&(optionsPositions.length===0?
              React.createElement("div",{style:{textAlign:"center",padding:30,color:"#443355",border:"1px dashed #2a1a4a",borderRadius:4}},React.createElement("div",{style:{fontSize:24,marginBottom:8}},"📊"),React.createElement("div",{style:{fontSize:10,letterSpacing:2,color:"#aa88ff"}},"NO OPEN OPTIONS POSITIONS"))
              :optionsPositions.map(function(o,idx){
                var days=getDaysUntilExpiry(o.expiry);
                var uc=days!==null&&days<=1?"#ff2222":days!==null&&days<=2?"#ffaa00":"#aa88ff";
                return React.createElement("div",{key:idx,style:Object.assign({},S.card,{borderLeft:"3px solid "+uc,borderColor:uc+"40"})},
                  React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:6}},
                    React.createElement("div",null,React.createElement("span",{style:{color:"#fff",fontWeight:"bold",fontSize:14}},o.symbol),React.createElement("span",{style:{color:o.optionType==="CALL"?"#00ff88":"#ff4444",fontWeight:"bold",fontSize:13,marginLeft:8}},o.optionType),React.createElement("span",{style:{color:"#cccccc",fontSize:12,marginLeft:6}},"$"+o.strike)),
                    React.createElement("span",{style:{color:uc,fontSize:11,fontWeight:"bold"}},(days!==null?days+" days left":"exp: "+o.expiry))
                  ),
                  React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:8}},
                    React.createElement("div",{style:{background:"#ffffff08",borderRadius:4,padding:"6px 8px",textAlign:"center"}},React.createElement("div",{style:{color:"#666",fontSize:9,marginBottom:2}},"CONTRACTS"),React.createElement("div",{style:{color:"#ccc",fontSize:13,fontWeight:"bold"}},o.contracts)),
                    React.createElement("div",{style:{background:"#ffffff08",borderRadius:4,padding:"6px 8px",textAlign:"center"}},React.createElement("div",{style:{color:"#666",fontSize:9,marginBottom:2}},"PREMIUM"),React.createElement("div",{style:{color:"#ffcc00",fontSize:13,fontWeight:"bold"}},"$"+o.premium)),
                    React.createElement("div",{style:{background:"#ff000015",borderRadius:4,padding:"6px 8px",textAlign:"center",border:"1px solid #ff444430"}},React.createElement("div",{style:{color:"#ff4444aa",fontSize:9,marginBottom:2}},"MAX LOSS"),React.createElement("div",{style:{color:"#ff6666",fontSize:13,fontWeight:"bold"}},"$"+(o.contracts*o.premium*100).toFixed(0)))
                  ),
                  days!==null&&days<=1&&React.createElement("div",{style:{background:"#2a0000",borderRadius:4,padding:"6px 10px",marginBottom:8,border:"1px solid #ff222240",textAlign:"center"}},React.createElement("span",{style:{color:"#ff2222",fontSize:11,fontWeight:"bold"}},"EXPIRING SOON — CLOSE OR LOSE ENTIRE PREMIUM")),
                  o.note&&React.createElement("div",{style:{color:"#777",fontSize:10,marginBottom:6}},o.note),
                  React.createElement("button",{onClick:function(){ closeOptionPosition(idx); },style:Object.assign({},S.btn("#ff8844","linear-gradient(135deg,#1a0800,#2a1000)"),{padding:"7px",fontSize:10})},"CLOSE POSITION (SELL TO CLOSE)")
                );
              })
            )}
            <div style={Object.assign({},S.card,{marginTop:16,border:"1px solid #1a2a1a"})}>
              <div style={S.lbl}>LOG STOCK TRADE</div>
              <div style={{display:"flex",gap:6,marginBottom:6}}>
                <input placeholder="SYMBOL" value={tradeForm.symbol} onChange={function(e){ setTradeForm(Object.assign({},tradeForm,{symbol:e.target.value.toUpperCase()})); }} style={Object.assign({},S.inp,{flex:1})}/>
                <select value={tradeForm.action} onChange={function(e){ setTradeForm(Object.assign({},tradeForm,{action:e.target.value})); }} style={Object.assign({},S.inp,{width:"auto",color:tradeForm.action==="BUY"?"#00ff88":"#ff4444"})}>
                  <option value="BUY">BUY</option><option value="SELL">SELL</option>
                </select>
              </div>
              <div style={{display:"flex",gap:6,marginBottom:6}}>
                <input placeholder="Shares" type="number" value={tradeForm.shares} onChange={function(e){ setTradeForm(Object.assign({},tradeForm,{shares:e.target.value})); }} style={Object.assign({},S.inp,{flex:1})}/>
                <input placeholder="Price" type="number" value={tradeForm.price} onChange={function(e){ setTradeForm(Object.assign({},tradeForm,{price:e.target.value})); }} style={Object.assign({},S.inp,{flex:1})}/>
              </div>
              <input placeholder="Note / strategy" value={tradeForm.note} onChange={function(e){ setTradeForm(Object.assign({},tradeForm,{note:e.target.value})); }} style={Object.assign({},S.inp,{marginBottom:8})}/>
              <button onClick={logTrade} style={S.btn()}>CONFIRM STOCK TRADE</button>
            </div>
            <div style={Object.assign({},S.card,{marginTop:10,border:"2px solid #aa88ff30"})}>
              <div style={Object.assign({},S.lbl,{color:"#aa88ff"})}>LOG OPTIONS TRADE (BUY TO OPEN)</div>
              <div style={{display:"flex",gap:6,marginBottom:6}}>
                <input placeholder="SYMBOL" value={optionForm.symbol} onChange={function(e){ setOptionForm(Object.assign({},optionForm,{symbol:e.target.value.toUpperCase()})); }} style={Object.assign({},S.inp,{flex:1})}/>
                <select value={optionForm.type} onChange={function(e){ setOptionForm(Object.assign({},optionForm,{type:e.target.value})); }} style={Object.assign({},S.inp,{width:"auto",color:optionForm.type==="CALL"?"#00ff88":"#ff4444"})}>
                  <option value="CALL">CALL</option><option value="PUT">PUT</option>
                </select>
              </div>
              <div style={{display:"flex",gap:6,marginBottom:6}}>
                <input placeholder="Strike Price e.g. 220" type="number" value={optionForm.strike} onChange={function(e){ setOptionForm(Object.assign({},optionForm,{strike:e.target.value})); }} style={Object.assign({},S.inp,{flex:1})}/>
                <input placeholder="Expiry e.g. 2026-05-17" value={optionForm.expiry} onChange={function(e){ setOptionForm(Object.assign({},optionForm,{expiry:e.target.value})); }} style={Object.assign({},S.inp,{flex:1})}/>
              </div>
              <div style={{display:"flex",gap:6,marginBottom:6}}>
                <input placeholder="Contracts e.g. 1" type="number" value={optionForm.contracts} onChange={function(e){ setOptionForm(Object.assign({},optionForm,{contracts:e.target.value})); }} style={Object.assign({},S.inp,{flex:1})}/>
                <input placeholder="Premium paid e.g. 2.50" type="number" value={optionForm.premium} onChange={function(e){ setOptionForm(Object.assign({},optionForm,{premium:e.target.value})); }} style={Object.assign({},S.inp,{flex:1})}/>
              </div>
              {optionForm.contracts&&optionForm.premium&&React.createElement("div",{style:{background:"#0d0a1a",borderRadius:4,padding:"6px 10px",marginBottom:8,border:"1px solid #aa88ff20"}},
                React.createElement("span",{style:{color:"#aa88ff",fontSize:10}},"Total cost: "),
                React.createElement("span",{style:{color:"#ffcc00",fontWeight:"bold",fontSize:13}},"$"+(parseInt(optionForm.contracts||1)*parseFloat(optionForm.premium||0)*100).toFixed(0)),
                React.createElement("span",{style:{color:"#666",fontSize:10,marginLeft:8}},"("+optionForm.contracts+" x $"+optionForm.premium+" x 100)")
              )}
              <input placeholder="Note e.g. Scanner approved 3/4 bullish" value={optionForm.note} onChange={function(e){ setOptionForm(Object.assign({},optionForm,{note:e.target.value})); }} style={Object.assign({},S.inp,{marginBottom:8})}/>
              <button onClick={logOptionTrade} style={S.btn("#aa88ff","linear-gradient(135deg,#18082a,#300050)")}>CONFIRM OPTIONS TRADE</button>
            </div>
            <div style={Object.assign({},S.card,{marginTop:8,border:"1px solid #1a2a3a"})}>
              <div style={S.lbl}>SET CASH BALANCE</div>
              <div style={{display:"flex",gap:8}}>
                <input placeholder="Enter exact cash amount e.g. 500" type="number" id="cashInput" style={Object.assign({},S.inp,{flex:1})}/>
                <button onClick={function(){ var val=parseFloat(document.getElementById("cashInput").value); if(!isNaN(val)&&val>=0){ setCashBalance(val); try{localStorage.setItem("ca3",String(val));}catch(e){} document.getElementById("cashInput").value=""; } }} style={Object.assign({},S.btn("#4488ff","linear-gradient(135deg,#060e24,#000e44)"),{width:"auto",padding:"0 16px"})}>SET</button>
              </div>
            </div>
          </div>
        )}

        {activeTab==="trades"&&(
          <div>
            <div style={S.lbl}>TRADE HISTORY ({trades.length})</div>
            {trades.length===0?
              React.createElement("div",{style:{textAlign:"center",padding:40,color:"#446644",border:"1px dashed #2a4a2a",borderRadius:4}},React.createElement("div",{style:{fontSize:10,letterSpacing:2}},"NO TRADES LOGGED YET"))
              :trades.map(function(t,idx){
                var isOption=t.type==="OPTION";
                var bc=isOption?(t.optionType==="CALL"?"#aa88ff":"#ff88aa"):(t.action==="BUY"?"#00ff88":"#ff6644");
                var isEditing=editingTrade===idx;
                return React.createElement("div",{key:idx,style:Object.assign({},S.card,{borderLeft:"3px solid "+bc})},
                  React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:3,alignItems:"center"}},
                    React.createElement("span",{style:{color:bc,fontWeight:"bold",fontSize:11}},isOption?("OPTION "+t.optionType+" "+t.action):t.action),
                    React.createElement("div",{style:{display:"flex",gap:6,alignItems:"center"}},
                      React.createElement("span",{style:{color:"#888",fontSize:10}},t.date),
                      React.createElement("button",{onClick:function(){ startEditTrade(idx); },style:{background:"linear-gradient(135deg,#0a1428,#0d1f3c)",border:"1px solid #4488ff60",color:"#4488ff",padding:"3px 8px",fontSize:9,cursor:"pointer",borderRadius:3,fontFamily:"inherit"}},"EDIT"),
                      React.createElement("button",{onClick:function(){ if(window.confirm("Delete this trade? This reverses the position and cash.")) deleteTrade(idx); },style:{background:"linear-gradient(135deg,#1a0606,#2a0000)",border:"1px solid #ff444460",color:"#ff4444",padding:"3px 8px",fontSize:9,cursor:"pointer",borderRadius:3,fontFamily:"inherit"}},"DELETE")
                    )
                  ),
                  isEditing?(
                    React.createElement("div",{style:{marginTop:8,padding:"10px",background:"#04060e",borderRadius:4,border:"1px solid #4488ff30"}},
                      React.createElement("div",{style:{color:"#4488ff",fontSize:9,letterSpacing:2,marginBottom:8}},"EDIT TRADE"),
                      React.createElement("div",{style:{display:"flex",gap:6,marginBottom:6}},
                        React.createElement("input",{value:editForm.symbol||"",onChange:function(e){ setEditForm(Object.assign({},editForm,{symbol:e.target.value.toUpperCase()})); },style:Object.assign({},S.inp,{flex:1}),placeholder:"Symbol"}),
                        React.createElement("select",{value:editForm.action||"BUY",onChange:function(e){ setEditForm(Object.assign({},editForm,{action:e.target.value})); },style:Object.assign({},S.inp,{width:"auto",color:editForm.action==="BUY"?"#00ff88":"#ff4444"})},React.createElement("option",{value:"BUY"},"BUY"),React.createElement("option",{value:"SELL"},"SELL"))
                      ),
                      !isOption&&React.createElement("div",{style:{display:"flex",gap:6,marginBottom:6}},
                        React.createElement("input",{placeholder:"Shares",type:"number",value:editForm.shares||"",onChange:function(e){ setEditForm(Object.assign({},editForm,{shares:e.target.value})); },style:Object.assign({},S.inp,{flex:1})}),
                        React.createElement("input",{placeholder:"Price",type:"number",value:editForm.price||"",onChange:function(e){ setEditForm(Object.assign({},editForm,{price:e.target.value})); },style:Object.assign({},S.inp,{flex:1})})
                      ),
                      React.createElement("input",{placeholder:"Note",value:editForm.note||"",onChange:function(e){ setEditForm(Object.assign({},editForm,{note:e.target.value})); },style:Object.assign({},S.inp,{marginBottom:8})}),
                      React.createElement("div",{style:{display:"flex",gap:6}},
                        React.createElement("button",{onClick:saveEditTrade,style:Object.assign({},S.btn("#4488ff","linear-gradient(135deg,#060e24,#000e44)"),{flex:1,padding:"8px",fontSize:10})},"SAVE CHANGES"),
                        React.createElement("button",{onClick:function(){ setEditingTrade(null); setEditForm({}); },style:Object.assign({},S.btn("#888","linear-gradient(135deg,#0a0a0a,#141414)"),{flex:1,padding:"8px",fontSize:10})},"CANCEL")
                      )
                    )
                  ):(
                    React.createElement("div",null,
                      isOption?React.createElement("div",{style:{display:"flex",justifyContent:"space-between"}},React.createElement("span",{style:{color:"#eee",fontSize:13}},t.symbol+" "+t.optionType+" $"+t.strike+" exp:"+t.expiry),React.createElement("span",{style:{color:"#aaa",fontSize:12}},"$"+t.total.toFixed(2)))
                      :React.createElement("div",{style:{display:"flex",justifyContent:"space-between"}},React.createElement("span",{style:{color:"#eee",fontSize:13}},t.symbol+" - "+t.shares+"sh @ $"+t.price),React.createElement("span",{style:{color:"#aaa",fontSize:12}},"$"+t.total.toFixed(2))),
                      t.note&&React.createElement("div",{style:{color:"#777",fontSize:10,marginTop:3}},t.note)
                    )
                  )
                );
              })
            }
          </div>
        )}

        {activeTab==="chat"&&(
          <div>
            <div style={S.lbl}>ASK YOUR QUANT</div>
            <div style={{background:"#04060e",border:"1px solid #0a120a",borderRadius:4,padding:12,minHeight:220,maxHeight:420,overflowY:"auto",marginBottom:10}}>
              {chatHistory.length===0?
                React.createElement("div",{style:{color:"#446644",fontSize:10,letterSpacing:2,textAlign:"center",marginTop:70}},
                  React.createElement("div",null,"ASK ANYTHING — OPTIONS, ENTRIES, EXITS, STRATEGY, MARKET"),
                  React.createElement("div",{style:{color:"#aa88ff",marginTop:8,letterSpacing:1}},"OPTIONS PLAYS INCLUDED IN ALL RESPONSES")
                )
                :chatHistory.map(function(m,idx){
                  return React.createElement("div",{key:idx,style:{marginBottom:14}},
                    React.createElement("div",{style:{fontSize:9,color:m.role==="user"?"#00ff8899":"#4488ffaa",letterSpacing:2,marginBottom:4}},m.role==="user"?"YOU":"QUANT"),
                    React.createElement("div",{style:{color:m.role==="user"?"#eee":"#ccc",fontSize:12,lineHeight:1.6}},typeof m.content==="string"?m.content:"")
                  );
                })
              }
              {chatLoading&&React.createElement("div",{style:{color:"#00ff8866",fontSize:10,letterSpacing:2}},"Searching market data...")}
            </div>
            <div style={{display:"flex",gap:8}}>
              <input placeholder="Best call on NVDA? Should I hold MU? What is SPY doing?" value={chatInput} onChange={function(e){ setChatInput(e.target.value); }} onKeyDown={function(e){ if(e.key==="Enter") sendChat(); }} style={Object.assign({},S.inp,{flex:1})}/>
              <button onClick={sendChat} disabled={chatLoading} style={Object.assign({},S.btn("#4488ff","linear-gradient(135deg,#060e24,#000e44)"),{width:"auto",padding:"8px 16px"})}>GO</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
