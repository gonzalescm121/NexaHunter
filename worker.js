const APP_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#070a0f">
<title>NexaHunter Trading</title>
<style>
:root{--bg:#070a0f;--panel:#0d1219;--line:#202a36;--text:#f4f7fb;--muted:#8e9aaa;--accent:#66e3b4;--red:#ff6b7a;--blue:#75a7ff}
*{box-sizing:border-box}
html,body{margin:0;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif}
body{padding:24px}
.wrap{max-width:1100px;margin:auto}
header{display:flex;justify-content:space-between;align-items:center;padding:18px 0 30px}
h1{font-size:32px;margin:0}
.badge{padding:8px 12px;border:1px solid #2b3542;border-radius:999px;color:var(--accent)}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:20px}
.label{color:var(--muted);font-size:14px}
.value{font-size:27px;font-weight:700;margin-top:8px}
.up{color:var(--accent)}
.down{color:var(--red)}
.muted{color:var(--muted)}
.row{display:grid;grid-template-columns:2fr 1fr 1fr;gap:12px;align-items:center;padding:14px 0;border-bottom:1px solid var(--line)}
.mini{display:block;color:var(--muted);font-size:12px;margin-top:3px}
.coin{display:flex;gap:10px;align-items:center}
.coin-badge{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#182331;color:var(--blue);font-weight:700}
.right{text-align:right}
input,select,button{width:100%;padding:13px;border-radius:12px;border:1px solid #2a3542;background:#101720;color:var(--text);font-size:15px}
button{cursor:pointer;background:#182536}
.primary{background:#315fe8;border-color:#4674ff}
.toast{position:fixed;bottom:25px;left:50%;transform:translateX(-50%);background:#18212c;padding:12px 18px;border-radius:999px;display:none}
@media(max-width:800px){.grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:520px){body{padding:14px}.grid{grid-template-columns:1fr 1fr}h1{font-size:25px}}
</style>
</head>
<body>
<div class="wrap">
<header>
<div>
<h1>NexaHunter</h1>
<div class="muted">Trading intelligence platform</div>
</div>
<div class="badge">PAPER • LIVE OFF</div>
</header>

<div class="grid">
<div class="card"><div class="label">Tracked assets</div><div class="value">9</div><div class="up">Stocks + crypto</div></div>
<div class="card"><div class="label">Market feed</div><div class="value">Ready</div><div class="up">Validation enabled</div></div>
<div class="card"><div class="label">Alerts</div><div class="value" id="alerts">0</div><div class="muted">Local rules</div></div>
<div class="card"><div class="label">Execution</div><div class="value down">OFF</div><div class="muted">Safety lock</div></div>
</div>

<br>

<div class="card">
<h2>Market Watch</h2>
<div id="market"></div>
</div>

<br>

<div class="card">
<h2>Paper Order</h2>
<div class="grid">
<div><div class="label">Symbol</div><input id="symbol" value="AAPL"></div>
<div><div class="label">Quantity</div><input id="qty" type="number" value="1" min="1"></div>
<div><div class="label">Limit Price</div><input id="price" type="number" value="100"></div>
<div><div class="label">Side</div><select id="side"><option>BUY</option><option>SELL</option></select></div>
</div>
<br>
<button class="primary" id="order">Queue Paper Order</button>
<div id="orders"></div>
</div>

<br>

<div class="card">
<h2>System Status</h2>
<div class="row"><span>Data validation</span><span class="right up">PASS</span></div>
<div class="row"><span>Future timestamps</span><span class="right up">REJECT</span></div>
<div class="row"><span>Duplicate orders</span><span class="right up">REJECT</span></div>
<div class="row"><span>Live execution</span><span class="right down">DISABLED</span></div>
</div>
</div>

<div class="toast" id="toast"></div>

<script>
const assets=[
["AAPL","Apple","$227.16","+0.82%"],
["MSFT","Microsoft","$504.26","+0.41%"],
["NVDA","NVIDIA","$179.82","+1.27%"],
["AMZN","Amazon","$230.56","+0.35%"],
["GOOGL","Alphabet","$201.90","+0.62%"],
["TSLA","Tesla","$329.25","-0.44%"],
["BTC/USD","Bitcoin","$116,400","+1.15%"],
["ETH/USD","Ethereum","$4,020","+0.74%"],
["SPY","S&P 500 ETF","$646.20","+0.28%"]
];

const market=document.getElementById("market");
market.innerHTML=assets.map(a=>{
const cls=a[3][0]=="-"?"down":"up";
return '<div class="row"><div class="coin"><span class="coin-badge">'+a[0].replace("/","").slice(0,3)+'</span><span><b>'+a[1]+'</b><span class="mini">'+a[0]+'</span></span></div><span class="right">'+a[2]+'</span><b class="right '+cls+'">'+a[3]+'</b></div>';
}).join("");

let orders=[];
function toast(t){
const e=document.getElementById("toast");
e.textContent=t;
e.style.display="block";
setTimeout(()=>e.style.display="none",2200);
}

document.getElementById("order").onclick=()=>{
const symbol=document.getElementById("symbol").value.trim().toUpperCase();
const qty=document.getElementById("qty").value;
const price=document.getElementById("price").value;
const side=document.getElementById("side").value;

if(!symbol||!qty||!price){toast("Complete all order fields");return}

const order={symbol,qty,price,side,id:crypto.randomUUID()};
const duplicate=orders.some(o=>
  o.symbol===symbol &&
  o.qty===qty &&
  o.price===price &&
  o.side===side
);
if(duplicate){
  toast("Duplicate paper order rejected");
  return;
}
orders.unshift(order);

document.getElementById("orders").innerHTML=
'<h3>Paper Orders</h3>'+
orders.map(o=>'<div class="row"><span><b>'+o.symbol+'</b><span class="mini">'+o.qty+' units @ '+o.price+'</span></span><span>'+o.side+'</span><span class="right up">Paper queued</span></div>').join("");

toast("Paper order queued — live execution is disabled");
};
</script>
</body>
</html>`;

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname !== "/" && url.pathname !== "/index.html") {
      return new Response("NexaHunter: route not found", {
        status: 404,
        headers: {"content-type":"text/plain;charset=UTF-8"}
      });
    }

    return new Response(APP_HTML, {
      status: 200,
      headers: {
        "content-type":"text/html;charset=UTF-8",
        "cache-control":"no-store"
      }
    });
  }
};