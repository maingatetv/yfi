import React, { useState, useEffect, useRef } from "react";
import { 
  Key, Shield, RefreshCw, Send, Terminal, Play, Copy, 
  HelpCircle, Code, Eye, EyeOff, Check, AlertTriangle, 
  Cpu, Globe, ArrowRight, Trash2, CheckCircle2, Info
} from "lucide-react";

interface ApiKeyRecord {
  apiKey: string;
  secret: string | null;
  botId: string;
  ipWhitelist: string[];
  rateLimitMaxRequests: number;
  created_at: string;
}

export default function ApiLayerDashboard() {
  // Key state
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  
  // Create Key form state
  const [newBotId, setNewBotId] = useState("");
  const [newIpWhitelist, setNewIpWhitelist] = useState("0.0.0.0, ::");
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  
  // Provision result modal
  const [provisionedKey, setProvisionedKey] = useState<{
    apiKey: string;
    secret: string;
    botId: string;
    ipWhitelist: string[];
  } | null>(null);

  // REST Playground State
  const [selectedEndpoint, setSelectedEndpoint] = useState("/api/auth");
  const [requestMethod, setRequestMethod] = useState("POST");
  const [requestBody, setRequestBody] = useState<string>(
    JSON.stringify({ apiKey: "yf_live_master_key_2026", secret: "yf_sec_master_secret_key_256" }, null, 2)
  );
  const [customHeaderToken, setCustomHeaderToken] = useState("");
  const [apiResponse, setApiResponse] = useState<{
    status: number | null;
    timeMs: number | null;
    headers: Record<string, string>;
    body: any;
  }>({ status: null, timeMs: null, headers: {}, body: null });
  const [apiRunning, setApiRunning] = useState(false);

  // Copied alert state
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // WS Console State
  const [wsStatus, setWsStatus] = useState<"DISCONNECTED" | "CONNECTING" | "CONNECTED">("DISCONNECTED");
  const [wsLogs, setWsLogs] = useState<{ id: string; time: string; type: string; direction: "IN" | "OUT"; payload: any }[]>([]);
  const [wsAuthToken, setWsAuthToken] = useState("");
  const [wsApiKey, setWsApiKey] = useState("yf_live_master_key_2026");
  const [wsApiSecret, setWsApiSecret] = useState("yf_sec_master_secret_key_256");
  const [wsAuthMethod, setWsAuthMethod] = useState<"token" | "key">("key");
  const wsRef = useRef<WebSocket | null>(null);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  // SDK Codes Tab
  const [sdkTab, setSdkTab] = useState<"js" | "python">("js");

  // OpenAPI Explorer active route
  const [activeSpecPath, setActiveSpecPath] = useState<string>("/api/auth");

  // Load API keys from backend
  const fetchApiKeys = async () => {
    setLoadingKeys(true);
    try {
      const res = await fetch("/api/bot/apikeys");
      const data = await res.json();
      if (data.success) {
        setKeys(data.apiKeys);
      }
    } catch (e) {
      console.error("Failed to fetch api keys:", e);
    } finally {
      setLoadingKeys(false);
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  // Handle Key Provisioning
  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBotId.trim()) return;

    setIsCreatingKey(true);
    try {
      const ips = newIpWhitelist
        .split(",")
        .map(ip => ip.trim())
        .filter(Boolean);

      const res = await fetch("/api/bot/apikeys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botId: newBotId.trim(),
          ipWhitelist: ips
        })
      });

      const data = await res.json();
      if (data.success) {
        setProvisionedKey({
          apiKey: data.apiKey,
          secret: data.secret,
          botId: data.botId,
          ipWhitelist: data.ipWhitelist
        });
        setNewBotId("");
        setNewIpWhitelist("0.0.0.0, ::");
        fetchApiKeys();
      } else {
        alert(data.error || "Failed to create API key");
      }
    } catch (err) {
      alert("Error contacting the licensing server.");
    } finally {
      setIsCreatingKey(false);
    }
  };

  // Revoke key
  const handleRevokeKey = async (key: string) => {
    if (!confirm("Are you sure you want to permanently revoke this API key? External bots using it will immediately fail auth.")) return;

    try {
      const res = await fetch(`/api/bot/apikeys/${encodeURIComponent(key)}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        fetchApiKeys();
      } else {
        alert(data.error || "Failed to revoke key");
      }
    } catch (e) {
      alert("Error communicating with credentials controller.");
    }
  };

  // REST Runner execution
  const executePlaygroundQuery = async () => {
    setApiRunning(true);
    const start = Date.now();
    try {
      const parsedBody = requestBody ? JSON.parse(requestBody) : undefined;
      
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };

      if (customHeaderToken) {
        headers["Authorization"] = `Bearer ${customHeaderToken.trim()}`;
      }

      // If selectedEndpoint has query params, let's append
      let fetchUrl = selectedEndpoint;

      const options: RequestInit = {
        method: requestMethod,
        headers
      };

      if (requestMethod === "POST" && parsedBody) {
        options.body = JSON.stringify(parsedBody);
      }

      const response = await fetch(fetchUrl, options);
      const duration = Date.now() - start;
      const json = await response.json();

      // Extract some response headers for display
      const displayHeaders: Record<string, string> = {
        "content-type": response.headers.get("content-type") || "application/json",
        "x-ratelimit-limit": response.headers.get("x-ratelimit-limit") || "60",
        "x-ratelimit-remaining": response.headers.get("x-ratelimit-remaining") || "59",
        "x-ratelimit-reset": response.headers.get("x-ratelimit-reset") || "60"
      };

      setApiResponse({
        status: response.status,
        timeMs: duration,
        headers: displayHeaders,
        body: json
      });

      // If auth request is successful, automatically populate token fields to make testing frictionless!
      if (selectedEndpoint === "/api/auth" && json.success && json.token) {
        setCustomHeaderToken(json.token);
        setWsAuthToken(json.token);
      }

    } catch (err: any) {
      setApiResponse({
        status: 500,
        timeMs: Date.now() - start,
        headers: {},
        body: { error: "Playground Request Failed", message: err.message }
      });
    } finally {
      setApiRunning(false);
    }
  };

  // Change selected endpoint inside playground
  const handleEndpointSelect = (endpoint: string, method: string, defaultBody: any) => {
    setSelectedEndpoint(endpoint);
    setRequestMethod(method);
    setRequestBody(JSON.stringify(defaultBody, null, 2));
  };

  // Trigger copy tooltip
  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // WebSocket Connection Actions
  const connectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    setWsStatus("CONNECTING");
    addWsLog("system", "OUT", { info: "Establishing TCP connection to gateway..." });

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${window.location.host}`;
    
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsStatus("CONNECTED");
        addWsLog("system", "IN", { status: "OPENED", message: "Handshake completed on port 3000." });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          addWsLog(data.type || "message", "IN", data);
        } catch (e) {
          addWsLog("raw", "IN", event.data);
        }
      };

      ws.onerror = (err) => {
        addWsLog("error", "IN", { error: "Socket error occurred." });
      };

      ws.onclose = () => {
        setWsStatus("DISCONNECTED");
        addWsLog("system", "IN", { status: "CLOSED", info: "WebSocket connection closed by host." });
        wsRef.current = null;
      };
    } catch (err: any) {
      setWsStatus("DISCONNECTED");
      addWsLog("error", "IN", { error: "Connection initialization failed", message: err.message });
    }
  };

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
  };

  const sendWsMessage = (payload: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
      addWsLog("action", "OUT", payload);
    } else {
      alert("Socket is not open. Connect first!");
    }
  };

  const sendWsAuth = () => {
    if (wsAuthMethod === "key") {
      sendWsMessage({
        action: "auth",
        apiKey: wsApiKey,
        secret: wsApiSecret
      });
    } else {
      sendWsMessage({
        action: "auth",
        token: wsAuthToken
      });
    }
  };

  const sendWsSubscribe = (topic: string) => {
    sendWsMessage({
      action: "subscribe",
      topic
    });
  };

  const addWsLog = (type: string, direction: "IN" | "OUT", payload: any) => {
    const time = new Date().toLocaleTimeString();
    const newLog = {
      id: Math.random().toString(36).substr(2, 9),
      time,
      type,
      direction,
      payload
    };
    setWsLogs(prev => [...prev.slice(-99), newLog]); // Keep last 100 logs
  };

  // Auto scroll ws terminal
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [wsLogs]);

  // Clean socket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // OpenAPI specifications list
  const specRoutes = [
    {
      path: "/api/auth",
      method: "POST",
      summary: "JWT Authentication Exchange",
      desc: "Authenticates your trading bot. Takes your unique API Key and Secret, performs matching, checks the IP Whitelist rules, and issues a standard Bearer JWT Token signed cryptographically. This token is valid for 1 hour.",
      headers: [
        { name: "Content-Type", type: "string", required: true, desc: "application/json" }
      ],
      params: [],
      body: {
        apiKey: "string (e.g. yf_live_master_key_2026)",
        secret: "string (e.g. yf_sec_master_secret_key_256)"
      },
      responses: {
        200: {
          success: true,
          token: "eyJhbGciOiJIUzI1Ni...",
          expires_in: 3600,
          bot_id: "alpha-whale-bot",
          last_updated: "2026-07-15T13:53:00.000Z"
        },
        401: { error: "Unauthorized", message: "Invalid API Key or Secret credential." },
        403: { error: "Forbidden", message: "Client IP is not whitelisted." }
      }
    },
    {
      path: "/api/quote",
      method: "GET",
      summary: "Get Aggregator Router Quote",
      desc: "Queries the core multi-route aggregator engine. Scans all registered protocols, chains, slippages, and liquidity layers to return the absolute best route and estimated output returns.",
      headers: [
        { name: "Authorization", type: "string", required: true, desc: "Bearer <JWT_TOKEN>" }
      ],
      params: [
        { name: "fromToken", type: "string", required: true, desc: "Source asset code (e.g. ETH, USDC, PAXG)" },
        { name: "toToken", type: "string", required: true, desc: "Destination asset code (e.g. USDC, USDT)" },
        { name: "amount", type: "number", required: true, desc: "Amount to trade (greater than zero)" },
        { name: "chain", type: "string", required: false, desc: "Target chain (ethereum, base, arbitrum)" },
        { name: "assetType", type: "string", required: false, desc: "Asset type: crypto, commodities, yield, fx" }
      ],
      body: null,
      responses: {
        200: {
          success: true,
          query: { fromToken: "ETH", toToken: "USDC", amount: 10, chain: "ethereum", assetType: "crypto" },
          bestRoute: { protocol: "Uniswap V3", price: 3450.2, received_amount: 34502, est_gas_fee_usd: 14.5, time_ms: 12 },
          allRoutes: [
            { protocol: "Uniswap V3", price: 3450.2, received_amount: 34502, est_gas_fee_usd: 14.5, latency_ms: 12 },
            { protocol: "Curve Finance", price: 3448.1, received_amount: 34481, est_gas_fee_usd: 18.2, latency_ms: 35 }
          ],
          executionTimeMs: 12
        }
      }
    },
    {
      path: "/api/swap",
      method: "POST",
      summary: "Execute Swap Allocation",
      desc: "Triggers on-chain token swapping order. Automatically executes the optimal routed path matching your parameters, collects platform routing fees, registers the bot ID for the cashback/badge ledger, and fires real-time webhook and socket broadcasts.",
      headers: [
        { name: "Authorization", type: "string", required: true, desc: "Bearer <JWT_TOKEN>" }
      ],
      params: [],
      body: {
        fromToken: "string (e.g. ETH)",
        toToken: "string (e.g. USDC)",
        amount: "number (e.g. 50)",
        chain: "string (e.g. base)"
      },
      responses: {
        200: {
          success: true,
          message: "Asset swap trade completed successfully.",
          tx_hash: "0x8922fa...",
          rate: 3450.2,
          fee_collected_usd: 1.25,
          cashback_paid_usd: 0,
          total_transactions: 1,
          transaction: { id: "tx-...", bot_id: "alpha-whale-bot", amount: 50, protocol: "Uniswap V3", is_bot: true, type: "swap", timestamp: "..." }
        }
      }
    },
    {
      path: "/api/stake",
      method: "POST",
      summary: "Stake Yield Opportunities",
      desc: "Locks liquidity into a staking yield opportunity pool. Tracks compounding interest schedules, provisions the bot badge status based on volume, and evaluates cashback eligibility.",
      headers: [
        { name: "Authorization", type: "string", required: true, desc: "Bearer <JWT_TOKEN>" }
      ],
      params: [],
      body: {
        opportunityId: "string (e.g. vibration-1)",
        amount: "number (e.g. 100000)"
      },
      responses: {
        200: {
          success: true,
          message: "Staking allocation recorded successfully.",
          tx_hash: "0x4a2cff...",
          opportunity: "Vibration Towers RWA Pool",
          amount: 100000,
          apy: 12,
          fee_collected_usd: 1000,
          cashback_paid_usd: 1000,
          total_transactions: 10,
          transaction: { id: "tx-...", bot_id: "alpha-whale-bot", amount: 100000, protocol: "Vibration Towers RWA Pool", is_bot: true, type: "stake" }
        }
      }
    },
    {
      path: "/api/badge-status",
      method: "GET",
      summary: "Get Bot Badge & Cashback Metrics",
      desc: "Extracts custom volume tier rankings, registered level badges, total transaction counts, remaining steps to next 10th milestone, total cashback payouts earned, and list of cashback triggers.",
      headers: [
        { name: "Authorization", type: "string", required: true, desc: "Bearer <JWT_TOKEN>" }
      ],
      params: [],
      body: null,
      responses: {
        200: {
          success: true,
          bot_id: "alpha-whale-bot",
          badge: { name: "DIAMOND TITAN", level: 6, range: "$10M - $100M", icon: "Gem", color: "text-cyan-500..." },
          first_tx_amount: 10000000,
          total_tx_count: 10,
          earned_cashback_usd: 100000,
          txs_remaining_for_next_cashback: 0,
          next_cashback_milestone_number: 10,
          eligible_cashback_txs: [
            { tx_number: 10, tx_hash: "0x...", amount: 10000000, cashback: 100000, timestamp: "..." }
          ]
        }
      }
    }
  ];

  // JavaScript Code Play snippet
  const jsCodeSnippet = `// Node.JS (ES6 Modules) - Automated HMAC Trade Connection Example
import axios from 'axios';
import CryptoJS from 'crypto-js';
import WebSocket from 'ws';

const BASE_URL = '${window.location.origin}';
const API_KEY = 'yf_live_master_key_2026';
const SECRET_KEY = 'yf_sec_master_secret_key_256';

async function connectAndTrade() {
  console.log("=== 1. JWT Authentication Exchange ===");
  const authResponse = await axios.post(\`\${BASE_URL}/api/auth\`, {
    apiKey: API_KEY,
    secret: SECRET_KEY
  });
  
  const token = authResponse.data.token;
  const botId = authResponse.data.bot_id;
  console.log(\`Authenticated Bot ID: \${botId}\`);
  console.log(\`Bearer Token: \${token.substring(0, 15)}...\`);

  console.log("\\n=== 2. Request Aggregator Quote ===");
  const quoteRes = await axios.get(\`\${BASE_URL}/api/quote\`, {
    headers: { Authorization: \`Bearer \${token}\` },
    params: {
      fromToken: 'ETH',
      toToken: 'USDC',
      amount: 10,
      chain: 'ethereum'
    }
  });
  console.log(\`Optimal Routing Protocol: \${quoteRes.data.bestRoute.protocol} (Price: \${quoteRes.data.bestRoute.price} USDC/ETH)\`);

  console.log("\\n=== 3. Execute Routed Swap ===");
  const swapRes = await axios.post(\`\${BASE_URL}/api/swap\`, {
    fromToken: 'ETH',
    toToken: 'USDC',
    amount: 10,
    chain: 'ethereum'
  }, {
    headers: { Authorization: \`Bearer \${token}\` }
  });
  console.log(\`Swap Completed! Tx Hash: \${swapRes.data.tx_hash}\`);
  console.log(\`Platform Fee Collected: \$\${swapRes.data.fee_collected_usd} USD\`);
  if (swapRes.data.cashback_paid_usd > 0) {
    console.log(\`🎉 Cashback Earned: \$\${swapRes.data.cashback_paid_usd} USD paid directly!\`);
  }

  console.log("\\n=== 4. Connect to Real-time WebSockets ===");
  const wsUrl = BASE_URL.replace(/^http/, 'ws');
  const ws = new WebSocket(wsUrl);

  ws.on('open', () => {
    console.log('WS Connection established. Authenticating...');
    ws.send(JSON.stringify({
      action: 'auth',
      token: token
    }));
  });

  ws.on('message', (data) => {
    const event = JSON.parse(data);
    console.log(\`[WS Frame] Type: \${event.type}\`, event.data || event.message);
    
    if (event.type === 'auth_success') {
      console.log('Subscribing to tick and trade feeds...');
      ws.send(JSON.stringify({ action: 'subscribe', topic: 'trade' }));
      ws.send(JSON.stringify({ action: 'subscribe', topic: 'market_tick' }));
    }
  });
}

connectAndTrade().catch(console.error);`;

  // Python Code Play snippet
  const pythonCodeSnippet = `# Python 3 - Institutional Trading Bot & Webhook Interface
import requests
import json
import asyncio
import websockets

BASE_URL = '${window.location.origin}'
API_KEY = 'yf_live_master_key_2026'
SECRET_KEY = 'yf_sec_master_secret_key_256'

def execute_rest_flow():
    print("=== 1. Authentication Exchange ===")
    auth_url = f"{BASE_URL}/api/auth"
    auth_payload = {"apiKey": API_KEY, "secret": SECRET_KEY}
    auth_res = requests.post(auth_url, json=auth_payload).json()
    
    token = auth_res["token"]
    bot_id = auth_res["bot_id"]
    print(f"Token Issued for Bot: {bot_id}\\n")

    headers = {"Authorization": f"Bearer {token}"}

    print("=== 2. Fetch Best Routing Quote ===")
    quote_url = f"{BASE_URL}/api/quote"
    params = {"fromToken": "ETH", "toToken": "USDC", "amount": 10, "chain": "ethereum"}
    quote_res = requests.get(quote_url, headers=headers, params=params).json()
    best_route = quote_res["bestRoute"]
    print(f"Best Route: {best_route['protocol']} (Est output: {best_route['received_amount']} USDC)\\n")

    print("=== 3. Execute Trade ===")
    swap_url = f"{BASE_URL}/api/swap"
    swap_payload = {"fromToken": "ETH", "toToken": "USDC", "amount": 10, "chain": "ethereum"}
    swap_res = requests.post(swap_url, headers=headers, json=swap_payload).json()
    print(f"Swap Executed! Transaction Hash: {swap_res['tx_hash']}")
    print(f"Total Transactions: {swap_res['total_transactions']}")
    print(f"Milestone Cashback Earned: \${swap_res['cashback_paid_usd']} USD\\n")

    return token

async def listen_to_ws_stream(token):
    print("=== 4. Launching Real-time Websocket Streamer ===")
    ws_url = BASE_URL.replace("http", "ws")
    
    async with websockets.connect(ws_url) as ws:
        # Await connection greeting
        greeting = await ws.recv()
        print(f"Server greeting: {greeting}")

        # Authenticate
        auth_msg = {"action": "auth", "token": token}
        await ws.send(json.dumps(auth_msg))

        # Await auth results
        auth_result = await ws.recv()
        print(f"Auth response: {auth_result}")

        # Subscribe to trades and cashback events
        await ws.send(json.dumps({"action": "subscribe", "topic": "trade"}))
        await ws.send(json.dumps({"action": "subscribe", "topic": "cashback"}))
        print("Subscribed! Listening to live tick streams...")

        # Monitor live ticks
        while True:
            try:
                msg = await ws.recv()
                event = json.loads(msg)
                print(f"🟢 [WS TICKER] Event {event['type']}: {json.dumps(event.get('data', event.get('message')))}")
            except Exception as e:
                print(f"Stream error: {e}")
                break

# Run synchronous REST then spawn asynchronous WS stream
if __name__ == '__main__':
    bearer_token = execute_rest_flow()
    try:
        asyncio.run(listen_to_ws_stream(bearer_token))
    except KeyboardInterrupt:
        print("Bot stream stopped.")`;


  return (
    <div id="api-layer-dashboard" className="bg-zinc-950/60 border border-zinc-900 rounded-lg p-6 space-y-8 backdrop-blur text-zinc-100">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-lime-400 animate-pulse"></span>
            <span className="text-[10px] text-lime-400 font-mono uppercase tracking-widest font-black">ACTIVE AGGREGATOR TUNNEL</span>
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-white mt-1">Bot API & Socket Gateway</h2>
          <p className="text-xs text-zinc-500 max-w-xl mt-1">
            Standard REST + authenticated WebSocket gateway. Enables programmatic execution, high-frequency rate feeds, IP whitelists, and autonomous cashback tracking.
          </p>
        </div>
        <div className="flex gap-2">
          <a 
            href="/api/docs/openapi.json" 
            target="_blank" 
            rel="noreferrer"
            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-300 rounded font-mono transition-all flex items-center gap-1.5"
          >
            <Code className="w-3.5 h-3.5" />
            openapi.json
          </a>
          <button 
            onClick={fetchApiKeys}
            className="px-3 py-1.5 bg-lime-400 hover:bg-lime-500 text-zinc-950 text-xs rounded font-bold transition-all flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reload Credentials
          </button>
        </div>
      </div>

      {/* Main Grid: Left column (Keys & Docs), Right column (WS Console & Playground) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: API Keys Provisioning (7 cols) */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Key Provisioner */}
          <div className="bg-zinc-950 border border-zinc-900/80 rounded p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-lime-400" />
              <h3 className="font-bold text-sm text-zinc-200 uppercase tracking-wide">Provision API Credentials</h3>
            </div>
            
            <form onSubmit={handleCreateKey} className="space-y-4">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase font-mono block mb-1">Bot Name / ID</label>
                <input 
                  type="text" 
                  value={newBotId}
                  onChange={(e) => setNewBotId(e.target.value)}
                  placeholder="e.g. quant-hedge-v4"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-xs text-zinc-200 font-mono focus:border-lime-400 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase font-mono block mb-1">
                  IP Whitelist (Comma Separated)
                </label>
                <input 
                  type="text" 
                  value={newIpWhitelist}
                  onChange={(e) => setNewIpWhitelist(e.target.value)}
                  placeholder="e.g. 12.34.56.78, 98.76.54.32"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-xs text-zinc-200 font-mono focus:border-lime-400 focus:outline-none"
                />
                <span className="text-[9px] text-zinc-600 block mt-1">
                  Use <code className="text-zinc-500 font-mono">0.0.0.0, ::</code> to disable restrictions and allow any host.
                </span>
              </div>
              <button
                type="submit"
                disabled={isCreatingKey}
                className="w-full bg-lime-400/10 hover:bg-lime-400 text-lime-400 hover:text-zinc-950 border border-lime-400/30 font-bold py-1.5 rounded text-xs transition-all flex items-center justify-center gap-2"
              >
                {isCreatingKey ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Shield className="w-3.5 h-3.5" />
                    Authorize New Credential
                  </>
                )}
              </button>
            </form>

            {/* Keys Display List */}
            <div className="border-t border-zinc-900 pt-4 space-y-3">
              <h4 className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider font-bold">Active Bots</h4>
              {loadingKeys ? (
                <div className="text-center py-4 text-xs text-zinc-600 font-mono">Querying directory...</div>
              ) : keys.length === 0 ? (
                <div className="text-center py-4 text-xs text-zinc-600 font-mono">No keys registered yet.</div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {keys.map((k) => (
                    <div key={k.apiKey} className="bg-zinc-900/40 border border-zinc-900 p-2.5 rounded flex items-center justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-200 block truncate">{k.botId}</span>
                          <span className="bg-lime-400/10 text-lime-400 border border-lime-400/10 text-[8px] font-mono px-1 rounded">60 req/m</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-[9px] text-zinc-500">
                          <span className="truncate">{k.apiKey}</span>
                          <span>•</span>
                          <span className="truncate">IP: {k.ipWhitelist.join(", ")}</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button 
                          onClick={() => handleCopyToClipboard(k.apiKey, k.apiKey)}
                          className="p-1 hover:bg-zinc-800 border border-zinc-800 rounded hover:border-zinc-700 text-zinc-400 hover:text-white transition-colors"
                          title="Copy API Key"
                        >
                          {copiedText === k.apiKey ? <Check className="w-3 h-3 text-lime-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                        <button 
                          onClick={() => handleRevokeKey(k.apiKey)}
                          className="p-1 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/20 rounded text-zinc-500 hover:text-red-400 transition-colors"
                          title="Revoke (Delete) Key"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Provisioned key result display (Displayed ONLY on creation for security) */}
          {provisionedKey && (
            <div className="bg-lime-950/20 border border-lime-400/20 p-4 rounded space-y-3 relative overflow-hidden">
              <div className="absolute right-0 top-0 w-24 h-24 bg-lime-400/5 rounded-full filter blur-xl"></div>
              <div className="flex items-center gap-2 text-lime-400">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <h4 className="text-xs font-bold uppercase tracking-wider">Credential Issued Successfully!</h4>
              </div>
              <p className="text-[11px] text-zinc-400">
                Copy your Secret Key now. For database security, <strong className="text-lime-400 font-bold">it cannot be recovered or displayed again</strong>.
              </p>
              
              <div className="space-y-2 bg-zinc-950 p-2.5 rounded border border-lime-950">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[9px] text-zinc-500 font-mono block">CLIENT_API_KEY</span>
                    <span className="text-xs text-lime-400 font-mono truncate block">{provisionedKey.apiKey}</span>
                  </div>
                  <button 
                    onClick={() => handleCopyToClipboard(provisionedKey.apiKey, "newKey")}
                    className="p-1 hover:bg-zinc-900 border border-zinc-800 rounded text-zinc-400"
                  >
                    {copiedText === "newKey" ? <Check className="w-3.5 h-3.5 text-lime-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-900">
                  <div className="min-w-0">
                    <span className="text-[9px] text-zinc-500 font-mono block">CLIENT_SECRET_KEY</span>
                    <span className="text-xs text-lime-400 font-mono truncate block">{provisionedKey.secret}</span>
                  </div>
                  <button 
                    onClick={() => handleCopyToClipboard(provisionedKey.secret, "newSecret")}
                    className="p-1 hover:bg-zinc-900 border border-zinc-800 rounded text-zinc-400"
                  >
                    {copiedText === "newSecret" ? <Check className="w-3.5 h-3.5 text-lime-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <button 
                onClick={() => setProvisionedKey(null)}
                className="text-[10px] text-zinc-500 hover:text-zinc-300 underline block"
              >
                Acknowledge & Hide
              </button>
            </div>
          )}

          {/* Interactive OpenAPI Spec Collapse list */}
          <div className="bg-zinc-950 border border-zinc-900/80 rounded p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-lime-400" />
                <h3 className="font-bold text-sm text-zinc-200 uppercase tracking-wide">REST Specifications</h3>
              </div>
              <span className="text-[9px] text-zinc-500 font-mono">v1.0 OpenAPI</span>
            </div>

            <div className="space-y-2">
              {specRoutes.map((spec) => (
                <div key={spec.path} className="border border-zinc-900 rounded overflow-hidden">
                  <button
                    onClick={() => setActiveSpecPath(activeSpecPath === spec.path ? "" : spec.path)}
                    className="w-full bg-zinc-900/40 hover:bg-zinc-900 px-3 py-2 text-left flex items-center justify-between gap-2 transition-all"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${
                        spec.method === "POST" ? "bg-amber-500/10 text-amber-500" : "bg-lime-400/10 text-lime-400"
                      }`}>{spec.method}</span>
                      <span className="text-xs font-mono font-bold text-zinc-200 truncate">{spec.path}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 truncate max-w-[150px]">{spec.summary}</span>
                  </button>

                  {activeSpecPath === spec.path && (
                    <div className="p-3 bg-zinc-950 border-t border-zinc-900 space-y-3 text-xs text-zinc-400">
                      <p className="leading-relaxed text-[11px]">{spec.desc}</p>
                      
                      {/* Headers */}
                      {spec.headers.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-wide block">Required Headers</span>
                          {spec.headers.map(h => (
                            <div key={h.name} className="flex justify-between items-center bg-zinc-900/60 p-1.5 rounded font-mono text-[10px]">
                              <span className="text-zinc-200 font-bold">{h.name}</span>
                              <span className="text-zinc-500">{h.desc}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Params */}
                      {spec.params.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-wide block">Query Parameters</span>
                          {spec.params.map(p => (
                            <div key={p.name} className="bg-zinc-900/60 p-1.5 rounded space-y-1">
                              <div className="flex justify-between text-[10px] font-mono">
                                <span className="text-zinc-200 font-bold">{p.name} {p.required && <span className="text-red-400">*</span>}</span>
                                <span className="text-zinc-500">{p.type}</span>
                              </div>
                              <span className="text-[10px] text-zinc-400 block">{p.desc}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Body schema */}
                      {spec.body && (
                        <div className="space-y-1">
                          <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-wide block">Request JSON Payload</span>
                          <pre className="bg-zinc-900 p-2 border border-zinc-900 rounded font-mono text-[10px] text-zinc-400 overflow-x-auto leading-relaxed">
                            {JSON.stringify(spec.body, null, 2)}
                          </pre>
                        </div>
                      )}

                      <button
                        onClick={() => handleEndpointSelect(spec.path, spec.method, spec.body || {})}
                        className="w-full bg-lime-400/5 hover:bg-lime-400/10 hover:text-lime-400 text-zinc-400 py-1.5 rounded border border-zinc-900 hover:border-lime-400/20 text-center font-bold text-[11px] transition-all"
                      >
                        Load Into REST Playground
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Side: Playground (POST/GET logs) + WS Logs Terminal (7 cols) */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Playground REST sandbox */}
          <div className="bg-zinc-950 border border-zinc-900/80 rounded p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-lime-400" />
                <h3 className="font-bold text-sm text-zinc-200 uppercase tracking-wide">REST Playground Sandbox</h3>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">Run HTTP Queries Live</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              
              {/* Selector and path inputs */}
              <div className="md:col-span-3">
                <label className="text-[9px] text-zinc-500 uppercase font-mono block mb-1">METHOD</label>
                <select
                  value={requestMethod}
                  onChange={(e) => setRequestMethod(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-lime-400"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                </select>
              </div>

              <div className="md:col-span-9">
                <label className="text-[9px] text-zinc-500 uppercase font-mono block mb-1">ENDPOINT PATH</label>
                <div className="relative">
                  <input
                    type="text"
                    value={selectedEndpoint}
                    onChange={(e) => setSelectedEndpoint(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-lime-400"
                  />
                  <button
                    onClick={executePlaygroundQuery}
                    disabled={apiRunning}
                    className="absolute right-1 top-1 bottom-1 px-3 bg-lime-400 text-zinc-950 text-xs font-bold rounded flex items-center gap-1 hover:bg-lime-500 transition-colors"
                  >
                    {apiRunning ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                    <span>Send</span>
                  </button>
                </div>
              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Header and Body Config Inputs */}
              <div className="space-y-3">
                <div>
                  <label className="text-[9px] text-zinc-500 uppercase font-mono block mb-1">Bearer Token (Authorization Header)</label>
                  <input
                    type="text"
                    value={customHeaderToken}
                    onChange={(e) => setCustomHeaderToken(e.target.value)}
                    placeholder="Paste JWT (Or authenticate below to auto-inject)"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-300 font-mono focus:outline-none focus:border-lime-400"
                  />
                </div>

                {requestMethod === "POST" && (
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase font-mono block mb-1">JSON Request Body</label>
                    <textarea
                      value={requestBody}
                      onChange={(e) => setRequestBody(e.target.value)}
                      rows={5}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded p-2.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-lime-400 leading-relaxed"
                    />
                  </div>
                )}
              </div>

              {/* Output terminal mockup */}
              <div className="bg-zinc-950 border border-zinc-900 rounded p-3 flex flex-col justify-between h-[180px] overflow-hidden">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-1.5 mb-2">
                  <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-wider">RESPONSE CONSOLE</span>
                  <div className="flex items-center gap-2 font-mono text-[10px]">
                    {apiResponse.status !== null && (
                      <span className={`px-1.5 rounded font-bold ${
                        apiResponse.status < 300 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                      }`}>
                        HTTP {apiResponse.status}
                      </span>
                    )}
                    {apiResponse.timeMs !== null && (
                      <span className="text-zinc-500">{apiResponse.timeMs}ms</span>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto text-[11px] font-mono leading-normal text-zinc-400 space-y-2 pr-1 select-text">
                  {apiResponse.body === null ? (
                    <div className="text-zinc-600 italic py-6 text-center">Execute a request above to view telemetry payload.</div>
                  ) : (
                    <pre className="whitespace-pre overflow-x-auto text-lime-400">{JSON.stringify(apiResponse.body, null, 2)}</pre>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* WebSocket real-time logger panel */}
          <div className="bg-zinc-950 border border-zinc-900/80 rounded p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-900 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-lime-400" />
                <h3 className="font-bold text-sm text-zinc-200 uppercase tracking-wide">Websocket Telemetry Feed</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  wsStatus === "CONNECTED" ? "bg-lime-400 animate-pulse" : wsStatus === "CONNECTING" ? "bg-amber-400" : "bg-zinc-700"
                }`}></span>
                <span className="text-[10px] font-mono text-zinc-400 mr-2">{wsStatus}</span>
                
                {wsStatus === "DISCONNECTED" ? (
                  <button 
                    onClick={connectWebSocket}
                    className="px-3 py-1 bg-lime-400 text-zinc-950 text-xs font-bold rounded hover:bg-lime-500 transition-all"
                  >
                    Connect
                  </button>
                ) : (
                  <button 
                    onClick={disconnectWebSocket}
                    className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 text-xs font-bold rounded transition-all"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </div>

            {/* Socket Auth / Quick Action Bar */}
            {wsStatus === "CONNECTED" && (
              <div className="bg-zinc-900/30 p-3 rounded border border-zinc-900/80 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-8 flex flex-col gap-1">
                  <span className="text-[8px] text-zinc-500 font-mono uppercase tracking-wider block">SOCKET AUTHENTICATION CONTROL</span>
                  <div className="flex gap-2">
                    <select
                      value={wsAuthMethod}
                      onChange={(e) => setWsAuthMethod(e.target.value as any)}
                      className="bg-zinc-900 border border-zinc-800 rounded px-2 text-xs text-zinc-300 font-mono focus:outline-none"
                    >
                      <option value="key">API Key</option>
                      <option value="token">JWT Token</option>
                    </select>

                    {wsAuthMethod === "key" ? (
                      <input 
                        type="text" 
                        value={wsApiKey}
                        onChange={(e) => setWsApiKey(e.target.value)}
                        placeholder="Key"
                        className="bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-300 font-mono focus:outline-none min-w-0 flex-1"
                      />
                    ) : (
                      <input 
                        type="text" 
                        value={wsAuthToken}
                        onChange={(e) => setWsAuthToken(e.target.value)}
                        placeholder="Paste JWT Token"
                        className="bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-300 font-mono focus:outline-none min-w-0 flex-1"
                      />
                    )}
                  </div>
                </div>

                <div className="md:col-span-4">
                  <button
                    onClick={sendWsAuth}
                    className="w-full bg-lime-400/10 hover:bg-lime-400 text-lime-400 hover:text-zinc-950 border border-lime-400/20 hover:border-lime-400 font-bold py-1.5 rounded text-xs transition-all text-center"
                  >
                    Send WS Auth
                  </button>
                </div>
              </div>
            )}

            {/* Live Scrolling Terminal Window */}
            <div className="bg-zinc-950 border border-zinc-900 rounded p-4 h-[240px] flex flex-col justify-between overflow-hidden">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-1.5 mb-2">
                <span className="text-[9px] text-zinc-500 font-mono font-bold uppercase tracking-wider">LIVE TERMINAL INTERFACE</span>
                <button 
                  onClick={() => setWsLogs([])}
                  className="text-[9px] text-zinc-600 hover:text-zinc-400 underline font-mono"
                >
                  Clear console
                </button>
              </div>

              <div className="flex-1 overflow-y-auto font-mono text-[10px] space-y-2 pr-1 select-text">
                {wsLogs.length === 0 ? (
                  <div className="text-zinc-600 italic py-12 text-center">
                    {wsStatus === "CONNECTED" 
                      ? "Connected! Waiting for auth action to bind ticker feeds." 
                      : "WebSocket is disconnected. Connect above to stream realtime logs."}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {wsLogs.map((log) => {
                      let tagColor = "text-zinc-400 bg-zinc-900/80";
                      if (log.type === "system") tagColor = "text-amber-400 bg-amber-400/5";
                      else if (log.type === "auth_success") tagColor = "text-lime-400 bg-lime-400/10 border-lime-400/15 border";
                      else if (log.type === "auth_error" || log.type === "error") tagColor = "text-red-400 bg-red-400/5";
                      else if (log.type === "market_tick") tagColor = "text-cyan-400 bg-cyan-400/5";
                      else if (log.type === "trade") tagColor = "text-purple-400 bg-purple-400/5";
                      else if (log.type === "cashback" || log.type === "milestone") tagColor = "text-pink-400 bg-pink-400/5 border border-pink-400/10";

                      return (
                        <div key={log.id} className="flex gap-2 items-start leading-relaxed hover:bg-zinc-900/20 p-1 rounded transition-colors">
                          <span className="text-zinc-600 shrink-0 font-light">{log.time}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase font-bold shrink-0 ${tagColor}`}>
                            {log.direction === "OUT" ? "→ OUT:" : "← IN:"} {log.type}
                          </span>
                          <pre className="text-zinc-300 break-all whitespace-pre-wrap flex-1">{JSON.stringify(log.payload, null, 2)}</pre>
                        </div>
                      );
                    })}
                    <div ref={logsEndRef}></div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Subscription Control Chips */}
            {wsStatus === "CONNECTED" && (
              <div className="flex flex-wrap gap-2 items-center text-xs">
                <span className="text-[10px] font-mono text-zinc-500 uppercase font-bold">Quick Subscribe:</span>
                <button 
                  onClick={() => sendWsSubscribe("market_tick")}
                  className="px-2.5 py-1 bg-zinc-900 hover:bg-cyan-500/10 border border-zinc-800 hover:border-cyan-500/30 font-mono text-[10px] text-zinc-400 hover:text-cyan-400 rounded-sm transition-colors"
                >
                  + market_tick
                </button>
                <button 
                  onClick={() => sendWsSubscribe("trade")}
                  className="px-2.5 py-1 bg-zinc-900 hover:bg-purple-500/10 border border-zinc-800 hover:border-purple-500/30 font-mono text-[10px] text-zinc-400 hover:text-purple-400 rounded-sm transition-colors"
                >
                  + trade
                </button>
                <button 
                  onClick={() => sendWsSubscribe("cashback")}
                  className="px-2.5 py-1 bg-zinc-900 hover:bg-pink-500/10 border border-zinc-800 hover:border-pink-500/30 font-mono text-[10px] text-zinc-400 hover:text-pink-400 rounded-sm transition-colors"
                >
                  + cashback
                </button>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Full Width Section: SDK Examples & Boilerplates */}
      <div className="border-t border-zinc-900 pt-8 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code className="w-5 h-5 text-lime-400" />
            <h3 className="font-bold text-sm text-zinc-200 uppercase tracking-wide">Developer SDK Boilerplates</h3>
          </div>
          <div className="flex gap-1.5 bg-zinc-900/60 border border-zinc-900 p-1 rounded-sm">
            <button
              onClick={() => setSdkTab("js")}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-sm transition-all ${
                sdkTab === "js" ? "bg-lime-400 text-zinc-950" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Javascript (NodeJS)
            </button>
            <button
              onClick={() => setSdkTab("python")}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-sm transition-all ${
                sdkTab === "python" ? "bg-lime-400 text-zinc-950" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Python 3.x
            </button>
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 rounded p-4 relative overflow-hidden">
          <div className="absolute right-4 top-4 z-10 flex gap-2">
            <button
              onClick={() => handleCopyToClipboard(sdkTab === "js" ? jsCodeSnippet : pythonCodeSnippet, "sdk")}
              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-300 font-mono rounded flex items-center gap-1.5 transition-colors"
            >
              {copiedText === "sdk" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-lime-400" />
                  Copied Boilerplate!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy Snippet
                </>
              )}
            </button>
          </div>

          <pre className="text-xs text-zinc-400 font-mono leading-relaxed overflow-x-auto max-h-[420px] select-text bg-zinc-950/40 p-4 rounded mt-2">
            {sdkTab === "js" ? jsCodeSnippet : pythonCodeSnippet}
          </pre>
        </div>
      </div>

    </div>
  );
}
