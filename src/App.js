/* eslint-disable */
import React, { useState, useEffect } from "react";

const INITIAL_PORTFOLIO = [
  { symbol: "USO",  shares: 0.33995,  avgPrice: 132.37, value: 45.26 },
  { symbol: "NVDA", shares: 0.74883,  avgPrice: 200.31, value: 161.04 },
  { symbol: "MU",   shares: 0.6869,   avgPrice: 436.74, value: 520.22 },
  { symbol: "BITX", shares: 16.72725, avgPrice: 17.99,  value: 337.05 },
  { symbol: "SPY",  shares: 6.39058,  avgPrice: 656.05, value: 4714.59 },
];
const PEAK_VALUE = 5978;

const WOLF_PROMPT = function(sym) {
  return "You are Agent Wolf - a Warren Buffett-style analyst. You see FUNDAMENTALS ONLY. No charts, no news.\nSearch for "+sym+" P/E ratio, revenue growth, earnings history, profit margins, debt, free cash flow.\nBased ONLY on fundamentals, give your vote.\nRespond in pure JSON only:\n{\"direction\":\"BUY\",\"conviction\":0.8,\"entry\":750,\"target\":850,\"stop\":695,\"reasoning\":\"Strong earnings growth\",\"horizon_days\":5}";
};

const COHEN_PROMPT = function(sym, price) {
  return "You are Agent Cohen - a pure price action trader. You see PRICE DATA ONLY. You do NOT know what this company does.\nPrice data for "+sym+": "+price+"\nAnalyze ONLY price action: trend, support/resistance, volume, momentum.\nRespond in pure JSON only:\n{\"direction\":\"BUY\",\"conviction\":0.7,\"entry\":750,\"target\":800,\"stop\":720,\"reasoning\":\"Price above 50-day MA on rising volume\",\"horizon_days\":3}";
};

const DALIO_PROMPT = function(sym, price) {
  return "You are Agent Dalio - a macro-first analyst. You see price data AND macro context.\nSymbol: "+sym+". Price: "+price+"\nSearch for macro environment: Fed policy, inflation, sector rotation, risk sentiment.\nRespond in pure JSON only:\n{\"direction\":\"BUY\",\"conviction\":0.75,\"entry\":750,\"target\":820,\"stop\":710,\"reasoning\":\"Rate pause favors tech\",\"horizon_days\":4}";
};

const BRIEFING_PROMPT = function() {
  var today = new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
  return "You are the Head Quant at an asymmetric AI hedge fund managing Aidan's aggressive retail portfolio.\nToday: "+today+".\n\nAIDAN: Aggressive risk tolerance. Weekly active management. Short-term trades 1-5 days. Goal: beat the market every week.\n\n8-FACTOR QUALITY GATE - mentally score every stock before recommending it:\n1. MOMENTUM - outperforming SPY last 4 weeks?\n2. VALUE - PEG under 2, not wildly overvalued?\n3. QUALITY - profitable, positive FCF, manageable debt?\n4. GROWTH - revenue/earnings accelerating?\n5. REVISION - analysts raising estimates?\n6. SHORT INTEREST - squeeze potential?\n7. INSIDER ACTIVITY - Form 4 insider buying recently?\n8. INSTITUTIONAL FLOW - smart money accumulating?\nOnly recommend stocks scoring 3+ factors. State the score (e.g. 6/8 factors).\n\n6-STRATEGY FRAMEWORK:\n1. MOMENTUM+CATALYST - trending + event within 7 days\n2. MEAN REVERSION DIP - strong stock pulled back 5-15% to support\n3. FACTOR QUALITY - fundamentally strong, institutions buying\n4. EVENT-DRIVEN - CPI, Fed, earnings, FDA dates\n5. SENTIMENT+OPTIONS - unusual call volume, analyst upgrades\n6. RELATIVE STRENGTH - outperforming SPY last 1-4 weeks\n\nCIRCUIT BREAKER RULES:\n- Portfolio down 2.5% today - recommend cash preservation only\n- Any position down 8% from avg - immediate stop loss flag\n- Two positions highly correlated - flag correlation risk\n\nDAILY BRIEFING FORMAT (use exactly):\n\n📊 MARKET OUTLOOK\nDirection: UP or DOWN bias this week\nKey Level: S&P support/resistance to watch\nMacro Driver: The one thing driving everything right now\n\n💼 PORTFOLIO REVIEW\nEach holding: [UP/DOWN] HOLD/ADD/TRIM - one sentence why\nFlag positions near stops or targets\n\n🎯 COMMITTEE TRADE PLANS (3-5 ideas, quality gate pre-screened)\nFor EACH trade idea use EXACTLY this format, one field per line:\n[STARS] SYMBOL | LONG (GOING UP) or SHORT (GOING DOWN)\nQuality Gate: X/8 factors pass\nStrategy: which strategy\nInsider Signal: BUYING or SELLING or NEUTRAL\nEntry: price range (enter on which day)\nTarget: price (+X% gain, expected by which day)\nStop Loss: price (-X% loss, exit by which day if target not hit)\nTime Window: X-X days\nWhy: 2-3 sentences - specific catalyst, price setup, why NOW\nPosition Size: dollar amount\nRisk: one sentence on downside scenario\n\n📅 EVENTS THIS WEEK\nDate | Event | UP/DOWN impact on portfolio\n\n⚠️ RISK + CORRELATION WARNING\nBiggest threat today. Any correlated position pairs to watch.\n\nRULES: Web search first. Real prices only. Specific dollar amounts always. Max 2 tech picks. State position sizes.\n\nSTOCK UNIVERSE: Scan the ENTIRE market for best opportunity. Primary: S&P 500 and Nasdaq. Also allowed: any US stock with strong catalyst AND 4+ quality gate factors, volume above 500K daily, price above 3 dollars. Find the single best risk/reward opportunity - mega-cap or lesser-known mid-cap. Diversify across sectors.";
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

  useEffect(function(){ loadData(); fetchLivePrices(); var iv=setInterval(fetchLivePrices,60000); return function(){ clearInterval(iv); }; }, []);
  useEffect(function(){ if(Object.keys(livePrices).length>0) runRiskEngine(); }, [livePrices]);

  function runRiskEngine() {
    var alerts = [];
    var totalVal = portfolio.reduce(function(s,p){ return s+p.value; },0)+cashBalance;
    var dayChange = portfolio.reduce(function(s,p){ var l=livePrices[p.symbol]; return s+(l?(l.change/100)*p.value:0); },0);
    var dayPct = totalVal>0?(dayChange/totalVal)*100:0;
    var drawdown = ((totalVal-PEAK_VALUE)/PEAK_VALUE)*100;
    if(dayPct<=-2.5) alerts.push({msg:"CIRCUIT BREAKER: Down "+dayPct.toFixed(2)+"% today - preserve cash, no new trades",color:"#ff2222"});
    if(drawdown<=-8)  alerts.push({msg:"DRAWDOWN ALERT: "+drawdown.toFixed(2)+"% from peak - risk management active",color:"#ff4444"});
    portfolio.forEach(function(p){
      var l=livePrices[p.symbol]; if(!l) return;
      var pct=((l.price-p.avgPrice)/p.avgPrice)*100;
      if(pct<=-8) alerts.push({msg:"STOP ZONE - "+p.symbol+": Down "+pct.toFixed(1)+"% from avg - consider cutting",color:"#ff6644"});
      if(pct>=15)  alerts.push({msg:"TARGET ZONE - "+p.symbol+": Up "+pct.toFixed(1)+"% - consider trimming",color:"#00ccff"});
    });
    var techVal = portfolio.filter(function(p){ return ["NVDA","MU","AMAT","AMD","AAPL","MSFT","SMH"].indexOf(p.symbol)>=0; }).reduce(function(s,p){ return s+p.value; },0);
    var invested = portfolio.reduce(function(s,p){ return s+p.value; },0);
    if(invested>0&&(techVal/invested)>0.60) alerts.push({msg:"CORRELATION RISK: "+((techVal/invested)*100).toFixed(0)+"% in tech - highly correlated",color:"#ffcc00"});
    setRiskAlerts(alerts);
  }

  async function fetchLivePrices() {
    var syms=[...new Set([...portfolio.map(function(p){ return p.symbol; }),"SPY","QQQ","NVDA","MU","AMAT","AMD","AAPL","MSFT","META","SMH","GLD","TLT","XLE"])];
    var res={};
    await Promise.all(syms.map(async function(sym){
      try{
        var r=await fetch("https://query2.finance.yahoo.com/v8/finance/chart/"+sym+"?interval=1d&range=2d&corsDomain=finance.yahoo.com",{headers:{"User-Agent":"Mozilla/5.0"}});
        var d=await r.json(); var m=d&&d.chart&&d.chart.result&&d.chart.result[0]&&d.chart.result[0].meta;
        if(m){var c=m.regularMarketPrice,p=m.chartPreviousClose||m.previousClose; res[sym]={price:c,change:p?((c-p)/p)*100:0,high:m.regularMarketDayHigh,low:m.regularMarketDayLow,volume:m.regularMarketVolume,prev:p};}
      }catch(e){}
    }));
    if(Object.keys(res).length>0){
      setLivePrices(res); setLastUpdated(new Date().toLocaleTimeString());
      setPortfolio(function(prev){ return prev.map(function(p){ var l=res[p.symbol]; return l?Object.assign({},p,{value:l.price*p.shares,livePrice:l.price}):p; }); });
    }
  }

  function loadData(){
    try{
      var p=localStorage.getItem("pf3"); if(p) setPortfolio(JSON.parse(p));
      var t=localStorage.getItem("tr3"); if(t) setTrades(JSON.parse(t));
      var c=localStorage.getItem("ca3"); if(c) setCashBalance(parseFloat(c));
      var ch=localStorage.getItem("ch3"); if(ch) setChatHistory(JSON.parse(ch));
      var fs=localStorage.getItem("fs3"); if(fs) setFactorScores(JSON.parse(fs));
    }catch(e){}
  }

  function save(np,nt,nc,nch){
    try{
      if(np!==null) localStorage.setItem("pf3",JSON.stringify(np!=null?np:portfolio));
      if(nt!==null) localStorage.setItem("tr3",JSON.stringify(nt!=null?nt:trades));
      if(nc!==null) localStorage.setItem("ca3",String(nc!=null?nc:cashBalance));
      if(nch!==null) localStorage.setItem("ch3",JSON.stringify(nch!=null?nch:chatHistory));
    }catch(e){}
  }

  async function callClaude(system, messages, search){
    if(search===undefined) search=true;
    var key = process.env.REACT_APP_ANTHROPIC_API_KEY;
    var body={model:"claude-opus-4-5",max_tokens:2000,system:system,messages:messages};
    if(search) body.tools=[{type:"web_search_20250305",name:"web_search"}];
    var r=await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "x-api-key": key,
        "anthropic-version":"2023-06-01",
        "anthropic-dangerous-direct-browser-access":"true"
      },
      body:JSON.stringify(body)
    });
    var d=await r.json();
    if(d.error) throw new Error(d.error.message||"API error");
    return d.content.filter(function(b){ return b.type==="text"; }).map(function(b){ return b.text; }).join("\n");
  }

  async function getDailyBriefing(){
    setLoading(true); setBriefing("");
    try{
      var portStr=portfolio.map(function(p){
        var l=livePrices[p.symbol];
        var pct=l?(((l.price-p.avgPrice)/p.avgPrice)*100).toFixed(1):"?";
        var lp=l&&l.price?l.price.toFixed(2):"?";
        return p.symbol+": "+p.shares.toFixed(4)+"sh @ $"+p.avgPrice.toFixed(2)+" avg | Live:$"+lp+" | P&L:"+pct+"%";
      }).join("\n");
      var liveStr=Object.entries(livePrices).map(function(e){
        var s=e[0],d=e[1];
        return s+":$"+(d.price?d.price.toFixed(2):"?")+"("+(d.change>=0?"+":"")+(d.change?d.change.toFixed(2):"0")+"%)";
      }).join(", ");
      var riskStr=riskAlerts.length?riskAlerts.map(function(a){ return a.msg; }).join("; "):"No active alerts";
      var trHist=trades.slice(-5).map(function(t){ return t.date+" "+t.action+" "+t.symbol+" @$"+t.price; }).join("; ");
      var txt=await callClaude(BRIEFING_PROMPT(),[{role:"user",content:"Daily check-in "+new Date().toLocaleDateString()+".\nLIVE PRICES: "+liveStr+"\nPORTFOLIO:\n"+portStr+"\nCASH: $"+cashBalance.toFixed(2)+"\nRISK ALERTS: "+riskStr+"\nRECENT TRADES: "+(trHist||"none")+"\nSearch market news first. Run quality gate. Deliver full briefing with trade plans."}]);
      setBriefing(txt);
    }catch(e){ setBriefing("Error - check connection and try again."); }
    setLoading(false);
  }

  async function runCommittee(symbol){
    if(!symbol) return;
    setAgentLoading(true);
    var live=livePrices[symbol]||{};
    var priceStr="Price:$"+(live.price?live.price.toFixed(2):"?")+", Today:"+(live.change?live.change.toFixed(2):"0")+"%, High:$"+(live.high?live.high.toFixed(2):"?")+", Low:$"+(live.low?live.low.toFixed(2):"?")+", Volume:"+(live.volume||0).toLocaleString();
    var votes={};
    try{
      var results=await Promise.all([
        callClaude(WOLF_PROMPT(symbol),[{role:"user",content:"Search and analyze "+symbol+" fundamentals only. Provide JSON vote."}]),
        callClaude(COHEN_PROMPT(symbol,priceStr),[{role:"user",content:"Analyze price data only for "+symbol+": "+priceStr+". Provide JSON vote."}],false),
        callClaude(DALIO_PROMPT(symbol,priceStr),[{role:"user",content:"Search macro context then analyze "+symbol+". Provide JSON vote."}]),
      ]);
      var names=["Wolf (Fundamentals)","Cohen (Price Action)","Dalio (Macro)"];
      for(var i=0;i<3;i++){
        try{
          var txt=results[i];
          var clean=txt.split("\u0060\u0060\u0060json").join("").split("\u0060\u0060\u0060").join("").trim();
          var s=clean.indexOf("{"),e=clean.lastIndexOf("}");
          votes[names[i]]=JSON.parse(clean.substring(s,e+1));
        }catch(err){ votes[names[i]]={direction:"HOLD",conviction:0.5,reasoning:results[i].slice(0,150)}; }
      }
      var dirs=Object.values(votes).map(function(v){ return v.direction; });
      var buys=dirs.filter(function(d){ return d==="BUY"; }).length;
      var sells=dirs.filter(function(d){ return d==="SELL"; }).length;
      var consensus=buys>=2?"BUY":sells>=2?"SELL":"HOLD";
      var avgConv=Object.values(votes).reduce(function(s,v){ return s+(v.conviction||0.5); },0)/3;
      var stars=avgConv>0.75?"High Conviction":avgConv>0.5?"Medium Conviction":"Speculative";
      var entries=Object.values(votes).filter(function(v){ return v.entry; }).map(function(v){ return v.entry; });
      var targets=Object.values(votes).filter(function(v){ return v.target; }).map(function(v){ return v.target; });
      var stops=Object.values(votes).filter(function(v){ return v.stop; }).map(function(v){ return v.stop; });
      votes["_c"]={symbol:symbol,consensus:consensus,buys:buys,sells:sells,holds:3-buys-sells,avgConv:avgConv.toFixed(2),stars:stars,
        entry:entries.length?"$"+Math.min.apply(null,entries).toFixed(2)+"-$"+Math.max.apply(null,entries).toFixed(2):null,
        target:targets.length?"$"+(targets.reduce(function(a,b){ return a+b; },0)/targets.length).toFixed(2):null,
        stop:stops.length?"$"+Math.min.apply(null,stops).toFixed(2):null};
      setAgentVotes(function(prev){ return Object.assign({},prev,{[symbol]:votes}); });
    }catch(e){ console.error(e); }
    setAgentLoading(false);
  }

  async function runQualityGate(symbol){
    if(!symbol) return;
    setScanLoading(true);
    try{
      var live=livePrices[symbol]||{};
      var sysPrompt="You are the 8-Factor Quality Gate. Score "+symbol+" on each factor 0.0-1.0. Search for current data.\nReturn ONLY this JSON:\n{\"symbol\":\""+symbol+"\",\"factors\":{\"momentum\":0.0,\"value\":0.0,\"quality\":0.0,\"growth\":0.0,\"revision\":0.0,\"short_interest\":0.0,\"insider\":0.0,\"institutional\":0.0},\"composite\":0.0,\"passes_gate\":true,\"insider_signal\":\"NEUTRAL\",\"summary\":\"one sentence\"}";
      var userMsg="Score "+symbol+". Current price: $"+(live.price?live.price.toFixed(2):"unknown")+". Search for fundamentals, insider filings, analyst data.";
      var txt=await callClaude(sysPrompt,[{role:"user",content:userMsg}]);
      try{
        var clean=txt.split("\u0060\u0060\u0060json").join("").split("\u0060\u0060\u0060").join("").trim();
        var s=clean.indexOf("{"),e=clean.lastIndexOf("}");
        var parsed=Object.assign({},JSON.parse(clean.substring(s,e+1)),{scoredAt:new Date().toLocaleTimeString()});
        var newFS=Object.assign({},factorScores,{[symbol]:parsed});
        setFactorScores(newFS);
        localStorage.setItem("fs3",JSON.stringify(newFS));
      }catch(err){ setFactorScores(function(prev){ return Object.assign({},prev,{[symbol]:{error:true,raw:txt.slice(0,200)}}); }); }
    }catch(e){}
    setScanLoading(false);
  }

  function logTrade(){
    if(!tradeForm.symbol||!tradeForm.shares||!tradeForm.price) return;
    var trade=Object.assign({},tradeForm,{date:new Date().toLocaleDateString(),shares:parseFloat(tradeForm.shares),price:parseFloat(tradeForm.price),total:parseFloat(tradeForm.shares)*parseFloat(tradeForm.price)});
    var newTrades=[trade,...trades];
    var newPF=[...portfolio],newCash=cashBalance;
    if(trade.action==="BUY"){
      newCash-=trade.total;
      var ex=newPF.find(function(p){ return p.symbol===trade.symbol.toUpperCase(); });
      if(ex){ var ts=ex.shares+trade.shares; ex.avgPrice=((ex.shares*ex.avgPrice)+(trade.shares*trade.price))/ts; ex.shares=ts; ex.value=ex.shares*trade.price; }
      else newPF.push({symbol:trade.symbol.toUpperCase(),shares:trade.shares,avgPrice:trade.price,value:trade.total});
    }else{
      newCash+=trade.total;
      newPF=newPF.map(function(p){
        if(p.symbol!==trade.symbol.toUpperCase()) return p;
        var rem=p.shares-trade.shares;
        return rem<=0.001?null:Object.assign({},p,{shares:rem,value:rem*trade.price});
      }).filter(Boolean);
    }
    setTrades(newTrades); setPortfolio(newPF); setCashBalance(newCash);
    setTradeForm({symbol:"",action:"BUY",shares:"",price:"",note:""});
    save(newPF,newTrades,newCash,null);
  }

  async function sendChat(){
    if(!chatInput.trim()) return;
    setChatLoading(true);
    var uMsg={role:"user",content:chatInput};
    var newH=[...chatHistory,uMsg]; setChatHistory(newH); setChatInput("");
    try{
      var portStr=portfolio.map(function(p){ return p.symbol+":$"+(livePrices[p.symbol]&&livePrices[p.symbol].price?livePrices[p.symbol].price.toFixed(2):"?"); }).join(", ");
      var txt=await callClaude(BRIEFING_PROMPT()+"\nPortfolio:"+portStr+". Cash:$"+cashBalance.toFixed(2)+". Use quality gate + 6-strategy framework.",newH.slice(-10));
      var aMsg={role:"assistant",content:txt};
      var fH=[...newH,aMsg]; setChatHistory(fH); save(null,null,null,fH);
    }catch(e){ setChatHistory([...newH,{role:"assistant",content:"Error. Please retry."}]); }
    setChatLoading(false);
  }

  var totalInvested = portfolio.reduce(function(s,p){ return s+(p.shares*p.avgPrice); },0);
  var totalValue    = portfolio.reduce(function(s,p){ return s+p.value; },0)+cashBalance;
  var totalPnL      = portfolio.reduce(function(s,p){ return s+(p.value-p.shares*p.avgPrice); },0);
  var drawdown      = ((totalValue-PEAK_VALUE)/PEAK_VALUE)*100;
  var dayChange     = portfolio.reduce(function(s,p){ return s+(livePrices[p.symbol]?(livePrices[p.symbol].change/100)*p.value:0); },0);

  function fmt(text){
    var lines = text.split("\n");
    var output = [];
    var i = 0;
    var inTrade = false;
    var tradeHeader = "";
    var tradeLines = [];

    function flushTrade(key) {
      if(!tradeHeader) return;
      var f = {};
      tradeLines.forEach(function(l) {
        if(/^(Ticker:|Symbol:)/i.test(l)) f.ticker = l.replace(/^(Ticker:|Symbol:)/i,"").trim();
        if(/^Quality Gate:/i.test(l)) f.gate = l.replace(/^Quality Gate:/i,"").trim();
        if(/^Strategy:/i.test(l)) f.strategy = l.replace(/^Strategy:/i,"").trim();
        if(/^Entry:/i.test(l)) f.entry = l.replace(/^Entry:/i,"").trim();
        if(/^Target:/i.test(l)) f.target = l.replace(/^Target:/i,"").trim();
        if(/^(Stop Loss:|Stop:)/i.test(l)) f.stop = l.replace(/^(Stop Loss:|Stop:)/i,"").trim();
        if(/^Time Window:/i.test(l)) f.time = l.replace(/^Time Window:/i,"").trim();
        if(/^Why:/i.test(l)) f.why = l.replace(/^Why:/i,"").trim();
        if(/^Position Size:/i.test(l)) f.size = l.replace(/^Position Size:/i,"").trim();
        if(/^Risk:/i.test(l)) f.risk = l.replace(/^Risk:/i,"").trim();
        if(/^Insider Signal:/i.test(l)) f.insider = l.replace(/^Insider Signal:/i,"").trim();
      });
      var isHigh = tradeHeader.includes("HIGH") || (tradeHeader.match(/\*{3}/) !== null) || tradeHeader.includes("HIGH CONVICTION");
      var isMed  = tradeHeader.includes("MED") || tradeHeader.includes("MEDIUM");
      var bc = isHigh ? "#00ff88" : isMed ? "#ffcc00" : "#ff8844";
      var bg = isHigh ? "#001a0d" : isMed ? "#1a1400" : "#1a0800";
      var isLong = tradeHeader.includes("LONG") || tradeHeader.includes("UP");
      output.push(
        React.createElement("div", {key:key, style:{border:"2px solid "+bc,borderRadius:8,marginBottom:18,overflow:"hidden",boxShadow:"0 0 24px "+bc+"40"}},
          React.createElement("div", {style:{background:bc,padding:"9px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}},
            React.createElement("span", {style:{color:"#000",fontWeight:"bold",fontSize:13}}, tradeHeader),
            React.createElement("span", {style:{color:"#000",fontWeight:"bold",fontSize:12}}, isLong ? "LONG - GOING UP" : "SHORT - GOING DOWN")
          ),
          React.createElement("div", {style:{background:bg,padding:"14px"}},
            React.createElement("div", {style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}},
              f.gate && React.createElement("div", {style:{background:"#ffffff10",borderRadius:5,padding:"7px 10px"}},
                React.createElement("div", {style:{color:"#9988bb",fontSize:9,letterSpacing:2,marginBottom:2}}, "QUALITY GATE"),
                React.createElement("div", {style:{color:"#cc99ff",fontSize:13,fontWeight:"bold"}}, f.gate)
              ),
              f.strategy && React.createElement("div", {style:{background:"#ffffff10",borderRadius:5,padding:"7px 10px"}},
                React.createElement("div", {style:{color:"#8899aa",fontSize:9,letterSpacing:2,marginBottom:2}}, "STRATEGY"),
                React.createElement("div", {style:{color:"#88aaff",fontSize:12}}, f.strategy)
              ),
              f.insider && React.createElement("div", {style:{background:"#ffffff10",borderRadius:5,padding:"7px 10px"}},
                React.createElement("div", {style:{color:"#aa9988",fontSize:9,letterSpacing:2,marginBottom:2}}, "INSIDER SIGNAL"),
                React.createElement("div", {style:{color:"#ffbb55",fontSize:12}}, f.insider)
              ),
              f.time && React.createElement("div", {style:{background:"#ffffff10",borderRadius:5,padding:"7px 10px"}},
                React.createElement("div", {style:{color:"#aaaa88",fontSize:9,letterSpacing:2,marginBottom:2}}, "TIME WINDOW"),
                React.createElement("div", {style:{color:"#ffee88",fontSize:12}}, f.time)
              )
            ),
            React.createElement("div", {style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}},
              React.createElement("div", {style:{background:"#003322",border:"2px solid #00ff8850",borderRadius:6,padding:"10px",textAlign:"center"}},
                React.createElement("div", {style:{color:"#00ff8899",fontSize:9,letterSpacing:2,marginBottom:4}}, "ENTRY"),
                React.createElement("div", {style:{fontSize:18}}, "🟢"),
                React.createElement("div", {style:{color:"#00ff88",fontSize:12,marginTop:4,fontWeight:"bold"}}, f.entry||"-")
              ),
              React.createElement("div", {style:{background:"#001a33",border:"2px solid #00ccff50",borderRadius:6,padding:"10px",textAlign:"center"}},
                React.createElement("div", {style:{color:"#00ccff99",fontSize:9,letterSpacing:2,marginBottom:4}}, "TARGET"),
                React.createElement("div", {style:{fontSize:18}}, "🎯"),
                React.createElement("div", {style:{color:"#00ccff",fontSize:12,marginTop:4,fontWeight:"bold"}}, f.target||"-")
              ),
              React.createElement("div", {style:{background:"#330000",border:"2px solid #ff444450",borderRadius:6,padding:"10px",textAlign:"center"}},
                React.createElement("div", {style:{color:"#ff444499",fontSize:9,letterSpacing:2,marginBottom:4}}, "STOP LOSS"),
                React.createElement("div", {style:{fontSize:18}}, "🛑"),
                React.createElement("div", {style:{color:"#ff6666",fontSize:12,marginTop:4,fontWeight:"bold"}}, f.stop||"-")
              )
            ),
            f.size && React.createElement("div", {style:{background:"#ffffff0a",borderRadius:5,padding:"7px 12px",marginBottom:10,display:"flex",alignItems:"center",gap:8}},
              React.createElement("span", {style:{color:"#888888",fontSize:9,letterSpacing:2}}, "POSITION SIZE:"),
              React.createElement("span", {style:{color:"#ffffff",fontSize:14,fontWeight:"bold"}}, f.size)
            ),
            f.why && React.createElement("div", {style:{background:"#ffffff06",borderRadius:5,padding:"10px 12px",marginBottom:10,borderLeft:"3px solid #ffffff25"}},
              React.createElement("div", {style:{color:"#999999",fontSize:9,letterSpacing:2,marginBottom:5}}, "WHY THIS TRADE"),
              React.createElement("div", {style:{color:"#dddddd",fontSize:13,lineHeight:1.7}}, f.why)
            ),
            f.risk && React.createElement("div", {style:{background:"#ff000008",borderRadius:5,padding:"7px 12px",borderLeft:"3px solid #ff444450"}},
              React.createElement("span", {style:{color:"#ff7755",fontSize:9,letterSpacing:2}}, "RISK: "),
              React.createElement("span", {style:{color:"#ffaa88",fontSize:12}}, f.risk)
            )
          )
        )
      );
      tradeLines = []; tradeHeader = ""; inTrade = false;
    }

    while(i < lines.length){
      var line = lines[i];
      var isTradeStart = line.includes("LONG") || line.includes("SHORT") || line.includes("HIGH CONVICTION") || line.includes("MEDIUM CONVICTION") || line.includes("SPECULATIVE");
      isTradeStart = isTradeStart && line.length < 150 && (i+1 < lines.length && /Quality Gate:|Strategy:|Entry:|Ticker:/i.test(lines[i+1]||""));
      if(isTradeStart || (line.match(/^\[.*\]/) && line.includes("|"))){
        if(inTrade) flushTrade("t"+i);
        inTrade = true; tradeHeader = line; i++; continue;
      }
      if(inTrade){
        var nextIsSection = /^[📊💼🎯⚠️📅]/.test(lines[i]||"");
        if(nextIsSection){ flushTrade("t"+i); }
        else { tradeLines.push(line); i++; continue; }
      }
      if(/^[📊💼🎯⚠️📅]/.test(line)||/^#+\s*[📊💼🎯⚠️📅]/.test(line)){
        output.push(React.createElement("div",{key:i,style:{color:"#00ff88",fontWeight:"bold",marginTop:26,marginBottom:10,fontSize:15,borderBottom:"2px solid #00ff8835",paddingBottom:7}},line.replace(/^#+\s*/,"")));
      } else if(line.toLowerCase().includes("circuit breaker")||line.includes("CIRCUIT")){
        output.push(React.createElement("div",{key:i,style:{color:"#ff3333",fontWeight:"bold",fontSize:13,margin:"6px 0",background:"#ff000015",padding:"7px 12px",borderRadius:5,border:"1px solid #ff333330"}},line));
      } else if(line.startsWith("|")&&!line.includes("---")){
        var cells=line.split("|").filter(function(c){ return c.trim(); });
        var isHdr=i+1<lines.length&&(lines[i+1]||"").includes("---");
        output.push(React.createElement("div",{key:i,style:{display:"grid",gridTemplateColumns:"repeat("+cells.length+",1fr)",gap:3,marginBottom:3}},
          cells.map(function(c,j){ return React.createElement("div",{key:j,style:{padding:"5px 8px",background:isHdr?"#1a2a1a":"#0c1018",border:"1px solid #1a2a1a",borderRadius:3,color:isHdr?"#00ff88":"#cccccc",fontSize:11,fontWeight:isHdr?"bold":"normal",textAlign:"center"}},c.trim()); })
        ));
      } else if(line.startsWith("-")||line.startsWith("*")){
        output.push(React.createElement("div",{key:i,style:{color:"#cccccc",paddingLeft:16,marginBottom:5,fontSize:13}},"→ "+line.slice(1).trim()));
      } else if(line.trim()===""){
        output.push(React.createElement("div",{key:i,style:{height:8}}));
      } else {
        output.push(React.createElement("div",{key:i,style:{color:"#cccccc",fontSize:13,marginBottom:4,lineHeight:1.65}},line));
      }
      i++;
    }
    if(inTrade) flushTrade("last");
    return output;
  }

  var TABS=["briefing","committee","risk","portfolio","trades","chat"];

  return (
    <div style={S.app}>
      <div style={S.hdr}>
        <div>
          <div style={{fontSize:9,color:"#00ff88",letterSpacing:3}}>ASYMMETRIC AI FUND</div>
          <div style={{fontSize:18,fontWeight:"bold",color:"#fff"}}>Aidan's War Room</div>
          <div style={{fontSize:10,color:"#778877",marginTop:2}}>
            Today: <span style={{color:dayChange>=0?"#00ff88":"#ff4444"}}>{dayChange>=0?"+":""}{dayChange.toFixed(2)}</span>
            {" · "}Drawdown: <span style={{color:drawdown>=-4?"#00ff88":drawdown>=-8?"#ffcc00":"#ff4444"}}>{drawdown.toFixed(1)}%</span>
          </div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:9,color:"#444",letterSpacing:2}}>TOTAL VALUE</div>
          <div style={{fontSize:20,fontWeight:"bold",color:"#00ff88"}}>{"$"}{totalValue.toFixed(2)}</div>
          <div style={{fontSize:11,color:totalPnL>=0?"#00ff88":"#ff4444"}}>{totalPnL>=0?"+":""}{totalPnL.toFixed(2)} P&L</div>
        </div>
      </div>

      {riskAlerts.map(function(a,i){
        return React.createElement("div",{key:i,style:{background:"#180808",borderBottom:"1px solid "+a.color+"60",padding:"7px 16px",fontSize:12,color:a.color,fontWeight:"bold"}},a.msg);
      })}

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
              {loading?"⟳ Quality Gate · Agent Analysis · Trade Plans...":"▶ GET FULL DAILY BRIEFING"}
            </button>
            <div style={{height:12}}/>
            {briefing?(
              <div style={{background:"#070a12",border:"1px solid #1a2a1a",borderRadius:6,padding:16,lineHeight:1.65}}>{fmt(briefing)}</div>
            ):(
              <div style={{textAlign:"center",padding:50,color:"#446644",border:"1px dashed #2a4a2a",borderRadius:4}}>
                <div style={{fontSize:28,marginBottom:8}}>📈</div>
                <div style={{fontSize:10,letterSpacing:2}}>HIT BRIEFING TO START YOUR DAY</div>
              </div>
            )}
          </div>
        )}

        {activeTab==="committee"&&(
          <div>
            <div style={S.lbl}>3-AGENT COMMITTEE — INFORMATION ASYMMETRY</div>
            <div style={{fontSize:11,color:"#889988",marginBottom:12,lineHeight:1.6}}>Wolf sees fundamentals only. Cohen sees price only. Dalio sees macro. They vote independently.</div>
            <div style={S.card}>
              <div style={S.lbl}>SCAN SYMBOL</div>
              <div style={{display:"flex",gap:6,marginBottom:8}}>
                <input placeholder="e.g. NVDA, AMAT, AMD" value={scanSymbol} onChange={function(e){ setScanSymbol(e.target.value.toUpperCase()); }} onKeyDown={function(e){ if(e.key==="Enter") runQualityGate(scanSymbol); }} style={Object.assign({},S.inp,{flex:1})}/>
                <button onClick={function(){ runQualityGate(scanSymbol); }} disabled={scanLoading||!scanSymbol} style={Object.assign({},S.btn("#aa88ff","linear-gradient(135deg,#18082a,#300050)"),{width:"auto",padding:"8px 12px",fontSize:10})}>
                  {scanLoading?"⟳":"GATE"}
                </button>
                <button onClick={function(){ runCommittee(scanSymbol); }} disabled={agentLoading||!scanSymbol} style={Object.assign({},S.btn("#4488ff","linear-gradient(135deg,#080f28,#001055)"),{width:"auto",padding:"8px 12px",fontSize:10})}>
                  {agentLoading?"⟳":"VOTE"}
                </button>
              </div>
              {factorScores[scanSymbol]&&(function(){
                var sc=factorScores[scanSymbol];
                if(sc.error) return React.createElement("div",{style:{color:"#ff6644",fontSize:11}},"Parse error - try again");
                return React.createElement("div",null,
                  React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:8}},
                    React.createElement("span",{style:{color:"#aa88ff",fontSize:12,fontWeight:"bold"}},sc.symbol+" - Quality Gate"),
                    React.createElement("span",{style:{color:sc.passes_gate?"#00ff88":"#ff4444",fontSize:12,fontWeight:"bold"}},(sc.passes_gate?"PASSES":"BLOCKED")+" · "+sc.composite.toFixed(2))
                  ),
                  sc.factors&&React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,marginBottom:8}},
                    Object.entries(sc.factors).map(function(e){
                      var f=e[0],v=e[1];
                      return React.createElement("div",{key:f,style:{display:"flex",justifyContent:"space-between",padding:"3px 8px",background:"#04060e",borderRadius:2}},
                        React.createElement("span",{style:{color:"#aaaaaa",fontSize:10,textTransform:"uppercase"}},f.replace("_"," ")),
                        React.createElement("div",{style:{display:"flex",alignItems:"center",gap:5}},
                          React.createElement("div",{style:{width:36,height:3,background:"#0a0a0a",borderRadius:2}},
                            React.createElement("div",{style:{width:((v||0)*100)+"%",height:"100%",background:v>0.6?"#00ff88":v>0.35?"#ffcc00":"#ff4444",borderRadius:2}})
                          ),
                          React.createElement("span",{style:{color:v>0.6?"#00ff88":v>0.35?"#ffcc00":"#ff6644",fontSize:10}},(v||0).toFixed(2))
                        )
                      );
                    })
                  ),
                  sc.insider_signal&&React.createElement("div",{style:{color:"#ffaa00",fontSize:11,marginBottom:4}},"Insider: "+sc.insider_signal),
                  sc.summary&&React.createElement("div",{style:{color:"#aaaaaa",fontSize:11}},sc.summary)
                );
              })()}
            </div>
            {agentVotes[scanSymbol]&&(function(){
              var votes=agentVotes[scanSymbol];
              var C=votes["_c"];
              var consColor=C&&C.consensus==="BUY"?"#00ff88":C&&C.consensus==="SELL"?"#ff4444":"#ffcc00";
              return React.createElement("div",null,
                React.createElement("div",{style:Object.assign({},S.card,{borderColor:consColor+"40"})},
                  React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:8}},
                    React.createElement("span",{style:{color:"#fff",fontWeight:"bold",fontSize:13}},"COMMITTEE VERDICT"),
                    React.createElement("span",{style:{color:consColor,fontWeight:"bold",fontSize:15}},C&&C.stars+" "+C&&C.consensus)
                  ),
                  React.createElement("div",{style:{display:"flex",gap:16,marginBottom:10}},
                    React.createElement("span",{style:{color:"#00ff88",fontSize:13,fontWeight:"bold"}},"Buy: "+(C&&C.buys)+"/3"),
                    React.createElement("span",{style:{color:"#ff6666",fontSize:13,fontWeight:"bold"}},"Sell: "+(C&&C.sells)+"/3"),
                    React.createElement("span",{style:{color:"#aaaaaa",fontSize:12}},"Conviction: "+(C&&C.avgConv))
                  ),
                  C&&C.entry&&React.createElement("div",{style:{color:"#00ff88",fontSize:12,marginBottom:3}},"Entry: "+C.entry),
                  C&&C.target&&React.createElement("div",{style:{color:"#00ccff",fontSize:12,marginBottom:3}},"Target: "+C.target),
                  C&&C.stop&&React.createElement("div",{style:{color:"#ff4444",fontSize:12,marginBottom:12}},"Stop: "+C.stop),
                  React.createElement("div",{style:{display:"flex",gap:8}},
                    React.createElement("button",{style:Object.assign({},S.btn("#00ff88"),{flex:1,padding:"10px"}),onClick:function(){ setActiveTab("portfolio"); setScanSymbol(""); }},"APPROVE - LOG TRADE"),
                    React.createElement("button",{style:Object.assign({},S.btn("#ff4444","linear-gradient(135deg,#1a0606,#2a0000)"),{flex:1,padding:"10px"}),onClick:function(){ setAgentVotes(function(p){ var n=Object.assign({},p); delete n[scanSymbol]; return n; }); }},"REJECT")
                  )
                ),
                Object.entries(votes).filter(function(e){ return e[0]!=="_c"; }).map(function(e){
                  var agent=e[0],vote=e[1];
                  return React.createElement("div",{key:agent,style:Object.assign({},S.card,{borderLeft:"3px solid "+(vote.direction==="BUY"?"#00ff88":vote.direction==="SELL"?"#ff4444":"#ffcc00")})},
                    React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:4}},
                      React.createElement("span",{style:{color:"#cccccc",fontSize:11,fontWeight:"bold"}},agent),
                      React.createElement("span",{style:{color:vote.direction==="BUY"?"#00ff88":vote.direction==="SELL"?"#ff4444":"#ffcc00",fontSize:12,fontWeight:"bold"}},vote.direction+" · "+((vote.conviction||0.5)*100).toFixed(0)+"%")
                    ),
                    React.createElement("div",{style:{color:"#bbbbbb",fontSize:11,lineHeight:1.5}},vote.reasoning)
                  );
                })
              );
            })()}
          </div>
        )}

        {activeTab==="risk"&&(
          <div>
            <div style={S.lbl}>INSTITUTIONAL RISK MANAGEMENT</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:12}}>
              {[
                ["Total Value","$"+totalValue.toFixed(2),"#00ff88"],
                ["Cash Buffer","$"+cashBalance.toFixed(2)+" ("+((cashBalance/totalValue)*100).toFixed(0)+"%)","#4488ff"],
                ["Open P&L",(totalPnL>=0?"+":"")+"$"+totalPnL.toFixed(2),totalPnL>=0?"#00ff88":"#ff4444"],
                ["Today",(dayChange>=0?"+":"")+"$"+dayChange.toFixed(2),dayChange>=0?"#00ff88":"#ff4444"],
                ["Drawdown",drawdown.toFixed(2)+"%",drawdown>=-4?"#00ff88":drawdown>=-8?"#ffcc00":"#ff4444"],
                ["CB Status",drawdown<=-8?"TRIGGERED":drawdown<=-4?"WARNING":"CLEAR",drawdown<=-8?"#ff4444":drawdown<=-4?"#ffcc00":"#00ff88"],
              ].map(function(item){
                return React.createElement("div",{key:item[0],style:{background:"#05070e",border:"1px solid #0a120a",borderRadius:4,padding:"8px 10px"}},
                  React.createElement("div",{style:{color:"#889988",fontSize:9,letterSpacing:1,marginBottom:3}},item[0]),
                  React.createElement("div",{style:{color:item[2],fontSize:13,fontWeight:"bold"}},item[1])
                );
              })}
            </div>
            <div style={S.card}>
              <div style={S.lbl}>CIRCUIT BREAKERS</div>
              {[
                {label:"Daily Loss Limit",limit:"2.5%",triggered:dayChange/totalValue*100<=-2.5},
                {label:"Max Drawdown",limit:"8% from peak",triggered:drawdown<=-8},
                {label:"Position Stop",limit:"8% per position",triggered:false},
              ].map(function(cb){
                return React.createElement("div",{key:cb.label,style:{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #08080a"}},
                  React.createElement("span",{style:{color:"#aaaaaa",fontSize:11}},cb.label),
                  React.createElement("span",{style:{color:"#889988",fontSize:11}},"Limit: "+cb.limit),
                  React.createElement("span",{style:{color:cb.triggered?"#ff4444":"#00ff88",fontSize:11,fontWeight:"bold"}},cb.triggered?"ACTIVE":"CLEAR")
                );
              })}
            </div>
            <div style={S.card}>
              <div style={S.lbl}>ACTIVE ALERTS ({riskAlerts.length})</div>
              {riskAlerts.length===0?
                React.createElement("div",{style:{color:"#00ff8866",fontSize:12,textAlign:"center",padding:20}},"All clear - no active risk alerts")
                :riskAlerts.map(function(a,idx){
                  return React.createElement("div",{key:idx,style:{padding:"7px 10px",background:"#05070e",borderRadius:3,marginBottom:6,borderLeft:"3px solid "+a.color}},
                    React.createElement("div",{style:{color:a.color,fontSize:11}},a.msg)
                  );
                })
              }
            </div>
            <div style={S.card}>
              <div style={S.lbl}>POSITION RISK MAP</div>
              {portfolio.map(function(p){
                var live=livePrices[p.symbol];
                var pnlPct=live?((live.price-p.avgPrice)/p.avgPrice)*100:0;
                var weight=(p.value/(totalValue-cashBalance))*100;
                var rc=pnlPct<=-8?"#ff4444":pnlPct<=-4?"#ff8844":pnlPct>=15?"#00ccff":"#00ff88";
                return React.createElement("div",{key:p.symbol,style:{marginBottom:8,padding:"8px 10px",background:"#04060e",borderRadius:3,borderLeft:"3px solid "+rc}},
                  React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:3}},
                    React.createElement("span",{style:{color:"#ddd",fontWeight:"bold",fontSize:12}},p.symbol),
                    React.createElement("span",{style:{color:rc,fontSize:12,fontWeight:"bold"}},(pnlPct>=0?"+":"")+pnlPct.toFixed(1)+"%")
                  ),
                  React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:4}},
                    React.createElement("span",{style:{color:"#aaaaaa",fontSize:10}},"Weight: "+weight.toFixed(1)+"%"),
                    React.createElement("span",{style:{color:"#aaaaaa",fontSize:10}},"$"+p.value.toFixed(2)),
                    React.createElement("span",{style:{color:"#ff444460",fontSize:10}},"Stop: $"+(p.avgPrice*0.92).toFixed(2))
                  ),
                  React.createElement("div",{style:{height:3,background:"#08080a",borderRadius:2}},
                    React.createElement("div",{style:{width:Math.min(weight,100)+"%",height:"100%",background:rc,borderRadius:2,opacity:0.7}})
                  )
                );
              })}
            </div>
          </div>
        )}

        {activeTab==="portfolio"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:12}}>
              {[["INVESTED","$"+totalInvested.toFixed(0),"#666"],["CASH","$"+cashBalance.toFixed(0),"#4488ff"],["TOTAL","$"+totalValue.toFixed(0),"#00ff88"]].map(function(item){
                return React.createElement("div",{key:item[0],style:{background:"#06080f",border:"1px solid #0a120a",borderRadius:4,padding:"8px",textAlign:"center"}},
                  React.createElement("div",{style:{color:"#889988",fontSize:9,letterSpacing:2,marginBottom:2}},item[0]),
                  React.createElement("div",{style:{color:item[2],fontSize:14,fontWeight:"bold"}},item[1])
                );
              })}
            </div>
            {portfolio.map(function(p,idx){
              var live=livePrices[p.symbol];
              var pnlPct=live?((live.price-p.avgPrice)/p.avgPrice)*100:((p.value/(p.shares*p.avgPrice))-1)*100;
              var pnlD=p.value-p.shares*p.avgPrice;
              var atStop=pnlPct<=-8,atTgt=pnlPct>=15;
              var bc=atStop?"#ff4444":atTgt?"#00ccff":pnlPct>=0?"#00ff88":"#ff6644";
              return React.createElement("div",{key:idx,style:Object.assign({},S.card,{borderLeft:"3px solid "+bc})},
                React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:4}},
                  React.createElement("div",null,
                    React.createElement("span",{style:{color:"#fff",fontWeight:"bold",fontSize:14}},p.symbol),
                    atStop&&React.createElement("span",{style:{color:"#ff6666",fontSize:10,marginLeft:8}},"STOP ZONE"),
                    atTgt&&React.createElement("span",{style:{color:"#00ddff",fontSize:10,marginLeft:8}},"TARGET ZONE")
                  ),
                  React.createElement("span",{style:{color:"#ddd",fontSize:13}},"$"+p.value.toFixed(2))
                ),
                React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:live?4:0}},
                  React.createElement("span",{style:{color:"#aaaaaa",fontSize:10}},p.shares.toFixed(4)+"sh @ $"+p.avgPrice.toFixed(2)),
                  React.createElement("span",{style:{color:pnlPct>=0?"#00ff88":"#ff4444",fontSize:12,fontWeight:"bold"}},(pnlPct>=0?"+":"")+pnlPct.toFixed(2)+"% ("+(pnlD>=0?"+":"")+"$"+pnlD.toFixed(2)+")")
                ),
                live&&React.createElement("div",{style:{display:"flex",gap:10,fontSize:10}},
                  React.createElement("span",{style:{color:"#999999"}},"Live: "),
                  React.createElement("span",{style:{color:"#ffffff"}},"$"+live.price.toFixed(2)),
                  React.createElement("span",{style:{color:"#999999"}},"H: "),
                  React.createElement("span",{style:{color:"#cccccc"}},"$"+(live.high?live.high.toFixed(2):"-")),
                  React.createElement("span",{style:{color:"#999999"}},"L: "),
                  React.createElement("span",{style:{color:"#cccccc"}},"$"+(live.low?live.low.toFixed(2):"-")),
                  React.createElement("span",{style:{color:live.change>=0?"#00ff8850":"#ff444450"}},(live.change>=0?"▲":"▼")+Math.abs(live.change).toFixed(2)+"%")
                )
              );
            })}
            <div style={Object.assign({},S.card,{marginTop:16})}>
              <div style={S.lbl}>LOG TRADE</div>
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
              <button onClick={logTrade} style={S.btn()}>CONFIRM TRADE</button>
            </div>
          </div>
        )}

        {activeTab==="trades"&&(
          <div>
            <div style={S.lbl}>TRADE HISTORY ({trades.length})</div>
            {trades.length===0?
              React.createElement("div",{style:{textAlign:"center",padding:40,color:"#446644",border:"1px dashed #2a4a2a",borderRadius:4}},
                React.createElement("div",{style:{fontSize:10,letterSpacing:2}},"NO TRADES LOGGED YET")
              )
              :trades.map(function(t,idx){
                return React.createElement("div",{key:idx,style:Object.assign({},S.card,{borderLeft:"3px solid "+(t.action==="BUY"?"#00ff88":"#ff6644")})},
                  React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:3}},
                    React.createElement("span",{style:{color:t.action==="BUY"?"#00ff88":"#ff6644",fontWeight:"bold",fontSize:11}},t.action),
                    React.createElement("span",{style:{color:"#888888",fontSize:10}},t.date)
                  ),
                  React.createElement("div",{style:{display:"flex",justifyContent:"space-between"}},
                    React.createElement("span",{style:{color:"#eeeeee",fontSize:13}},t.symbol+" - "+t.shares+"sh @ $"+t.price),
                    React.createElement("span",{style:{color:"#aaaaaa",fontSize:12}},"$"+t.total.toFixed(2))
                  ),
                  t.note&&React.createElement("div",{style:{color:"#777777",fontSize:10,marginTop:3}},t.note)
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
                React.createElement("div",{style:{color:"#446644",fontSize:10,letterSpacing:2,textAlign:"center",marginTop:70}},"ASK ANYTHING - ENTRIES, EXITS, STRATEGY, MARKET")
                :chatHistory.map(function(m,idx){
                  return React.createElement("div",{key:idx,style:{marginBottom:14}},
                    React.createElement("div",{style:{fontSize:9,color:m.role==="user"?"#00ff8899":"#4488ffaa",letterSpacing:2,marginBottom:4}},m.role==="user"?"YOU":"QUANT"),
                    React.createElement("div",{style:{color:m.role==="user"?"#eeeeee":"#cccccc",fontSize:12,lineHeight:1.6}},typeof m.content==="string"?m.content:"")
                  );
                })
              }
              {chatLoading&&React.createElement("div",{style:{color:"#00ff8866",fontSize:10,letterSpacing:2}},"Searching market data...")}
            </div>
            <div style={{display:"flex",gap:8}}>
              <input placeholder="Entry on MU? Should I hold AMAT? What is SPY doing?" value={chatInput} onChange={function(e){ setChatInput(e.target.value); }} onKeyDown={function(e){ if(e.key==="Enter") sendChat(); }} style={Object.assign({},S.inp,{flex:1})}/>
              <button onClick={sendChat} disabled={chatLoading} style={Object.assign({},S.btn("#4488ff","linear-gradient(135deg,#060e24,#000e44)"),{width:"auto",padding:"8px 16px"})}>GO</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
