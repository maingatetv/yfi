import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  TrendingUp, 
  RefreshCw, 
  Coins, 
  Terminal, 
  Copy, 
  Check, 
  AlertCircle, 
  Loader2, 
  ArrowRight,
  Database,
  Code,
  Layers,
  ExternalLink,
  ShieldAlert,
  HelpCircle,
  Activity,
  Globe
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ProtocolTVL {
  name: string;
  chain: string;
  tvl: number;
  category?: string;
}

interface TVLData {
  total_tvl_usd: number;
  protocols: ProtocolTVL[];
}

interface YieldPool {
  pool: string;
  project: string;
  chain: string;
  tvlUsd: number;
  apy: number;
  symbol: string;
}

export default function Dashboard() {
  const [tvlData, setTvlData] = useState<TVLData | null>(null);
  const [yields, setYields] = useState<YieldPool[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<"curl" | "js" | "axios">("curl");

  // Fetch all live data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tvlRes, yieldsRes] = await Promise.all([
        axios.get("/api/tvl"),
        axios.get("/api/yields")
      ]);

      setTvlData(tvlRes.data);
      setYields(Array.isArray(yieldsRes.data) ? yieldsRes.data : []);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error("Error fetching Dashboard data:", err);
      setError(err?.response?.data?.error || "Failed to establish a secure connection with YieldFi nodes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto refresh every 60 seconds
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const getRelativeTime = () => {
    if (!lastUpdated) return "Never updated";
    const seconds = Math.floor((new Date().getTime() - lastUpdated.getTime()) / 1000);
    if (seconds < 10) return "Just now";
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  // Helper for DefiLlama protocol icon
  const getProtocolLogo = (project: string) => {
    const slug = project.toLowerCase().trim().replace(/\s+/g, "-");
    return `https://icons.llamao.fi/icons/protocols/${slug}`;
  };

  const curlCode = `curl -X POST "https://yieldfi.router/api/execute" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_YIELDFI_API_KEY" \\
  -d '{
    "fromToken": "0xC02aaA39b223FE8D0A0e5C4F27ead9083C756Cc2",
    "toToken": "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
    "amount": "1000000000000000000",
    "chain": "ethereum",
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    "slippage": 1.0
  }'`;

  const jsCode = `const payload = {
  fromToken: "0xC02aaA39b223FE8D0A0e5C4F27ead9083C756Cc2", // WETH
  toToken: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",   // stETH
  amount: "1000000000000000000",                          // 1.0 ETH
  chain: "ethereum",
  walletAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  slippage: 1.0
};

fetch("https://yieldfi.router/api/execute", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "YOUR_YIELDFI_API_KEY"
  },
  body: JSON.stringify(payload)
})
.then(res => res.json())
.then(data => console.log("Unsigned Tx Data:", data))
.catch(err => console.error("Error routing tx:", err));`;

  const axiosCode = `import axios from "axios";

const payload = {
  fromToken: "0xC02aaA39b223FE8D0A0e5C4F27ead9083C756Cc2",
  toToken: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
  amount: "1000000000000000000",
  chain: "ethereum",
  walletAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  slippage: 1.0
};

axios.post("https://yieldfi.router/api/execute", payload, {
  headers: {
    "x-api-key": "YOUR_YIELDFI_API_KEY"
  }
})
.then(res => console.log("Unsigned Tx Data:", res.data))
.catch(err => console.error("Error routing tx:", err));`;

  const activeCode = 
    activeCodeTab === "curl" ? curlCode : 
    activeCodeTab === "js" ? jsCode : axiosCode;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 font-sans antialiased selection:bg-lime-500 selection:text-zinc-950" id="yieldfi-dashboard">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* UPPER META INFORMATION AND BRAND BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-mono font-black bg-lime-500/10 text-lime-400 border border-lime-500/20 uppercase tracking-widest rounded-none">
                PRODUCTION LIVE v2.4
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-white font-mono">
              YIELDFI <span className="text-lime-400 font-sans font-normal lowercase italic text-2xl">router</span>
            </h1>
            <p className="text-xs text-zinc-400">
              Institutional real-world asset (RWA) liquidity routing through secure 1inch and DefiLlama networks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider">Node Telemetry</p>
              <p className="text-xs font-mono text-zinc-300">
                Synced: <span className="text-lime-400 font-bold">{lastUpdated ? getRelativeTime() : "connecting..."}</span>
              </p>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-all text-zinc-400 hover:text-white disabled:opacity-50 flex items-center justify-center cursor-pointer rounded-none"
              title="Refresh Telemetry"
              id="refresh-btn"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-lime-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* EXPLICIT ERROR BANNER */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-red-950/40 border border-red-500/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-none"
              id="error-banner"
            >
              <div className="flex items-start sm:items-center gap-3">
                <ShieldAlert className="h-5 w-5 text-red-400 shrink-0 mt-0.5 sm:mt-0" />
                <div className="space-y-0.5">
                  <p className="text-xs font-mono uppercase text-red-400 font-bold tracking-widest">Connection Interrupted</p>
                  <p className="text-xs text-zinc-300">{error}</p>
                </div>
              </div>
              <button
                onClick={fetchData}
                className="px-3 py-1.5 text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 font-mono font-bold uppercase tracking-widest cursor-pointer rounded-none self-end sm:self-auto"
              >
                Reconnect
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* HERO TVL METRICS HEADER */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 p-6 relative overflow-hidden rounded-none" id="metric-tvl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-lime-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="space-y-2">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block font-bold">
                SYSTEM TOTAL VALUE ROUTED
              </span>
              {loading && !tvlData ? (
                <div className="h-8 w-48 bg-zinc-800 animate-pulse rounded-none" />
              ) : (
                <h3 className="text-3xl md:text-4xl font-mono font-black text-white">
                  ${(tvlData?.total_tvl_usd ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
              )}
              <p className="text-[11px] text-zinc-400">
                Cumulative capital routing liquidity synced from 1inch aggregator & real RWA protocols.
              </p>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 relative overflow-hidden rounded-none" id="metric-institutional">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="space-y-2">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block font-bold">
                INSTITUTIONAL ALLOCATIONS (90%)
              </span>
              {loading && !tvlData ? (
                <div className="h-8 w-48 bg-zinc-800 animate-pulse rounded-none" />
              ) : (
                <h3 className="text-3xl md:text-4xl font-mono font-black text-lime-400">
                  ${((tvlData?.total_tvl_usd ?? 0) * 0.9).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
              )}
              <p className="text-[11px] text-zinc-400">
                Sovereign treasury bonds, secure tokenized commercial loans, and institutional-grade vaults.
              </p>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 relative overflow-hidden rounded-none" id="metric-retail">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="space-y-2">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block font-bold">
                RETAIL LIQUIDITY SWAPS (10%)
              </span>
              {loading && !tvlData ? (
                <div className="h-8 w-48 bg-zinc-800 animate-pulse rounded-none" />
              ) : (
                <h3 className="text-3xl md:text-4xl font-mono font-black text-zinc-300">
                  ${((tvlData?.total_tvl_usd ?? 0) * 0.1).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
              )}
              <p className="text-[11px] text-zinc-400">
                Direct client-side multi-chain routing from smart-contracts and programmatic algorithmic wallets.
              </p>
            </div>
          </div>
        </div>

        {/* MAIN DATA MODULE PANELS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT PANEL: ACTIVE YIELD PROTOCOLS (api/yields) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-lime-400" />
                <h2 className="text-md font-mono font-bold uppercase tracking-wider text-white">
                  Institutional Yield Pools
                </h2>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">Live from DefiLlama</span>
            </div>

            {loading && yields.length === 0 ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 bg-zinc-900/50 border border-zinc-800 animate-pulse rounded-none flex items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-zinc-800 rounded-full" />
                      <div className="space-y-1.5">
                        <div className="h-3 w-28 bg-zinc-800" />
                        <div className="h-2 w-16 bg-zinc-800" />
                      </div>
                    </div>
                    <div className="h-4 w-12 bg-zinc-800" />
                  </div>
                ))}
              </div>
            ) : yields.length === 0 ? (
              <div className="p-12 text-center border border-zinc-800 bg-zinc-900/30">
                <AlertCircle className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-zinc-400 font-mono text-xs uppercase tracking-wider">No Active Pools Found</p>
                <p className="text-[11px] text-zinc-600 mt-1">Please try refreshing the connection above.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {yields.map((pool, idx) => (
                  <motion.div
                    key={pool.pool || idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 transition-all p-4 flex flex-col justify-between h-36 relative overflow-hidden rounded-none group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={getProtocolLogo(pool.project)}
                          alt={pool.project}
                          className="w-8 h-8 rounded-full border border-zinc-800 bg-zinc-950 object-contain"
                          onError={(e) => {
                            // Fallback to text initials
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(pool.project)}&background=1c1917&color=a3e635&bold=true`;
                          }}
                        />
                        <div>
                          <h4 className="text-xs font-mono font-black uppercase text-white group-hover:text-lime-400 transition-colors">
                            {pool.project}
                          </h4>
                          <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                            {pool.symbol}
                          </p>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 text-[9px] font-mono bg-zinc-950 text-zinc-400 border border-zinc-800 rounded-none uppercase">
                        {pool.chain}
                      </span>
                    </div>

                    <div className="flex items-end justify-between border-t border-zinc-800 pt-3">
                      <div>
                        <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">TVL</span>
                        <span className="text-xs font-mono text-zinc-300">
                          {pool.tvlUsd ? `$${Number(pool.tvlUsd).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "N/A"}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">APY</span>
                        <span className="text-md font-mono font-black text-lime-400">
                          {Number(pool.apy).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT PANEL: CORE PROTOCOL LIST (api/tvl protocols list) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-lime-400" />
                <h2 className="text-md font-mono font-bold uppercase tracking-wider text-white">
                  RWA Protocols TVL
                </h2>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">Live Sync</span>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-none overflow-hidden">
              {loading && !tvlData ? (
                <div className="divide-y divide-zinc-800">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="p-4 flex items-center justify-between animate-pulse">
                      <div className="space-y-1.5">
                        <div className="h-3 w-24 bg-zinc-800" />
                        <div className="h-2 w-12 bg-zinc-800" />
                      </div>
                      <div className="h-3 w-16 bg-zinc-800" />
                    </div>
                  ))}
                </div>
              ) : !tvlData || tvlData.protocols.length === 0 ? (
                <div className="p-12 text-center text-zinc-500">
                  <AlertCircle className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                  <p className="text-xs font-mono uppercase tracking-widest">No Protocol TVL Data Loaded</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800 max-h-[580px] overflow-y-auto custom-scrollbar">
                  {tvlData.protocols.map((p, idx) => (
                    <div 
                      key={idx}
                      className="p-4 flex items-center justify-between hover:bg-zinc-800/40 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-mono font-bold uppercase text-white">
                          {p.name}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-zinc-400">
                            {p.chain}
                          </span>
                          {p.category && (
                            <>
                              <span className="text-zinc-600 text-[10px]">•</span>
                              <span className="text-[9px] font-mono text-lime-400 uppercase tracking-widest">
                                {p.category}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-mono font-black text-white">
                          ${Number(p.tvl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Total Value</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* DEVELOPER PLAYGROUND: HOW TO INTEGRATE /api/execute */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-none space-y-6" id="dev-playground">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Terminal className="h-4.5 w-4.5 text-lime-400" />
                <h3 className="text-md font-mono font-bold uppercase text-white">
                  How to call POST /api/execute
                </h3>
              </div>
              <p className="text-xs text-zinc-400">
                Integrate institutional 1-click execution directly in your own dApps or automated trading bots.
              </p>
            </div>

            <div className="flex bg-zinc-950 p-1 border border-zinc-800 rounded-none self-start sm:self-auto">
              <button
                onClick={() => setActiveCodeTab("curl")}
                className={`px-3 py-1 text-xs font-mono font-bold uppercase transition-all rounded-none ${
                  activeCodeTab === "curl" ? "bg-lime-500 text-zinc-950" : "text-zinc-400 hover:text-white"
                }`}
              >
                cURL
              </button>
              <button
                onClick={() => setActiveCodeTab("js")}
                className={`px-3 py-1 text-xs font-mono font-bold uppercase transition-all rounded-none border-l border-zinc-800 ${
                  activeCodeTab === "js" ? "bg-lime-500 text-zinc-950" : "text-zinc-400 hover:text-white"
                }`}
              >
                Fetch
              </button>
              <button
                onClick={() => setActiveCodeTab("axios")}
                className={`px-3 py-1 text-xs font-mono font-bold uppercase transition-all rounded-none border-l border-zinc-800 ${
                  activeCodeTab === "axios" ? "bg-lime-500 text-zinc-950" : "text-zinc-400 hover:text-white"
                }`}
              >
                Axios
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT: Payload Schema Details */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-none space-y-3">
                <h4 className="text-xs font-mono font-black uppercase text-lime-400 border-b border-zinc-800 pb-1.5">
                  Request Parameters
                </h4>
                
                <div className="space-y-3 max-h-[220px] overflow-y-auto custom-scrollbar text-xs">
                  <div>
                    <span className="font-mono text-zinc-300 font-bold">fromToken</span>
                    <span className="text-[10px] text-zinc-500 ml-1">string (required)</span>
                    <p className="text-[11px] text-zinc-400">Checksummed source token smart contract address.</p>
                  </div>
                  <div>
                    <span className="font-mono text-zinc-300 font-bold">toToken</span>
                    <span className="text-[10px] text-zinc-500 ml-1">string (required)</span>
                    <p className="text-[11px] text-zinc-400">Checksummed destination token smart contract address.</p>
                  </div>
                  <div>
                    <span className="font-mono text-zinc-300 font-bold">amount</span>
                    <span className="text-[10px] text-zinc-500 ml-1">string (required)</span>
                    <p className="text-[11px] text-zinc-400">Raw amount in source token minimal unit (e.g. 10^18 for ETH).</p>
                  </div>
                  <div>
                    <span className="font-mono text-zinc-300 font-bold">chain</span>
                    <span className="text-[10px] text-zinc-500 ml-1">string (required)</span>
                    <p className="text-[11px] text-zinc-400">Chain name (e.g., 'ethereum', 'polygon', 'arbitrum', 'base').</p>
                  </div>
                  <div>
                    <span className="font-mono text-zinc-300 font-bold">walletAddress</span>
                    <span className="text-[10px] text-zinc-500 ml-1">string (required)</span>
                    <p className="text-[11px] text-zinc-400">Address that will receive and sign the generated tx payload.</p>
                  </div>
                  <div>
                    <span className="font-mono text-zinc-300 font-bold">slippage</span>
                    <span className="text-[10px] text-zinc-500 ml-1">number (optional)</span>
                    <p className="text-[11px] text-zinc-400">Percentage slippage tolerance. Defaults to 1.0 (1.0%).</p>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Live Code Block */}
            <div className="lg:col-span-8 flex flex-col h-full bg-zinc-950 border border-zinc-800 rounded-none relative">
              <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/60">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                  Code Sandbox Playground
                </span>
                <button
                  onClick={() => handleCopy(activeCode, "execute-payload")}
                  className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all rounded-none flex items-center gap-1 text-[11px] font-mono cursor-pointer"
                >
                  {copiedSection === "execute-payload" ? (
                    <>
                      <Check className="h-3 w-3 text-lime-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy Code
                    </>
                  )}
                </button>
              </div>

              <div className="p-4 flex-grow overflow-x-auto text-xs font-mono text-lime-300 leading-relaxed bg-zinc-950">
                <pre>{activeCode}</pre>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
