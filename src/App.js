import React, { useState, useEffect } from "react";

const INITIAL_PORTFOLIO = [
  { symbol: "USO",  shares: 0.33995,  avgPrice: 132.37, value: 45.26 },
  { symbol: "NVDA", shares: 0.74883,  avgPrice: 200.31, value: 161.04 },
  { symbol: "MU",   shares: 0.6869,   avgPrice: 436.74, value: 520.22 },
  { symbol: "BITX", shares: 16.72725, avgPrice: 17.99,  value: 337.05 },
  { symbol: "SPY",  shares: 6.39058,  avgPrice: 656.05, value: 4714.59 },
];
const PEAK_VALUE = 5978;

// ─── AGENT PROMPTS (Information Asymmetry — each agent sees different data) ──
const WOLF_PROMPT  = (sym) => `You are Agent Wolf — a Warren Buffett-style analyst. You see FUNDAMENTALS ONLY. No charts, no news sentiment.
Search for ${sym} fundamental data: P/E ratio, revenue growth, earnings history, profit margins, debt levels, free cash flow, analyst price targets.
Based ONLY on fundamentals, give your vote.
Respond in pure JSON only (no markdown, no extra text):
{"direction":"BUY","conviction":0.8,"entry":750,"target":850,"stop":695,"reasoning":"Strong earnings growth and clean balance sheet","horizon_days":5}`;

const COHEN_PROMPT = (sym, price) => `You are Agent Cohen — a pure price action trader. You see PRICE DATA ONLY. You do NOT know what this company does.
Price data for ${sym}: ${price}
Analyze ONLY price action: trend, support/resistance, volume, momentum signals.
Respond in pure JSON only (no markdown, no extra text):
{"direction":"BUY","conviction":0.7,"entry":750,"target":800,"stop":720,"reasoning":"Price above 50-day MA on rising volume","horizon_days":3}`;

const DALIO_PROMPT = (sym, price) => `You are Agent Dalio — a macro-first analyst like Ray Dalio. You see price data AND macro context.
Symbol: ${sym}. Price: ${price}
Search for current macro environment: Fed policy, inflation data, sector rotation, risk-on/risk-off sentiment. Then analyze how macro affects this trade.
Respond in pure JSON only (no markdown, no extra text):
{"direction":"BUY","conviction":0.75,"entry":750,"target":820,"stop":710,"reasoning":"Rate pause environment favors tech semis","horizon_days":4}`;

// ─── MAIN BRIEFING PROMPT ────────────────────────────────────────────────────
const BRIEFING_PROMPT = () => `You are the Head Quant at an asymmetric AI hedge fund managing Aidan's aggressive retail portfolio.
Today: ${new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}.

AIDAN: Aggressive risk tolerance. Weekly active management. Short-term trades 1-5 days. Goal: beat the market every week.

8-FACTOR QUALITY GATE — mentally score every stock before recommending it:
1. MOMENTUM — outperforming SPY last 4 weeks?
2. VALUE — PEG under 2, not wildly overvalued?
3. QUALITY — profitable, positive FCF, manageable debt?
4. GROWTH — revenue/earnings accelerating?
5. REVISION — analysts raising estimates?
6. SHORT INTEREST — squeeze potential?
7. INSIDER ACTIVITY — Form 4 insider buying recently?
8. INSTITUTIONAL FLOW — smart money accumulating?
Only recommend stocks scoring 3+ factors. State the score (e.g. "6/8 factors").

6-STRATEGY FRAMEWORK:
1. MOMENTUM+CATALYST — trending + event within 7 days
2. MEAN REVERSION DIP — strong stock pulled back 5-15% to support
3. FACTOR QUALITY — fundamentally strong, institutions buying
4. EVENT-DRIVEN — CPI, Fed, earnings, FDA dates
5. SENTIMENT+OPTIONS — unusual call volume, analyst upgrades
6. RELATIVE STRENGTH — outperforming SPY last 1-4 weeks

CIRCUIT BREAKER RULES:
- Portfolio down 2.5% today → recommend cash preservation only
- Any position down 8% from avg → immediate stop loss flag
- Two positions highly correlated → flag correlation risk

DAILY BRIEFING FORMAT (use exactly):

📊 MARKET OUTLOOK
Direction: UP or DOWN bias this week
Key Level: S&P support/resistance to watch
Macro Driver: The one thing driving everything right now

💼 PORTFOLIO REVIEW
Each holding: [UP▲/DOWN▼] HOLD/ADD/TRIM — one sentence why
Flag positions near stops or targets with 🛑 or 🎯

🎯 COMMITTEE TRADE PLANS (3-5 ideas, quality gate pre-screened)
[⭐⭐⭐] SYMBOL | LONG▲ or SHORT▼
Quality Gate: X/8 factors
Strategy: which strategy
Insider Signal: BUYING/SELLING/NEUTRAL
Entry: $XX.XX–$XX.XX
Target: $XX.XX (+X% in X days)
Stop Loss: $XX.XX (-X%)
Time Window: X–X days
Why: 2-3 sentences with specific catalyst and price levels
Risk: one sentence

📅 EVENTS THIS WEEK
Date | Event | UP/DOWN impact on portfolio

⚠️ RISK + CORRELATION WARNING
Biggest threat today. Any correlated position pairs to watch.

RULES: Web search first. Real prices only. Specific dollar amounts always. Max 2 tech picks. State position sizes.`;

const S = {
  app:   { background:"#060810", minHeight:"100vh", fontFamily:"'Courier New',monospace", color:"#e0e0e0" },
  hdr:   { background:"linear-gradient(135deg,#080f20,#0d1f3c)", borderBottom:"1px solid #00ff8820", padding:"14px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" },
  tkr:   { background:"#04060e", borderBottom:"1px solid #080f08", padding:"6px 16px", overflowX:"auto", whiteSpace:"nowrap" },
  tabs:  { display:"flex", borderBottom:"1px solid #0d100d", background:"#050710" },
  tab:   (a) => ({ flex:1, padding:"9px 2px", background:"none", border:"none", borderBottom: a?"2px solid #00ff88":"2px solid transparent", color:a?"#00ff88":"#333", fontSize:10, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit" }),
  card:  { background:"#080c14", border:"1px solid #0d180d", borderRadius:4, padding:12, marginBottom:8 },
  btn:   (c="#00ff88",bg="linear-gradient(135deg,#002a1a,#005533)") => ({ background:bg, border:`1px solid ${c}40`, color:c, padding:"11px", fontFamily:"inherit", fontSize:11, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", borderRadius:3, width:"100%" }),
  inp:   { background:"#04060e", border:"1px solid #0d180d", color:"#fff", padding:"8px 10px", fontFamily:"inherit", fontSize:12, borderRadius:3, width:"100%", boxSizing:"border-box" },
  lbl:   { color:"#333", fontSize:10, letterSpacing:2, marginBottom:6, display:"block" },
};

export default function QuantDashboard() {
  const [portfolio,     setPortfolio]     = useState(INITIAL_PORTFOLIO);
  const [trades,        setTrades]        = useState([]);
  const [briefing,      setBriefing]      = useState("");
  const [loading,       setLoading]       = useState(false);
  const [activeTab,     setActiveTab]     = useState("briefing");
  const [cashBalance,   setCashBalance]   = useState(750);
  const [livePrices,    setLivePrices]    = useState({});
  const [lastUpdated,   setLastUpdated]   = useState(null);
  const [chatHistory,   setChatHistory]   = useState([]);
  const [chatInput,     setChatInput]     = useState("");
  const [chatLoading,   setChatLoading]   = useState(false);
  const [tradeForm,     setTradeForm]     = useState({symbol:"",action:"BUY",shares:"",price:"",note:""});
  const [agentVotes,    setAgentVotes]    = useState({});
  const [agentLoading,  setAgentLoading]  = useState(false);
  const [scanSymbol,    setScanSymbol]    = useState("");
  const [factorScores,  setFactorScores]  = useState({});
  const [scanLoading,   setScanLoading]   = useState(false);
  const [riskAlerts,    setRiskAlerts]    = useState([]);

  useEffect(() => { loadData(); fetchLivePrices(); const iv=setInterval(fetchLivePrices,60000); return ()=>clearInterval(iv); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if(Object.keys(livePrices).length>0) runRiskEngine(); }, [livePrices]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── RISK ENGINE ──────────────────────────────────────────────────────────
  function runRiskEngine() {
    const alerts = [];
    const totalVal = portfolio.reduce((s,p)=>s+p.value,0)+cashBalance;
    const dayChange = portfolio.reduce((s,p)=>{ const l=livePrices[p.symbol]; return s+(l?(l.change/100)*p.value:0); },0);
    const dayPct = totalVal>0?(dayChange/totalVal)*100:0;
    const drawdown = ((totalVal-PEAK_VALUE)/PEAK_VALUE)*100;
    if(dayPct<=-2.5) alerts.push({msg:`🚨 CIRCUIT BREAKER: Down ${dayPct.toFixed(2)}% today — preserve cash, no new trades`,color:"#ff2222"});
    if(drawdown<=-8)  alerts.push({msg:`🔴 DRAWDOWN: ${drawdown.toFixed(2)}% from peak — risk management active`,color:"#ff4444"});
    portfolio.forEach(p=>{
      const l=livePrices[p.symbol]; if(!l) return;
      const pct=((l.price-p.avgPrice)/p.avgPrice)*100;
      if(pct<=-8) alerts.push({msg:`🛑 ${p.symbol}: Down ${pct.toFixed(1)}% from avg — at stop loss level, consider cutting`,color:"#ff6644"});
      if(pct>=15)  alerts.push({msg:`🎯 ${p.symbol}: Up ${pct.toFixed(1)}% — at profit target zone, consider trimming`,color:"#00ccff"});
    });
    const techVal = portfolio.filter(p=>["NVDA","MU","AMAT","AMD","AAPL","MSFT","SMH"].includes(p.symbol)).reduce((s,p)=>s+p.value,0);
    const invested = portfolio.reduce((s,p)=>s+p.value,0);
    if(invested>0&&(techVal/invested)>0.60) alerts.push({msg:`⚡ CORRELATION RISK: ${((techVal/invested)*100).toFixed(0)}% in tech — highly correlated, reduce concentration`,color:"#ffcc00"});
    setRiskAlerts(alerts);
  }

  // ─── LIVE PRICES ──────────────────────────────────────────────────────────
  async function fetchLivePrices() {
    const syms=[...new Set([...portfolio.map(p=>p.symbol),"SPY","QQQ","AMAT","AMD","AAPL","BTC-USD","SMH","GLD"])];
    const res={};
    await Promise.all(syms.map(async sym=>{
      try{
        const r=await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=2d`);
        const d=await r.json(); const m=d?.chart?.result?.[0]?.meta;
        if(m){const c=m.regularMarketPrice,p=m.chartPreviousClose||m.previousClose; res[sym]={price:c,change:p?((c-p)/p)*100:0,high:m.regularMarketDayHigh,low:m.regularMarketDayLow,volume:m.regularMarketVolume,prev:p};}
      }catch{}
    }));
    setLivePrices(res); setLastUpdated(new Date().toLocaleTimeString());
    setPortfolio(prev=>prev.map(p=>{const l=res[p.symbol]; return l?{...p,value:l.price*p.shares,livePrice:l.price}:p;}));
  }

  // ─── STORAGE ──────────────────────────────────────────────────────────────
  function loadData(){
    try{
      const p=localStorage.getItem("pf3"); if(p) setPortfolio(JSON.parse(p));
      const t=localStorage.getItem("tr3"); if(t) setTrades(JSON.parse(t));
      const c=localStorage.getItem("ca3"); if(c) setCashBalance(parseFloat(c));
      const ch=localStorage.getItem("ch3"); if(ch) setChatHistory(JSON.parse(ch));
      const fs=localStorage.getItem("fs3"); if(fs) setFactorScores(JSON.parse(fs));
    }catch{}
  }
  function save(np,nt,nc,nch){
    try{
      if(np!==null) localStorage.setItem("pf3",JSON.stringify(np??portfolio));
      if(nt!==null) localStorage.setItem("tr3",JSON.stringify(nt??trades));
      if(nc!==null) localStorage.setItem("ca3",String(nc??cashBalance));
      if(nch!==null) localStorage.setItem("ch3",JSON.stringify(nch??chatHistory));
    }catch{}
  }

  // ─── CLAUDE API ───────────────────────────────────────────────────────────
  async function callClaude(system, messages, search=true){
    const body={model:"claude-sonnet-4-20250514",max_tokens:2000,system,messages};
    if(search) body.tools=[{type:"web_search_20250305",name:"web_search"}];
    const r=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    const d=await r.json();
    if(d.error) throw new Error(d.error);
    return d.content.filter(b=>b.type==="text").map(b=>b.text).join("\n");
  }

  // ─── DAILY BRIEFING ───────────────────────────────────────────────────────
  async function getDailyBriefing(){
    setLoading(true); setBriefing("");
    try{
      const portStr=portfolio.map(p=>{const l=livePrices[p.symbol];const pct=l?(((l.price-p.avgPrice)/p.avgPrice)*100).toFixed(1):"?";return `${p.symbol}: ${p.shares.toFixed(4)}sh @ $${p.avgPrice.toFixed(2)} avg | Live:$${l?.price?.toFixed(2)||"?"} | P&L:${pct}%`;}).join("\n");
      const liveStr=Object.entries(livePrices).map(([s,d])=>`${s}:$${d.price?.toFixed(2)}(${d.change>=0?"+":""}${d.change?.toFixed(2)}%)`).join(", ");
      const riskStr=riskAlerts.length?riskAlerts.map(a=>a.msg).join("; "):"No active alerts";
      const trHist=trades.slice(-5).map(t=>`${t.date} ${t.action} ${t.symbol} @$${t.price}`).join("; ");
      const txt=await callClaude(BRIEFING_PROMPT(),[{role:"user",content:`Daily check-in ${new Date().toLocaleDateString()}.
LIVE PRICES: ${liveStr}
PORTFOLIO:\n${portStr}
CASH: $${cashBalance.toFixed(2)}
RISK ALERTS: ${riskStr}
RECENT TRADES: ${trHist||"none"}
Search market news first. Run quality gate. Deliver full briefing with trade plans.`}]);
      setBriefing(txt);
    }catch(e){setBriefing("Error — check connection and try again.");}
    setLoading(false);
  }

  // ─── 3-AGENT COMMITTEE ────────────────────────────────────────────────────
  async function runCommittee(symbol){
    if(!symbol) return;
    setAgentLoading(true);
    const live=livePrices[symbol]||{};
    const priceStr=`Price:$${live.price?.toFixed(2)}, Today:${live.change?.toFixed(2)}%, High:$${live.high?.toFixed(2)}, Low:$${live.low?.toFixed(2)}, Volume:${(live.volume||0).toLocaleString()}`;
    const votes={};
    try{
      const [wTxt,cTxt,dTxt]=await Promise.all([
        callClaude(WOLF_PROMPT(symbol),[{role:"user",content:`Search and analyze ${symbol} fundamentals only. Provide JSON vote.`}]),
        callClaude(COHEN_PROMPT(symbol,priceStr),[{role:"user",content:`Analyze this price data only for ${symbol}: ${priceStr}. Provide JSON vote.`}],false),
        callClaude(DALIO_PROMPT(symbol,priceStr),[{role:"user",content:`Search macro context then analyze ${symbol}. Provide JSON vote.`}]),
      ]);
      for(const [name,txt] of [["🐺 Wolf (Fundamentals)",wTxt],["📈 Cohen (Price Action)",cTxt],["🌐 Dalio (Macro)",dTxt]]){
        try{
          const clean=txt.replace(/```json|```/g,"").trim();
          const s=clean.indexOf("{"),e=clean.lastIndexOf("}");
          votes[name]=JSON.parse(clean.substring(s,e+1));
        }catch{votes[name]={direction:"HOLD",conviction:0.5,reasoning:txt.slice(0,150)};}
      }
      const dirs=Object.values(votes).map(v=>v.direction);
      const buys=dirs.filter(d=>d==="BUY").length, sells=dirs.filter(d=>d==="SELL").length;
      const consensus=buys>=2?"BUY":sells>=2?"SELL":"HOLD";
      const avgConv=Object.values(votes).reduce((s,v)=>s+(v.conviction||0.5),0)/3;
      const stars=avgConv>0.75?"⭐⭐⭐":avgConv>0.5?"⭐⭐":"⭐";
      const entries=Object.values(votes).filter(v=>v.entry).map(v=>v.entry);
      const targets=Object.values(votes).filter(v=>v.target).map(v=>v.target);
      const stops=Object.values(votes).filter(v=>v.stop).map(v=>v.stop);
      votes["_c"]={symbol,consensus,buys,sells,holds:3-buys-sells,avgConv:avgConv.toFixed(2),stars,
        entry:entries.length?`$${Math.min(...entries).toFixed(2)}–$${Math.max(...entries).toFixed(2)}`:null,
        target:targets.length?`$${(targets.reduce((a,b)=>a+b,0)/targets.length).toFixed(2)}`:null,
        stop:stops.length?`$${Math.min(...stops).toFixed(2)}`:null};
      setAgentVotes(prev=>({...prev,[symbol]:votes}));
    }catch(e){console.error(e);}
    setAgentLoading(false);
  }

  // ─── QUALITY GATE ─────────────────────────────────────────────────────────
  async function runQualityGate(symbol){
    if(!symbol) return;
    setScanLoading(true);
    try{
      const live=livePrices[symbol]||{};
      const txt=await callClaude(
        `You are the 8-Factor Quality Gate scoring engine. Score ${symbol} on each factor 0.0–1.0. Search for current data.
Return ONLY this JSON (no markdown):
{"symbol":"${symbol}","factors":{"momentum":0.0,"value":0.0,"quality":0.0,"growth":0.0,"revision":0.0,"short_interest":0.0,"insider":0.0,"institutional":0.0},"composite":0.0,"passes_gate":true,"insider_signal":"NEUTRAL","summary":"one sentence"}`,
        [{role:"user",content:`Score ${symbol}. Current price: $${live.price?.toFixed(2)}. Search for fundamentals, insider filings, and analyst data.`}]
      );
      try{
        const clean=txt.replace(/```json|```/g,"").trim();
        const s=clean.indexOf("{"),e=clean.lastIndexOf("}");
        const parsed={...JSON.parse(clean.substring(s,e+1)),scoredAt:new Date().toLocaleTimeString()};
        const newFS={...factorScores,[symbol]:parsed};
        setFactorScores(newFS);
        localStorage.setItem("fs3",JSON.stringify(newFS));
      }catch{setFactorScores(prev=>({...prev,[symbol]:{error:true,raw:txt.slice(0,200)}}));}
    }catch{}
    setScanLoading(false);
  }

  // ─── TRADE LOG ────────────────────────────────────────────────────────────
  function logTrade(){
    if(!tradeForm.symbol||!tradeForm.shares||!tradeForm.price) return;
    const trade={...tradeForm,date:new Date().toLocaleDateString(),shares:parseFloat(tradeForm.shares),price:parseFloat(tradeForm.price),total:parseFloat(tradeForm.shares)*parseFloat(tradeForm.price)};
    const newTrades=[trade,...trades];
    let newPF=[...portfolio],newCash=cashBalance;
    if(trade.action==="BUY"){
      newCash-=trade.total;
      const ex=newPF.find(p=>p.symbol===trade.symbol.toUpperCase());
      if(ex){const ts=ex.shares+trade.shares;ex.avgPrice=((ex.shares*ex.avgPrice)+(trade.shares*trade.price))/ts;ex.shares=ts;ex.value=ex.shares*trade.price;}
      else newPF.push({symbol:trade.symbol.toUpperCase(),shares:trade.shares,avgPrice:trade.price,value:trade.total});
    }else{
      newCash+=trade.total;
      newPF=newPF.map(p=>{if(p.symbol!==trade.symbol.toUpperCase())return p;const rem=p.shares-trade.shares;return rem<=0.001?null:{...p,shares:rem,value:rem*trade.price};}).filter(Boolean);
    }
    setTrades(newTrades);setPortfolio(newPF);setCashBalance(newCash);
    setTradeForm({symbol:"",action:"BUY",shares:"",price:"",note:""});
    save(newPF,newTrades,newCash,null);
  }

  // ─── CHAT ─────────────────────────────────────────────────────────────────
  async function sendChat(){
    if(!chatInput.trim()) return;
    setChatLoading(true);
    const uMsg={role:"user",content:chatInput};
    const newH=[...chatHistory,uMsg]; setChatHistory(newH); setChatInput("");
    try{
      const portStr=portfolio.map(p=>`${p.symbol}:$${livePrices[p.symbol]?.price?.toFixed(2)||"?"}`).join(", ");
      const txt=await callClaude(BRIEFING_PROMPT()+`\nPortfolio:${portStr}. Cash:$${cashBalance.toFixed(2)}. Use quality gate + 6-strategy framework.`,newH.slice(-10));
      const aMsg={role:"assistant",content:txt};
      const fH=[...newH,aMsg]; setChatHistory(fH); save(null,null,null,fH);
    }catch{setChatHistory([...newH,{role:"assistant",content:"Error. Please retry."}]);}
    setChatLoading(false);
  }

  // ─── COMPUTED ─────────────────────────────────────────────────────────────
  const totalInvested = portfolio.reduce((s,p)=>s+(p.shares*p.avgPrice),0);
  const totalValue    = portfolio.reduce((s,p)=>s+p.value,0)+cashBalance;
  const totalPnL      = portfolio.reduce((s,p)=>s+(p.value-p.shares*p.avgPrice),0);
  const drawdown      = ((totalValue-PEAK_VALUE)/PEAK_VALUE)*100;
  const dayChange     = portfolio.reduce((s,p)=>s+(livePrices[p.symbol]?(livePrices[p.symbol].change/100)*p.value:0),0);

  // ─── BRIEFING FORMATTER ───────────────────────────────────────────────────
  function fmt(text){
    return text.split("\n").map((line,i)=>{
      if(line.match(/^[📊💼🎯⚠️📅]/)) return <div key={i} style={{color:"#00ff88",fontWeight:"bold",marginTop:22,marginBottom:8,fontSize:14,borderBottom:"1px solid #00ff8815",paddingBottom:5}}>{line}</div>;
      if(line.includes("⭐⭐⭐")) return <div key={i} style={{color:"#00ff88",fontWeight:"bold",marginTop:14,marginBottom:4,fontSize:13,background:"#00ff8810",padding:"5px 10px",borderRadius:4,borderLeft:"3px solid #00ff88"}}>{line}</div>;
      if((line.includes("⭐⭐"))&&(!line.includes("⭐⭐⭐"))) return <div key={i} style={{color:"#ffcc00",fontWeight:"bold",marginTop:14,marginBottom:4,fontSize:13,background:"#ffcc0010",padding:"5px 10px",borderRadius:4,borderLeft:"3px solid #ffcc00"}}>{line}</div>;
      if((line.includes("⭐"))&&(!line.includes("⭐⭐"))) return <div key={i} style={{color:"#ff8844",fontWeight:"bold",marginTop:14,marginBottom:4,fontSize:13,background:"#ff884410",padding:"5px 10px",borderRadius:4,borderLeft:"3px solid #ff8844"}}>{line}</div>;
      if(line.startsWith("Entry:"))        return <div key={i} style={{color:"#00ff88",fontSize:12,paddingLeft:10,marginBottom:3,fontWeight:"bold"}}>🟢 {line}</div>;
      if(line.startsWith("Target:"))       return <div key={i} style={{color:"#00ccff",fontSize:12,paddingLeft:10,marginBottom:3,fontWeight:"bold"}}>🎯 {line}</div>;
      if(line.startsWith("Stop Loss:")||line.startsWith("Stop:")) return <div key={i} style={{color:"#ff4444",fontSize:12,paddingLeft:10,marginBottom:3,fontWeight:"bold"}}>🛑 {line}</div>;
      if(line.startsWith("Time Window:"))  return <div key={i} style={{color:"#ffcc00",fontSize:11,paddingLeft:10,marginBottom:3}}>⏱ {line}</div>;
      if(line.startsWith("Strategy:"))     return <div key={i} style={{color:"#4488ff",fontSize:11,paddingLeft:10,marginBottom:3,fontStyle:"italic"}}>📐 {line}</div>;
      if(line.startsWith("Quality Gate:")) return <div key={i} style={{color:"#aa88ff",fontSize:11,paddingLeft:10,marginBottom:3}}>🔬 {line}</div>;
      if(line.startsWith("Insider Signal:"))return <div key={i} style={{color:"#ffaa00",fontSize:11,paddingLeft:10,marginBottom:3}}>👁 {line}</div>;
      if(line.startsWith("Why:"))          return <div key={i} style={{color:"#ccc",fontSize:12,paddingLeft:10,marginBottom:3}}>{line}</div>;
      if(line.startsWith("Risk:"))         return <div key={i} style={{color:"#ff6644",fontSize:11,paddingLeft:10,marginBottom:8}}>⚡ {line}</div>;
      if(line.includes("🚨")||line.includes("🔴")||line.includes("🛑")&&line.length<80) return <div key={i} style={{color:"#ff3333",fontWeight:"bold",fontSize:12,marginBottom:4,background:"#ff000010",padding:"3px 8px",borderRadius:3}}>{line}</div>;
      if(line.includes("**")){const p=line.split(/\*\*(.*?)\*\*/g);return <div key={i} style={{color:"#bbb",fontSize:12,marginBottom:3}}>{p.map((x,j)=>j%2===1?<strong key={j} style={{color:"#fff"}}>{x}</strong>:x)}</div>;}
      if(line.startsWith("-")||line.startsWith("•")) return <div key={i} style={{color:"#888",paddingLeft:14,marginBottom:3,fontSize:12}}>→ {line.slice(1).trim()}</div>;
      if(line.trim()==="") return <div key={i} style={{height:5}}/>;
      return <div key={i} style={{color:"#bbb",fontSize:12,marginBottom:2}}>{line}</div>;
    });
  }

  const TABS=["briefing","committee","risk","portfolio","trades","chat"];

  return (
    <div style={S.app}>

      {/* HEADER */}
      <div style={S.hdr}>
        <div>
          <div style={{fontSize:9,color:"#00ff88",letterSpacing:3}}>ASYMMETRIC AI FUND</div>
          <div style={{fontSize:18,fontWeight:"bold",color:"#fff"}}>Aidan's War Room</div>
          <div style={{fontSize:10,color:"#333",marginTop:2}}>
            Today: <span style={{color:dayChange>=0?"#00ff88":"#ff4444"}}>{dayChange>=0?"+":""}${dayChange.toFixed(2)}</span>
            {" · "}Drawdown: <span style={{color:drawdown>=-4?"#00ff88":drawdown>=-8?"#ffcc00":"#ff4444"}}>{drawdown.toFixed(1)}%</span>
          </div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:9,color:"#444",letterSpacing:2}}>TOTAL VALUE</div>
          <div style={{fontSize:20,fontWeight:"bold",color:"#00ff88"}}>${totalValue.toFixed(2)}</div>
          <div style={{fontSize:11,color:totalPnL>=0?"#00ff88":"#ff4444"}}>{totalPnL>=0?"+":""}${totalPnL.toFixed(2)} P&L</div>
        </div>
      </div>

      {/* RISK BANNERS */}
      {riskAlerts.map((a,i)=>(
        <div key={i} style={{background:"#0e0808",borderBottom:`1px solid ${a.color}30`,padding:"5px 16px",fontSize:11,color:a.color}}>{a.msg}</div>
      ))}

      {/* LIVE TICKER */}
      <div style={S.tkr}>
        <div style={{display:"inline-flex",gap:16,alignItems:"center"}}>
          {Object.entries(livePrices).map(([sym,d])=>(
            <span key={sym} style={{display:"inline-flex",gap:4,alignItems:"center"}}>
              <span style={{color:"#444",fontSize:10}}>{sym}</span>
              <span style={{color:"#ccc",fontSize:11,fontWeight:"bold"}}>${d.price?.toFixed(2)}</span>
              <span style={{color:d.change>=0?"#00ff88":"#ff4444",fontSize:10}}>{d.change>=0?"▲":"▼"}{Math.abs(d.change).toFixed(2)}%</span>
            </span>
          ))}
          <button onClick={fetchLivePrices} style={{background:"none",border:"none",color:"#00ff8825",cursor:"pointer",fontSize:13}}>⟳</button>
          {lastUpdated&&<span style={{color:"#1a1a1a",fontSize:9}}>{lastUpdated}</span>}
        </div>
      </div>

      {/* TABS */}
      <div style={S.tabs}>{TABS.map(t=><button key={t} onClick={()=>setActiveTab(t)} style={S.tab(activeTab===t)}>{t}</button>)}</div>

      <div style={{padding:14}}>

        {/* ── BRIEFING ── */}
        {activeTab==="briefing"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
              <span style={{color:"#222",fontSize:10,letterSpacing:2}}>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"}).toUpperCase()}</span>
              <span style={{color:"#333",fontSize:10}}>Cash: <span style={{color:"#00ff88"}}>${cashBalance.toFixed(2)}</span></span>
            </div>
            <button onClick={getDailyBriefing} disabled={loading} style={S.btn()}>
              {loading?"⟳ Quality Gate · Agent Analysis · Trade Plans...":"▶ GET FULL DAILY BRIEFING"}
            </button>
            <div style={{height:12}}/>
            {briefing?(
              <div style={{background:"#05070e",border:"1px solid #0d180d",borderRadius:4,padding:14,lineHeight:1.65}}>{fmt(briefing)}</div>
            ):(
              <div style={{textAlign:"center",padding:50,color:"#0f1a0f",border:"1px dashed #0a120a",borderRadius:4}}>
                <div style={{fontSize:28,marginBottom:8}}>📈</div>
                <div style={{fontSize:10,letterSpacing:2,color:"#1a2a1a"}}>HIT BRIEFING TO START YOUR DAY</div>
                <div style={{fontSize:10,color:"#111a11",marginTop:8}}>Quality Gate · 3-Agent Committee · Trade Plans · Risk Management</div>
              </div>
            )}
          </div>
        )}

        {/* ── COMMITTEE ── */}
        {activeTab==="committee"&&(
          <div>
            <div style={S.lbl}>3-AGENT COMMITTEE — INFORMATION ASYMMETRY</div>
            <div style={{fontSize:11,color:"#2a3a2a",marginBottom:12,lineHeight:1.6}}>
              Wolf sees fundamentals only. Cohen sees price only. Dalio sees macro. They vote independently — real disagreement before consensus. You are the Portfolio Manager: Approve or Reject.
            </div>

            <div style={S.card}>
              <div style={S.lbl}>SCAN SYMBOL</div>
              <div style={{display:"flex",gap:6,marginBottom:8}}>
                <input placeholder="e.g. NVDA, AMAT, AMD" value={scanSymbol} onChange={e=>setScanSymbol(e.target.value.toUpperCase())} onKeyDown={e=>e.key==="Enter"&&runQualityGate(scanSymbol)} style={{...S.inp,flex:1}}/>
                <button onClick={()=>runQualityGate(scanSymbol)} disabled={scanLoading||!scanSymbol} style={{...S.btn("#aa88ff","linear-gradient(135deg,#18082a,#300050)"),width:"auto",padding:"8px 12px",fontSize:10}}>
                  {scanLoading?"⟳":"🔬 GATE"}
                </button>
                <button onClick={()=>runCommittee(scanSymbol)} disabled={agentLoading||!scanSymbol} style={{...S.btn("#4488ff","linear-gradient(135deg,#080f28,#001055)"),width:"auto",padding:"8px 12px",fontSize:10}}>
                  {agentLoading?"⟳":"🗳 VOTE"}
                </button>
              </div>

              {/* Factor Scores */}
              {factorScores[scanSymbol]&&(()=>{
                const sc=factorScores[scanSymbol];
                if(sc.error) return <div style={{color:"#ff6644",fontSize:11}}>Parse error — try again</div>;
                return(
                  <div>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                      <span style={{color:"#aa88ff",fontSize:12,fontWeight:"bold"}}>🔬 {sc.symbol} — Quality Gate</span>
                      <span style={{color:sc.passes_gate?"#00ff88":"#ff4444",fontSize:12,fontWeight:"bold"}}>{sc.passes_gate?"✅ PASSES":"❌ BLOCKED"} · {sc.composite?.toFixed(2)}</span>
                    </div>
                    {sc.factors&&(
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,marginBottom:8}}>
                        {Object.entries(sc.factors).map(([f,v])=>(
                          <div key={f} style={{display:"flex",justifyContent:"space-between",padding:"3px 8px",background:"#04060e",borderRadius:2}}>
                            <span style={{color:"#444",fontSize:10,textTransform:"uppercase"}}>{f.replace("_"," ")}</span>
                            <div style={{display:"flex",alignItems:"center",gap:5}}>
                              <div style={{width:36,height:3,background:"#0a0a0a",borderRadius:2}}>
                                <div style={{width:`${(v||0)*100}%`,height:"100%",background:v>0.6?"#00ff88":v>0.35?"#ffcc00":"#ff4444",borderRadius:2}}/>
                              </div>
                              <span style={{color:v>0.6?"#00ff88":v>0.35?"#ffcc00":"#ff6644",fontSize:10}}>{(v||0).toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {sc.insider_signal&&<div style={{color:"#ffaa00",fontSize:11,marginBottom:4}}>👁 Insider Signal: {sc.insider_signal}</div>}
                    {sc.summary&&<div style={{color:"#666",fontSize:11}}>{sc.summary}</div>}
                    <div style={{color:"#222",fontSize:9,marginTop:4}}>Scored {sc.scoredAt}</div>
                  </div>
                );
              })()}
            </div>

            {/* Committee Votes */}
            {agentVotes[scanSymbol]&&(()=>{
              const votes=agentVotes[scanSymbol];
              const C=votes["_c"];
              const consColor=C?.consensus==="BUY"?"#00ff88":C?.consensus==="SELL"?"#ff4444":"#ffcc00";
              return(
                <div>
                  {/* Verdict Card */}
                  <div style={{...S.card,borderColor:`${consColor}40`,borderWidth:1}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                      <span style={{color:"#fff",fontWeight:"bold",fontSize:13}}>COMMITTEE VERDICT</span>
                      <span style={{color:consColor,fontWeight:"bold",fontSize:15}}>{C?.stars} {C?.consensus}</span>
                    </div>
                    <div style={{display:"flex",gap:16,marginBottom:10}}>
                      <span style={{color:"#00ff88",fontSize:12}}>✅ Buy: {C?.buys}/3</span>
                      <span style={{color:"#ff4444",fontSize:12}}>❌ Sell: {C?.sells}/3</span>
                      <span style={{color:"#888",fontSize:12}}>Avg conviction: {C?.avgConv}</span>
                    </div>
                    {C?.entry&&<div style={{color:"#00ff88",fontSize:12,marginBottom:3}}>🟢 Entry Zone: {C.entry}</div>}
                    {C?.target&&<div style={{color:"#00ccff",fontSize:12,marginBottom:3}}>🎯 Avg Target: {C.target}</div>}
                    {C?.stop&&<div style={{color:"#ff4444",fontSize:12,marginBottom:12}}>🛑 Stop Loss: {C.stop}</div>}
                    <div style={{display:"flex",gap:8}}>
                      <button style={{...S.btn("#00ff88"),flex:1,padding:"10px"}} onClick={()=>{setActiveTab("portfolio");setScanSymbol("");}}>✅ APPROVE — LOG TRADE</button>
                      <button style={{...S.btn("#ff4444","linear-gradient(135deg,#1a0606,#2a0000)"),flex:1,padding:"10px"}} onClick={()=>setAgentVotes(p=>{const n={...p};delete n[scanSymbol];return n;})}>❌ REJECT</button>
                    </div>
                  </div>
                  {/* Individual Agent Cards */}
                  {Object.entries(votes).filter(([k])=>k!=="_c").map(([agent,vote])=>(
                    <div key={agent} style={{...S.card,borderLeft:`3px solid ${vote.direction==="BUY"?"#00ff88":vote.direction==="SELL"?"#ff4444":"#ffcc00"}`}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                        <span style={{color:"#aaa",fontSize:11,fontWeight:"bold"}}>{agent}</span>
                        <span style={{color:vote.direction==="BUY"?"#00ff88":vote.direction==="SELL"?"#ff4444":"#ffcc00",fontSize:12,fontWeight:"bold"}}>
                          {vote.direction} · {((vote.conviction||0.5)*100).toFixed(0)}%
                        </span>
                      </div>
                      {vote.entry&&<div style={{color:"#00ff8880",fontSize:11,marginBottom:2}}>Entry: ${vote.entry} · Target: ${vote.target} · Stop: ${vote.stop}</div>}
                      <div style={{color:"#666",fontSize:11,lineHeight:1.5}}>{vote.reasoning}</div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* ── RISK ── */}
        {activeTab==="risk"&&(
          <div>
            <div style={S.lbl}>INSTITUTIONAL RISK MANAGEMENT</div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:12}}>
              {[
                ["Total Value",`$${totalValue.toFixed(2)}`,"#00ff88"],
                ["Cash Buffer",`$${cashBalance.toFixed(2)} (${((cashBalance/totalValue)*100).toFixed(0)}%)`,"#4488ff"],
                ["Open P&L",`${totalPnL>=0?"+":""}$${totalPnL.toFixed(2)}`,totalPnL>=0?"#00ff88":"#ff4444"],
                ["Today",`${dayChange>=0?"+":""}$${dayChange.toFixed(2)}`,dayChange>=0?"#00ff88":"#ff4444"],
                ["Drawdown",`${drawdown.toFixed(2)}%`,drawdown>=-4?"#00ff88":drawdown>=-8?"#ffcc00":"#ff4444"],
                ["CB Status",drawdown<=-8?"🔴 TRIGGERED":drawdown<=-4?"🟡 WARNING":"🟢 CLEAR",drawdown<=-8?"#ff4444":drawdown<=-4?"#ffcc00":"#00ff88"],
              ].map(([l,v,c])=>(
                <div key={l} style={{background:"#05070e",border:"1px solid #0a120a",borderRadius:4,padding:"8px 10px"}}>
                  <div style={{color:"#333",fontSize:9,letterSpacing:1,marginBottom:3}}>{l}</div>
                  <div style={{color:c,fontSize:13,fontWeight:"bold"}}>{v}</div>
                </div>
              ))}
            </div>

            <div style={S.card}>
              <div style={S.lbl}>CIRCUIT BREAKERS</div>
              {[
                {label:"Daily Loss Limit",limit:"2.5%",triggered:dayChange/totalValue*100<=-2.5},
                {label:"Max Drawdown Limit",limit:"8% from peak",triggered:drawdown<=-8},
                {label:"Single Position Stop",limit:"8% per position",triggered:false},
              ].map(cb=>(
                <div key={cb.label} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #08080a"}}>
                  <span style={{color:"#555",fontSize:11}}>{cb.label}</span>
                  <span style={{color:"#333",fontSize:11}}>Limit: {cb.limit}</span>
                  <span style={{color:cb.triggered?"#ff4444":"#00ff88",fontSize:11,fontWeight:"bold"}}>{cb.triggered?"🔴 ACTIVE":"🟢 CLEAR"}</span>
                </div>
              ))}
            </div>

            <div style={S.card}>
              <div style={S.lbl}>ACTIVE ALERTS ({riskAlerts.length})</div>
              {riskAlerts.length===0?(
                <div style={{color:"#00ff8830",fontSize:12,textAlign:"center",padding:20}}>✅ All clear — no active risk alerts</div>
              ):riskAlerts.map((a,i)=>(
                <div key={i} style={{padding:"7px 10px",background:"#05070e",borderRadius:3,marginBottom:6,borderLeft:`3px solid ${a.color}`}}>
                  <div style={{color:a.color,fontSize:11}}>{a.msg}</div>
                </div>
              ))}
            </div>

            <div style={S.card}>
              <div style={S.lbl}>POSITION RISK MAP</div>
              {portfolio.map(p=>{
                const live=livePrices[p.symbol];
                const pnlPct=live?((live.price-p.avgPrice)/p.avgPrice)*100:0;
                const weight=(p.value/(totalValue-cashBalance))*100;
                const rc=pnlPct<=-8?"#ff4444":pnlPct<=-4?"#ff8844":pnlPct>=15?"#00ccff":"#00ff88";
                return(
                  <div key={p.symbol} style={{marginBottom:8,padding:"8px 10px",background:"#04060e",borderRadius:3,borderLeft:`3px solid ${rc}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                      <span style={{color:"#ddd",fontWeight:"bold",fontSize:12}}>{p.symbol}</span>
                      <span style={{color:rc,fontSize:12,fontWeight:"bold"}}>{pnlPct>=0?"+":""}{pnlPct.toFixed(1)}%</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{color:"#333",fontSize:10}}>Weight: {weight.toFixed(1)}%</span>
                      <span style={{color:"#333",fontSize:10}}>${p.value.toFixed(2)}</span>
                      <span style={{color:"#ff444460",fontSize:10}}>Stop: ${(p.avgPrice*0.92).toFixed(2)}</span>
                    </div>
                    <div style={{height:3,background:"#08080a",borderRadius:2}}>
                      <div style={{width:`${Math.min(weight,100)}%`,height:"100%",background:rc,borderRadius:2,opacity:0.7}}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── PORTFOLIO ── */}
        {activeTab==="portfolio"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:12}}>
              {[["INVESTED",`$${totalInvested.toFixed(0)}`,"#666"],["CASH",`$${cashBalance.toFixed(0)}`,"#4488ff"],["TOTAL",`$${totalValue.toFixed(0)}`,"#00ff88"]].map(([l,v,c])=>(
                <div key={l} style={{background:"#06080f",border:"1px solid #0a120a",borderRadius:4,padding:"8px",textAlign:"center"}}>
                  <div style={{color:"#222",fontSize:9,letterSpacing:2,marginBottom:2}}>{l}</div>
                  <div style={{color:c,fontSize:14,fontWeight:"bold"}}>{v}</div>
                </div>
              ))}
            </div>
            {portfolio.map((p,i)=>{
              const live=livePrices[p.symbol];
              const pnlPct=live?((live.price-p.avgPrice)/p.avgPrice)*100:((p.value/(p.shares*p.avgPrice))-1)*100;
              const pnlD=p.value-p.shares*p.avgPrice;
              const atStop=pnlPct<=-8,atTgt=pnlPct>=15;
              const bc=atStop?"#ff4444":atTgt?"#00ccff":pnlPct>=0?"#00ff88":"#ff6644";
              return(
                <div key={i} style={{...S.card,borderLeft:`3px solid ${bc}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <div>
                      <span style={{color:"#fff",fontWeight:"bold",fontSize:14}}>{p.symbol}</span>
                      {atStop&&<span style={{color:"#ff4444",fontSize:9,marginLeft:8}}>🛑 STOP ZONE</span>}
                      {atTgt&&<span style={{color:"#00ccff",fontSize:9,marginLeft:8}}>🎯 TARGET ZONE</span>}
                    </div>
                    <span style={{color:"#ddd",fontSize:13}}>${p.value.toFixed(2)}</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:live?4:0}}>
                    <span style={{color:"#333",fontSize:10}}>{p.shares.toFixed(4)}sh @ ${p.avgPrice.toFixed(2)}</span>
                    <span style={{color:pnlPct>=0?"#00ff88":"#ff4444",fontSize:12,fontWeight:"bold"}}>{pnlPct>=0?"+":""}{pnlPct.toFixed(2)}% (${pnlD>=0?"+":""}${pnlD.toFixed(2)})</span>
                  </div>
                  {live&&(
                    <div style={{display:"flex",gap:10,fontSize:10}}>
                      <span style={{color:"#222"}}>Live:<span style={{color:"#aaa"}}>${live.price?.toFixed(2)}</span></span>
                      <span style={{color:"#222"}}>H:<span style={{color:"#555"}}>${live.high?.toFixed(2)}</span></span>
                      <span style={{color:"#222"}}>L:<span style={{color:"#555"}}>${live.low?.toFixed(2)}</span></span>
                      <span style={{color:live.change>=0?"#00ff8850":"#ff444450"}}>{live.change>=0?"▲":"▼"}{Math.abs(live.change).toFixed(2)}%</span>
                    </div>
                  )}
                </div>
              );
            })}
            <div style={{...S.card,marginTop:16}}>
              <div style={S.lbl}>LOG TRADE</div>
              <div style={{display:"flex",gap:6,marginBottom:6}}>
                <input placeholder="SYMBOL" value={tradeForm.symbol} onChange={e=>setTradeForm({...tradeForm,symbol:e.target.value.toUpperCase()})} style={{...S.inp,flex:1}}/>
                <select value={tradeForm.action} onChange={e=>setTradeForm({...tradeForm,action:e.target.value})} style={{...S.inp,width:"auto",color:tradeForm.action==="BUY"?"#00ff88":"#ff4444"}}>
                  <option value="BUY">BUY</option><option value="SELL">SELL</option>
                </select>
              </div>
              <div style={{display:"flex",gap:6,marginBottom:6}}>
                <input placeholder="Shares" type="number" value={tradeForm.shares} onChange={e=>setTradeForm({...tradeForm,shares:e.target.value})} style={{...S.inp,flex:1}}/>
                <input placeholder="Price $" type="number" value={tradeForm.price} onChange={e=>setTradeForm({...tradeForm,price:e.target.value})} style={{...S.inp,flex:1}}/>
              </div>
              <input placeholder="Note / strategy" value={tradeForm.note} onChange={e=>setTradeForm({...tradeForm,note:e.target.value})} style={{...S.inp,marginBottom:8}}/>
              <button onClick={logTrade} style={S.btn()}>CONFIRM TRADE</button>
            </div>
          </div>
        )}

        {/* ── TRADES ── */}
        {activeTab==="trades"&&(
          <div>
            <div style={S.lbl}>TRADE HISTORY ({trades.length})</div>
            {trades.length===0?(
              <div style={{textAlign:"center",padding:40,color:"#0f1a0f",border:"1px dashed #0a120a",borderRadius:4}}>
                <div style={{fontSize:10,letterSpacing:2}}>NO TRADES LOGGED YET</div>
              </div>
            ):trades.map((t,i)=>(
              <div key={i} style={{...S.card,borderLeft:`3px solid ${t.action==="BUY"?"#00ff88":"#ff6644"}`}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                  <span style={{color:t.action==="BUY"?"#00ff88":"#ff6644",fontWeight:"bold",fontSize:11}}>{t.action}</span>
                  <span style={{color:"#222",fontSize:10}}>{t.date}</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span style={{color:"#ccc",fontSize:13}}>{t.symbol} — {t.shares}sh @ ${t.price}</span>
                  <span style={{color:"#555",fontSize:12}}>${t.total.toFixed(2)}</span>
                </div>
                {t.note&&<div style={{color:"#2a2a2a",fontSize:10,marginTop:3}}>{t.note}</div>}
              </div>
            ))}
          </div>
        )}

        {/* ── CHAT ── */}
        {activeTab==="chat"&&(
          <div>
            <div style={S.lbl}>ASK YOUR QUANT — live data · quality gate · 6 strategies · risk mgmt</div>
            <div style={{background:"#04060e",border:"1px solid #0a120a",borderRadius:4,padding:12,minHeight:220,maxHeight:420,overflowY:"auto",marginBottom:10}}>
              {chatHistory.length===0?(
                <div style={{color:"#0f1a0f",fontSize:10,letterSpacing:2,textAlign:"center",marginTop:70}}>ASK ANYTHING — ENTRIES · EXITS · STRATEGY · MARKET</div>
              ):chatHistory.map((m,i)=>(
                <div key={i} style={{marginBottom:14}}>
                  <div style={{fontSize:9,color:m.role==="user"?"#00ff8845":"#4488ff45",letterSpacing:2,marginBottom:4}}>{m.role==="user"?"YOU":"QUANT"}</div>
                  <div style={{color:m.role==="user"?"#bbb":"#888",fontSize:12,lineHeight:1.6}}>{typeof m.content==="string"?m.content:""}</div>
                </div>
              ))}
              {chatLoading&&<div style={{color:"#00ff8830",fontSize:10,letterSpacing:2}}>⟳ SEARCHING MARKET DATA...</div>}
            </div>
            <div style={{display:"flex",gap:8}}>
              <input placeholder="Entry on MU? Should I hold AMAT into earnings? What's SPY doing?" value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()} style={{...S.inp,flex:1}}/>
              <button onClick={sendChat} disabled={chatLoading} style={{...S.btn("#4488ff","linear-gradient(135deg,#060e24,#000e44)"),width:"auto",padding:"8px 16px"}}>▶</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
