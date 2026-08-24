/*
========================================================
NEXAHUNTER WORKER
========================================================

Paper-trading only.

Features:
- Health endpoint
- Paper order validation
- Duplicate-order protection
- Durable Object idempotency in production
- Process-global fallback for Node tests
- Security headers
- Request size protection
- Content-Type enforcement
- Method enforcement
- API error normalization
- Live execution permanently disabled
========================================================
*/

const APP_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>NexaHunter</title>
<style>
*{box-sizing:border-box}
body{
  margin:0;
  padding:24px;
  background:#0b0f14;
  color:#f5f7fa;
  font-family:Arial,Helvetica,sans-serif
}
.container{max-width:1000px;margin:auto}
.card{
  background:#151b23;
  border:1px solid #2a3340;
  border-radius:16px;
  padding:20px;
  margin-bottom:18px
}
h1,h2{margin-top:0}
.grid{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
  gap:14px
}
.label{
  font-size:13px;
  color:#9ba7b5;
  margin-bottom:6px
}
input,select{
  width:100%;
  padding:12px;
  border-radius:10px;
  border:1px solid #384454;
  background:#0d1218;
  color:#fff
}
button{
  padding:12px 18px;
  border:0;
  border-radius:10px;
  cursor:pointer;
  background:#ff795f;
  color:#fff;
  font-weight:700
}
button:disabled{
  opacity:.6;
  cursor:not-allowed
}
.row{
  display:grid;
  grid-template-columns:1fr auto auto;
  gap:15px;
  align-items:center;
  padding:12px 0;
  border-bottom:1px solid #252d38
}
.row:last-child{border-bottom:0}
.right{text-align:right}
.up{color:#58d68d}
.down{color:#ff6b6b}
.warn{color:#f3c969}
.mini{
  display:block;
  font-size:12px;
  color:#8995a3;
  margin-top:3px
}
.status-box{
  display:flex;
  justify-content:space-between;
  padding:10px 0;
  border-bottom:1px solid #252d38
}
.status-box:last-child{border-bottom:0}
.toast{
  display:none;
  position:fixed;
  left:50%;
  bottom:25px;
  transform:translateX(-50%);
  background:#222b36;
  padding:13px 18px;
  border-radius:10px;
  box-shadow:0 5px 30px #0008
}
</style>
</head>

<body>

<div class="container">

<div class="card">
<h1>NexaHunter</h1>
<p>Paper Trading &amp; Market Validation</p>
</div>

<div class="card">
<h2>Market Watch</h2>
<div id="market"></div>
</div>

<div class="card">
<h2>Paper Order</h2>

<div class="grid">

<div>
<div class="label">Symbol</div>
<input id="symbol" value="AAPL" maxlength="10">
</div>

<div>
<div class="label">Quantity</div>
<input id="qty" type="number" value="1" min="1" step="1">
</div>

<div>
<div class="label">Limit Price</div>
<input id="price" type="number" value="100" min="0.01" step="0.01">
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

<button id="order">Queue Paper Order</button>

<div id="orders"></div>
</div>

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

function escapeHtml(value){
  return String(value)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

const market =
  document.getElementById("market");

market.innerHTML =
  assets.map(function(a){

    const cls =
      a[3][0] === "-"
        ? "down"
        : "up";

    return (
      "<div class='row'>" +

        "<div>" +
          "<b>" +
            escapeHtml(a[1]) +
          "</b>" +
          "<span class='mini'>" +
            escapeHtml(a[0]) +
          "</span>" +
        "</div>" +

        "<span class='right'>" +
          escapeHtml(a[2]) +
        "</span>" +

        "<b class='right " +
          cls +
        "'>" +
          escapeHtml(a[3]) +
        "</b>" +

      "</div>"
    );

  }).join("");

function toast(message){

  const element =
    document.getElementById("toast");

  element.textContent =
    message;

  element.style.display =
    "block";

  setTimeout(function(){

    element.style.display =
      "none";

  },2500);
}

async function checkHealth(){

  try{

    const response =
      await fetch(
        "/health",
        {
          method:"GET",
          cache:"no-store"
        }
      );

    if(!response.ok){
      throw new Error(
        "Health check failed"
      );
    }

    const data =
      await response.json();

    const element =
      document.getElementById(
        "serverStatus"
      );

    element.textContent =
      data.status === "ok"
        ? "PASS"
        : "FAIL";

    element.className =
      data.status === "ok"
        ? "up"
        : "down";

  }catch(error){

    const element =
      document.getElementById(
        "serverStatus"
      );

    element.textContent =
      "FAIL";

    element.className =
      "down";
  }
}

document.getElementById("order").onclick =
async function(){

  const button =
    document.getElementById("order");

  const symbol =
    document.getElementById("symbol")
      .value
      .trim()
      .toUpperCase();

  const quantity =
    document.getElementById("qty")
      .value;

  const price =
    document.getElementById("price")
      .value;

  const side =
    document.getElementById("side")
      .value;

  if(
    !symbol ||
    !quantity ||
    !price
  ){

    toast(
      "Complete all order fields"
    );

    return;
  }

  button.disabled =
    true;

  button.textContent =
    "Validating...";

  try{

    const response =
      await fetch(
        "/api/paper-orders",
        {
          method:"POST",

          headers:{
            "content-type":
              "application/json",

            "accept":
              "application/json"
          },

          body:JSON.stringify({
            symbol,
            quantity,
            price,
            side
          })
        }
      );

    const data =
      await response.json();

    if(!response.ok){

      toast(
        data.error ||
        "Paper order rejected"
      );

      return;
    }

    const order =
      data.order;

    document.getElementById(
      "orders"
    ).innerHTML +=

      "<div class='row'>" +

        "<span>" +
          "<b>" +
            escapeHtml(
              order.symbol
            ) +
          "</b>" +

          "<span class='mini'>" +
            escapeHtml(
              String(
                order.quantity
              )
            ) +
            " units @ " +
            escapeHtml(
              String(
                order.price
              )
            ) +
          "</span>" +
        "</span>" +

        "<span>" +
          escapeHtml(
            order.side
          ) +
        "</span>" +

        "<span class='right up'>" +
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

    button.disabled =
      false;

    button.textContent =
      "Queue Paper Order";
  }
};

checkHealth();

</script>

</body>
</html>`;


/*
========================================================
VALIDATION CONSTANTS
========================================================
*/

const MAX_QUANTITY =
  1000000;

const MAX_PRICE =
  1000000000;

const SYMBOL_REGEX =
  /^[A-Z][A-Z0-9./-]{0,9}$/;

const MAX_CLOCK_SKEW_MS =
  5000;

const DUPLICATE_TTL_MS =
  300000;

const MAX_REQUEST_BYTES =
  16 * 1024;

const MAX_JSON_DEPTH =
  10;


/*
========================================================
NODE TEST FALLBACK
========================================================
*/

const fallbackOrders =
  globalThis.__NEXAHUNTER_RECENT_ORDERS__ ||
  (
    globalThis.__NEXAHUNTER_RECENT_ORDERS__ =
      new Map()
  );


/*
========================================================
JSON DEPTH PROTECTION
========================================================
*/

function jsonDepth(value){

  const stack = [
    {
      value,
      depth: 0
    }
  ];

  let maxDepth = 0;

  while(
    stack.length > 0
  ){

    const current =
      stack.pop();

    const currentValue =
      current.value;

    const currentDepth =
      current.depth;

    if(
      currentDepth >
      maxDepth
    ){

      maxDepth =
        currentDepth;
    }

    if(
      currentDepth >
      MAX_JSON_DEPTH
    ){

      return currentDepth;
    }

    if(
      currentValue === null ||
      typeof currentValue !==
        "object"
    ){

      continue;
    }

    for(
      const child
      of Object.values(
        currentValue
      )
    ){

      stack.push({
        value: child,
        depth:
          currentDepth + 1
      });
    }
  }

    return maxDepth;
}


/*
========================================================
REQUEST BODY READER
========================================================
*/

async function readJsonBody(
  request
){

  const contentLength =
    request.headers.get(
      "content-length"
    );

  if(
    contentLength !== null
  ){

    const declaredLength =
      Number(
        contentLength
      );

    if(
      !Number.isFinite(
        declaredLength
      ) ||
      declaredLength < 0
    ){

      return {
        ok:false,
        status:400,
        error:
          "Invalid Content-Length"
      };
    }

    if(
      declaredLength >
      MAX_REQUEST_BYTES
    ){

      return {
        ok:false,
        status:413,
        error:
          "Request body too large"
      };
    }
  }

  let raw;

  try{

    raw =
      await request.text();

  }catch{

    return {
      ok:false,
      status:400,
      error:
        "Unable to read request body"
    };
  }

  const bytes =
    new TextEncoder()
      .encode(raw)
      .byteLength;

  if(
    bytes >
    MAX_REQUEST_BYTES
  ){

    return {
      ok:false,
      status:413,
      error:
        "Request body too large"
    };
  }

  if(!raw.trim()){

    return {
      ok:false,
      status:400,
      error:
        "Request body is required"
    };
  }

  let body;

  try{

    body =
      JSON.parse(raw);

  }catch{

    return {
      ok:false,
      status:400,
      error:
        "Request body must be valid JSON"
    };
  }

  if(
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ){

    return {
      ok:false,
      status:400,
      error:
        "Request body must be an object"
    };
  }

  if(
    jsonDepth(body) >
    MAX_JSON_DEPTH
  ){

    return {
      ok:false,
      status:400,
      error:
        "Request body nesting is too deep"
    };
  }

  return {
    ok:true,
    body
  };
}


/*
========================================================
VALIDATE PAPER ORDER
========================================================
*/

function validatePaperOrder(
  input
){

  if(
    !input ||
    typeof input !== "object" ||
    Array.isArray(input)
  ){

    return {
      valid:false,
      error:
        "Invalid order payload"
    };
  }

  const symbol =
    String(
      input.symbol || ""
    )
      .trim()
      .toUpperCase();

  const quantity =
    Number(
      input.quantity
    );

  const price =
    Number(
      input.price
    );

  const side =
    String(
      input.side || ""
    )
      .trim()
      .toUpperCase();


  if(!symbol){

    return {
      valid:false,
      error:
        "Symbol is required"
    };
  }


  if(
    !SYMBOL_REGEX.test(symbol)
  ){

    return {
      valid:false,
      error:
        "Invalid symbol"
    };
  }


  if(
    !Number.isInteger(
      quantity
    )
  ){

    return {
      valid:false,
      error:
        "Quantity must be a whole number"
    };
  }


  if(
    quantity <= 0
  ){

    return {
      valid:false,
      error:
        "Quantity must be greater than zero"
    };
  }


  if(
    quantity >
    MAX_QUANTITY
  ){

    return {
      valid:false,
      error:
        "Quantity exceeds maximum allowed"
    };
  }


  if(
    !Number.isFinite(
      price
    )
  ){

    return {
      valid:false,
      error:
        "Price must be a valid number"
    };
  }


  if(
    price <= 0
  ){

    return {
      valid:false,
      error:
        "Price must be greater than zero"
    };
  }


  if(
    price >
    MAX_PRICE
  ){

    return {
      valid:false,
      error:
        "Price exceeds maximum allowed"
    };
  }


  if(
    side !== "BUY" &&
    side !== "SELL"
  ){

    return {
      valid:false,
      error:
        "Side must be BUY or SELL"
    };
  }


  /*
  ------------------------------------------------------
  OPTIONAL CLIENT TIMESTAMP
  ------------------------------------------------------
  */

  if(
    input.timestamp !==
    undefined
  ){

    const timestamp =
      Date.parse(
        input.timestamp
      );

    if(
      !Number.isFinite(
        timestamp
      )
    ){

      return {
        valid:false,
        error:
          "Timestamp must be valid ISO date-time"
      };
    }

    if(
      timestamp >
      Date.now() +
      MAX_CLOCK_SKEW_MS
    ){

      return {
        valid:false,
        error:
          "Future timestamps are not allowed"
      };
    }
  }


  /*
  ------------------------------------------------------
  SERVER-SIDE NOTIONAL SAFETY
  ------------------------------------------------------
  */

  const notional =
    quantity * price;

  if(
    !Number.isFinite(
      notional
    )
  ){

    return {
      valid:false,
      error:
        "Order calculation overflow"
    };
  }


  return {

    valid:true,

    order:{
      symbol,
      quantity,
      price,
      side
    }

  };
}


/*
========================================================
DUPLICATE KEY
========================================================
*/

function duplicateKey(
  order
){

  return [
    order.symbol,
    order.quantity,
    order.price,
    order.side
  ].join("|");

}


/*
========================================================
FALLBACK DUPLICATE PROTECTION
========================================================
*/

function fallbackIsDuplicate(
  order
){

  const now =
    Date.now();

  for(
    const [key,time]
    of fallbackOrders
  ){

    if(
      now - time >
      DUPLICATE_TTL_MS
    ){

      fallbackOrders.delete(
        key
      );
    }
  }

  const key =
    duplicateKey(order);

  if(
    fallbackOrders.has(key)
  ){

    return true;
  }

  fallbackOrders.set(
    key,
    now
  );

  return false;
}


/*
========================================================
DURABLE OBJECT DUPLICATE PROTECTION
========================================================
*/

async function durableIsDuplicate(
  env,
  order
){

  if(
    !env ||
    !env.IDEMPOTENCY
  ){

    return fallbackIsDuplicate(
      order
    );
  }


  const key =
    duplicateKey(order);

  const id =
    env.IDEMPOTENCY.idFromName(
      key
    );

  const stub =
    env.IDEMPOTENCY.get(
      id
    );

  const response =
    await stub.fetch(
      "https://nexahunter-idempotency/reserve",
      {
        method:"POST",

        headers:{
          "content-type":
            "application/json"
        },

        body:JSON.stringify({
          key,
          value:order
        })
      }
    );


  if(
    !response.ok
  ){

    throw new Error(
      "Idempotency service failed"
    );
  }


  const result =
    await response.json();

  return (
    result.accepted ===
    false
  );
}


/*
========================================================
SECURITY HEADERS
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
      "camera=(), microphone=(), geolocation=()",

    "Content-Security-Policy":
      "default-src 'self'; " +
      "script-src 'unsafe-inline'; " +
      "style-src 'unsafe-inline'; " +
      "connect-src 'self'; " +
      "img-src 'self' data:; " +
      "object-src 'none'; " +
      "base-uri 'self'; " +
      "frame-ancestors 'none'",

    "Cross-Origin-Resource-Policy":
      "same-origin"

  };
}


/*
========================================================
JSON RESPONSE
========================================================
*/

function json(
  data,
  status = 200
){

  return new Response(

    JSON.stringify(data),

    {
      status,

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
METHOD RESPONSE
========================================================
*/

function methodNotAllowed(
  allowed
){

  return new Response(

    JSON.stringify({
      accepted: false,
      error:
        "Method not allowed"
    }),

    {
      status: 405,

      headers: {
        "content-type":
          "application/json;charset=UTF-8",

        "cache-control":
          "no-store",

        "Allow":
          allowed,

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
========================================================
NEXAHUNTER WORKER
========================================================
*/

export default {

  async fetch(
    request,
    env
  ){

    const url =
      new URL(
        request.url
      );


    /*
    --------------------------------------------
    HEALTH
    --------------------------------------------
    */

    if(
      url.pathname ===
      "/health"
    ){

      if(
        request.method !==
        "GET"
      ){

        return methodNotAllowed(
          "GET"
        );
      }

      return json(
        {
          status:"ok",
          app:"NexaHunter",
          mode:"paper",
          liveExecution:false,
          timestamp:
            new Date().toISOString()
        },
        200
      );
    }


    /*
    --------------------------------------------
    PAPER ORDER API
    --------------------------------------------
    */

    if(
      url.pathname ===
      "/api/paper-orders"
    ){

      if(
        request.method !==
        "POST"
      ){

        return methodNotAllowed(
          "POST"
        );
      }


      /*
      ------------------------------------------
      CONTENT TYPE
      ------------------------------------------
      */

      const contentType =
        request.headers.get(
          "content-type"
        ) || "";

      if(
        !contentType
          .toLowerCase()
          .startsWith(
            "application/json"
          )
      ){

        return json(
          {
            accepted:false,
            error:
              "Content-Type must be application/json"
          },
          415
        );
      }


      /*
      ------------------------------------------
      BODY
      ------------------------------------------
      */

      const parsed =
        await readJsonBody(
          request
        );

      if(
        !parsed.ok
      ){

        return json(
          {
            accepted:false,
            error:
              parsed.error
          },
          parsed.status
        );
      }


      /*
      ------------------------------------------
      VALIDATION
      ------------------------------------------
      */

      const validation =
        validatePaperOrder(
          parsed.body
        );


      if(
        !validation.valid
      ){

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
      IDEMPOTENCY
      ------------------------------------------
      */

      let duplicate;

      try{

        duplicate =
          await durableIsDuplicate(
            env,
            order
          );

      }catch(error){

        return json(
          {
            accepted:false,
            error:
              "Idempotency service unavailable"
          },
          503
        );
      }


      if(
        duplicate
      ){

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
      PAPER ORDER
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
    ROOT APPLICATION
    --------------------------------------------
    */

    if(
      url.pathname === "/" ||
      url.pathname === "/index.html"
    ){

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


    /*
    --------------------------------------------
    UNKNOWN ROUTES
    --------------------------------------------
    */

    return new Response(
      "Route not found",
      {
        status:404,

        headers:{
          "content-type":
            "text/plain;charset=UTF-8",

          "cache-control":
            "no-store",

          ...securityHeaders()
        }
      }
    );
  }
};


/*
========================================================
DURABLE OBJECT EXPORT
========================================================
*/

export {
  IdempotencyDurableObject
} from "./src/idempotency.js";