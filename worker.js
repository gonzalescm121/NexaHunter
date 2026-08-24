const APP_HTML = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#070a0f">
<title>NexaHunter Trading</title>

<style>
:root{
  --bg:#070a0f;
  --panel:#0d1219;
  --line:#202a36;
  --text:#f4f7fb;
  --muted:#8e9aaa;
  --accent:#66e3b4;
  --red:#ff6b7a;
  --blue:#75a7ff;
  --orange:#ffb454
}

*{box-sizing:border-box}

html,body{
  margin:0;
  background:var(--bg);
  color:var(--text);
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif
}

body{padding:24px}

.wrap{
  max-width:1100px;
  margin:auto
}

header{
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding:18px 0 30px;
  gap:20px
}

h1{
  font-size:32px;
  margin:0
}

h2{
  margin-top:0
}

.badge{
  padding:8px 12px;
  border:1px solid #2b3542;
  border-radius:999px;
  color:var(--accent);
  white-space:nowrap
}

.grid{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:14px
}

.card{
  background:var(--panel);
  border:1px solid var(--line);
  border-radius:18px;
  padding:20px
}

.label{
  color:var(--muted);
  font-size:14px
}

.value{
  font-size:27px;
  font-weight:700;
  margin-top:8px
}

.up{color:var(--accent)}
.down{color:var(--red)}
.warn{color:var(--orange)}
.muted{color:var(--muted)}

.row{
  display:grid;
  grid-template-columns:2fr 1fr 1fr;
  gap:12px;
  align-items:center;
  padding:14px 0;
  border-bottom:1px solid var(--line)
}

.row:last-child{
  border-bottom:0
}

.mini{
  display:block;
  color:var(--muted);
  font-size:12px;
  margin-top:3px
}

.coin{
  display:flex;
  gap:10px;
  align-items:center
}

.coin-badge{
  width:34px;
  height:34px;
  border-radius:50%;
  display:grid;
  place-items:center;
  background:#182331;
  color:var(--blue);
  font-weight:700
}

.right{text-align:right}

input,select,button{
  width:100%;
  padding:13px;
  border-radius:12px;
  border:1px solid #2a3542;
  background:#101720;
  color:var(--text);
  font-size:15px
}

button{
  cursor:pointer
}

.primary{
  background:#315fe8;
  border-color:#4674ff
}

.primary:disabled{
  opacity:.55;
  cursor:not-allowed
}

.status-box{
  display:flex;
  justify-content:space-between;
  gap:12px;
  align-items:center;
  padding:12px 0;
  border-bottom:1px solid var(--line)
}

.status-box:last-child{
  border-bottom:0
}

.toast{
  position:fixed;
  bottom:25px;
  left:50%;
  transform:translateX(-50%);
  background:#18212c;
  padding:12px 18px;
  border-radius:999px;
  display:none;
  z-index:100
}

@media(max-width:800px){
  .grid{
    grid-template-columns:repeat(2,1fr)
  }
}

@media(max-width:520px){
  body{padding:14px}

  .grid{
    grid-template-columns:1fr 1fr
  }

  h1{
    font-size:25px
  }

  header{
    align-items:flex-start
  }

  .badge{
    font-size:12px
  }

  .row{
    grid-template-columns:1.6fr 1fr 1fr
  }
}
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

  <div class="card">
    <div class="label">Tracked assets</div>
    <div class="value">9</div>
    <div class="up">Stocks + crypto</div>
  </div>

  <div class="card">
    <div class="label">Market feed</div>
    <div class="value" id="feedStatus">READY</div>
    <div class="up">Validation enabled</div>
  </div>

  <div class="card">
    <div class="label">Alerts</div>
    <div class="value" id="alerts">0</div>
    <div class="muted">Local rules</div>
  </div>

  <div class="card">
    <div class="label">Execution</div>
    <div class="value down">OFF</div>
    <div class="muted">Permanent safety lock</div>
  </div>

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

  <div>
    <div class="label">Symbol</div>
    <input
      id="symbol"
      value="AAPL"
      maxlength="10"
      autocomplete="off">
  </div>

  <div>
    <div class="label">Quantity</div>
    <input
      id="qty"
      type="number"
      value="1"
      min="1"
      step="1">
  </div>

  <div>
    <div class="label">Limit Price</div>
    <input
      id="price"
      type="number"
      value="100"
      min="0.01"
      step="0.01">
  </div>

  <div>
    <div class="label">Side</div>

    <select id="side">
      <option value="BUY">BUY</option>
      <option value="SELL">SELL</option>
    </select>
  </div>

</div>

<br>

<button class="primary" id="order">
  Queue Paper Order
</button>

<div id="orders"></div>

</div>

<br>

<div class="card">

<h2>System Status</h2>

<div class="status-box">
  <span>Server health</span>
  <span id="serverStatus" class="warn">CHECKING</span>
</div>

<div class="status-box">
  <span>Data validation</span>
  <span class="up">PASS</span>
</div>

<div class="status-box">
  <span>Invalid quantities</span>
  <span class="up">REJECT</span>
</div>

<div class="status-box">
  <span>Invalid prices</span>
  <span class="up">REJECT</span>
</div>

<div class="status-box">
  <span>Duplicate orders</span>
  <span class="up">REJECT</span>
</div>

<div class="status-box">
  <span>Future timestamps</span>
  <span class="up">REJECT</span>
</div>

<div class="status-box">
  <span>Live execution</span>
  <span class="down">DISABLED</span>
</div>

</div>

</div>

<div class="toast" id="toast"></div>

<script>

const assets = [
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

const market = document.getElementById("market");

function escapeHtml(value){
  return String(value)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

market.innerHTML = assets.map(function(a){

  const cls = a[3][0] === "-" ? "down" : "up";

  return "<div class=\"row\">" +

    "<div class=\"coin\">" +
      "<span class=\"coin-badge\">" +
        escapeHtml(a[0].replace("/","").slice(0,3)) +
      "</span>" +

      "<span>" +
        "<b>" + escapeHtml(a[1]) + "</b>" +
        "<span class=\"mini\">" +
          escapeHtml(a[0]) +
        "</span>" +
      "</span>" +

    "</div>" +

    "<span class=\"right\">" +
      escapeHtml(a[2]) +
    "</span>" +

    "<b class=\"right " + cls + "\">" +
      escapeHtml(a[3]) +
    "</b>" +

  "</div>";

}).join("");

function toast(message){

  const element = document.getElementById("toast");

  element.textContent = message;
  element.style.display = "block";

  setTimeout(function(){
    element.style.display = "none";
  },2500);
}

async function checkHealth(){

  try{

    const response = await fetch("/health",{
      method:"GET",
      cache:"no-store"
    });

    if(!response.ok){
      throw new Error("Health check failed");
    }

    const data = await response.json();

    const element =
      document.getElementById("serverStatus");

    element.textContent =
      data.status === "ok" ? "PASS" : "FAIL";

    element.className =
      data.status === "ok" ? "up" : "down";

  }catch(error){

    const element =
      document.getElementById("serverStatus");

    element.textContent = "FAIL";
    element.className = "down";
  }
}

document.getElementById("order").onclick =
async function(){

  const button =
    document.getElementById("order");

  const symbol =
    document.getElementById("symbol").value
      .trim()
      .toUpperCase();

  const quantity =
    document.getElementById("qty").value;

  const price =
    document.getElementById("price").value;

  const side =
    document.getElementById("side").value;

  if(!symbol || !quantity || !price){

    toast("Complete all order fields");
    return;
  }

  button.disabled = true;
  button.textContent = "Validating...";

  try{

    const response = await fetch(
      "/api/paper-orders",
      {
        method:"POST",
        headers:{
          "content-type":"application/json"
        },
        body:JSON.stringify({
          symbol:symbol,
          quantity:quantity,
          price:price,
          side:side
        })
      }
    );

    const data = await response.json();

    if(!response.ok){

      toast(
        data.error ||
        "Paper order rejected"
      );

      return;
    }

    const order = data.order;

    document.getElementById("orders").innerHTML +=

      "<div class=\"row\">" +

        "<span>" +

          "<b>" +
            escapeHtml(order.symbol) +
          "</b>" +

          "<span class=\"mini\">" +
            escapeHtml(
              String(order.quantity)
            ) +
            " units @ " +
            escapeHtml(
              String(order.price)
            ) +
          "</span>" +

        "</span>" +

        "<span>" +
          escapeHtml(order.side) +
        "</span>" +

        "<span class=\"right up\">" +
          "Paper queued" +
        "</span>" +

      "</div>";

    toast(
      "Paper order accepted — live execution is disabled"
    );

  }catch(error){

    toast(
      "Server error — order was not submitted"
    );

  }finally{

    button.disabled = false;
    button.textContent = "Queue Paper Order";

  }
};

checkHealth();

</script>

</body>
</html>`;


/*
========================================================
NEXAHUNTER VALIDATION ENGINE
========================================================
*/

const MAX_QUANTITY = 1000000;

const MAX_PRICE = 1000000000;

const SYMBOL_REGEX =
  /^[A-Z][A-Z0-9./-]{0,9}$/;

const MAX_CLOCK_SKEW_MS = 5000;

const DUPLICATE_TTL_MS = 300000;

const recentOrders = new Map();


function validatePaperOrder(input){

  if(!input || typeof input !== "object"){

    return {
      valid:false,
      error:"Invalid order payload"
    };

  }

  const symbol =
    String(input.symbol || "")
      .trim()
      .toUpperCase();

  const quantity =
    Number(input.quantity);

  const price =
    Number(input.price);

  const side =
    String(input.side || "")
      .trim()
      .toUpperCase();


  if(!symbol){

    return {
      valid:false,
      error:"Symbol is required"
    };

  }


  if(!SYMBOL_REGEX.test(symbol)){

    return {
      valid:false,
      error:"Invalid symbol"
    };

  }


  if(!Number.isInteger(quantity)){

    return {
      valid:false,
      error:"Quantity must be a whole number"
    };

  }


  if(quantity <= 0){

    return {
      valid:false,
      error:"Quantity must be greater than zero"
    };

  }


  if(quantity > MAX_QUANTITY){

    return {
      valid:false,
      error:"Quantity exceeds maximum allowed"
    };

  }


  if(!Number.isFinite(price)){

    return {
      valid:false,
      error:"Price must be a valid number"
    };

  }


  if(price <= 0){

    return {
      valid:false,
      error:"Price must be greater than zero"
    };

  }


  if(price > MAX_PRICE){

    return {
      valid:false,
      error:"Price exceeds maximum allowed"
    };

  }


  if(side !== "BUY" && side !== "SELL"){

    return {
      valid:false,
      error:"Side must be BUY or SELL"
    };

  }


  if(input.timestamp !== undefined){

    const timestamp =
      Date.parse(input.timestamp);

    if(!Number.isFinite(timestamp)){

      return {
        valid:false,
        error:"Timestamp must be valid ISO date-time"
      };

    }

    if(
      timestamp >
      Date.now() + MAX_CLOCK_SKEW_MS
    ){

      return {
        valid:false,
        error:"Future timestamps are not allowed"
      };

    }

  }


  return {

    valid:true,

    order:{
      symbol:symbol,
      quantity:quantity,
      price:price,
      side:side
    }

  };

}


/*
========================================================
DUPLICATE ORDER PROTECTION
========================================================
*/

function duplicateKey(order){

  return [
    order.symbol,
    order.quantity,
    order.price,
    order.side
  ].join("|");

}


function isDuplicate(order){

  const now = Date.now();

  for(
    const [key,time]
    of recentOrders
  ){

    if(
      now - time >
      DUPLICATE_TTL_MS
    ){

      recentOrders.delete(key);

    }

  }


  const key =
    duplicateKey(order);


  if(recentOrders.has(key)){

    return true;

  }


  recentOrders.set(
    key,
    now
  );

  return false;

}


/*
========================================================
HTTP HELPERS
========================================================
*/

function securityHeaders(){

  return {

    "X-Content-Type-Options":
      "nosniff",

    "X-Frame-Options":
      "DENY",

    "Referrer-Policy":
      "no-referrer",

    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=()"

  };

}


function json(data,status=200){

  return new Response(

    JSON.stringify(data),

    {
      status:status,

      headers:{
        "content-type":
          "application/json;charset=UTF-8",

        "cache-control":
          "no-store",

        ...securityHeaders()
      }

    }

  );

}


/*
========================================================
NEXAHUNTER WORKER
========================================================
*/

export default {

  async fetch(request){

    const url =
      new URL(request.url);


    /*
    --------------------------------------------
    HEALTH CHECK
    --------------------------------------------
    */

    if(
      url.pathname === "/health" &&
      request.method === "GET"
    ){

      return new Response(

        JSON.stringify({

          status:"ok",

          app:"NexaHunter",

          mode:"paper",

          liveExecution:false,

          timestamp:
            new Date().toISOString()

        }),

        {

          status:200,

          headers:{

            "content-type":
              "application/json;charset=UTF-8",

            "cache-control":
              "no-store",

            ...securityHeaders()

          }

        }

      );

    }


    /*
    --------------------------------------------
    PAPER ORDER API
    --------------------------------------------
    */

    if(
      url.pathname === "/api/paper-orders" &&
      request.method === "POST"
    ){

      let body;


      try{

        body =
          await request.json();

      }catch(error){

        return json(

          {
            accepted:false,
            error:
              "Request body must be valid JSON"
          },

          400

        );

      }


      const validation =
        validatePaperOrder(body);


      if(!validation.valid){

        return json(

          {
            accepted:false,
            error:
              validation.error
          },

          400

        );

      }


      const order =
        validation.order;


      /*
      ------------------------------------------
      DUPLICATE ORDER CHECK
      ------------------------------------------
      */

      if(isDuplicate(order)){

        return json(

          {
            accepted:false,
            error:
              "Duplicate paper order rejected"
          },

          409

        );

      }


      /*
      ------------------------------------------
      SERVER-SIDE PAPER ORDER
      ------------------------------------------
      */

      const finalOrder = {

        id:
          crypto.randomUUID(),

        symbol:
          order.symbol,

        quantity:
          order.quantity,

        price:
          order.price,

        side:
          order.side,

        mode:
          "PAPER",

        liveExecution:
          false,

        timestamp:
          new Date().toISOString()

      };


      return json(

        {
          accepted:true,

          message:
            "Paper order queued",

          order:
            finalOrder
        },

        200

      );

    }


    /*
    --------------------------------------------
    ROUTING
    --------------------------------------------
    */

    if(
      url.pathname !== "/" &&
      url.pathname !== "/index.html"
    ){

      return new Response(

        "NexaHunter: route not found",

        {

          status:404,

          headers:{

            "content-type":
              "text/plain;charset=UTF-8",

            ...securityHeaders()

          }

        }

      );

    }


    /*
    --------------------------------------------
    MAIN APPLICATION
    --------------------------------------------
    */

    return new Response(

      APP_HTML,

      {

        status:200,

        headers:{

          "content-type":
            "text/html;charset=UTF-8",

          "cache-control":
            "no-store",

          ...securityHeaders()

        }

      }

    );

  }

};
export {
  IdempotencyDurableObject
} from "./src/idempotency.js";