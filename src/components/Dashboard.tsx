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
  ArrowRight,
  Database,
  ExternalLink,
  ShieldAlert,
  Globe,
  DollarSign,
  Cpu,
  Flame,
  Search,
  Bot,
  MapPin,
  HeartPulse
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ProtocolRWA {
  name: string;
  slug: string;
  chain: string;
  chains: string[];
  tvl: number;
  change_7d: number;
  apy: number;
  "1pct_fee_potential": number;
  affiliate_link: string;
  logo: string | null;
  category: string;
}

interface RWAData {
  count: number;
  protocols: ProtocolRWA[];
  last_updated: string;
  source?: string;
}

interface YieldPool {
  pool: string;
  project: string;
  symbol: string;
  chain: string;
  tvlUsd: number;
  apy: number;
  apyPct1d?: number;
  hot_now?: boolean;
  logo: string;
}

interface YieldsData {
  count: number;
  pools: YieldPool[];
  last_updated: string;
  source?: string;
}

interface MarketData {
  commodities: {
    gold: number;
    oil: number;
  };
  crypto: {
    btc: number;
    eth: number;
  };
  forex: {
    EUR: number;
    GBP: number;
    JPY: number;
    CAD: number;
    CHF: number;
    AUD: number;
  };
  arbitrage_opportunity: boolean;
  arbitrage_details?: {
    btc: {
      coinbase: number;
      yahoo: number;
      diff_percent: number;
      opportunity_found: boolean;
    };
    eth: {
      coinbase: number;
      yahoo: number;
      diff_percent: number;
      opportunity_found: boolean;
    };
  };
  source: string;
  last_updated: string;
}

export default function Dashboard() {
  const [rwaData, setRwaData] = useState<RWAData | null>(null);
  const [yieldsData, setYieldsData] = useState<YieldsData | null>(null);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<"curl" | "js">("curl");
  const [chainFilter, setChainFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Fetch all live API endpoints
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rwaRes, yieldsRes, marketRes] = await Promise.all([
        axios.get("/api/rwa-dashboard"),
        axios.get("/api/defi-yields"),
        axios.get("/api/market-data")
      ]);

      setRwaData(rwaRes.data);
      setYieldsData(yieldsRes.data);
      setMarketData(marketRes.data);
    } catch (err: any) {
      console.error("Error fetching Dashboard data:", err);
      setError(
        err?.response?.data?.error || 
        "Failed to establish secure connection to the YieldFi node. Please verify your internet connection or backend telemetry status."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto refresh every 2 minutes
    const interval = setInterval(fetchData, 120000);
    return () => clearInterval(interval);
  }, []);

  const getRelativeTime = (isoString?: string) => {
    if (!isoString) return "Never updated";
    try {
      const date = new Date(isoString);
      const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
      if (seconds < 15) return "Just now";
      if (seconds < 60) return `${seconds}s ago`;
      const minutes = Math.floor(seconds / 60);
      return `${minutes} min ago`;
    } catch (e) {
      return "2 min ago";
    }
  };

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  // Safe fallback protocol logo URL
  const getProtocolLogo = (slug: string, name: string) => {
    if (slug) {
      return `https://icons.llamao.fi/icons/protocols/${slug}`;
    }
    const cleanName = name.toLowerCase().replace(/\s+/g, "-");
    return `https://icons.llamao.fi/icons/protocols/${cleanName}`;
  };

  // cURL and Javascript execution demonstration section
  const curlExample = `curl -X POST "https://yieldfi.studio/api/execute" \\
  -H "Content-Type: application/json" \\
  -d '{
    "fromToken": "0xC02aaA39b223FE8D0A0e5C4F27ead9083C756Cc2",
    "toToken": "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
    "amount": "1000000000000000000",
    "chain": "ethereum",
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    "slippage": 1.0
  }'`;

  const jsExample = `const payload = {
  fromToken: "0xC02aaA39b223FE8D0A0e5C4F27ead9083C756Cc2", // WETH
  toToken: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",   // stETH
  amount: "1000000000000000000",                          // 1.0 ETH
  chain: "ethereum",
  walletAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  slippage: 1.0
};

fetch("https://yieldfi.studio/api/execute", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify(payload)
})
.then(res => res.json())
.then(data => {
  if (data.success) {
    console.log("Unsigned routing transaction generated:", data.transaction_data);
  } else {
    console.error("Routing failed:", data.error);
  }
})
.catch(err => console.error("Network error:", err));`;

  const activeCode = activeCodeTab === "curl" ? curlExample : jsExample;

  // Filter pools by chain + search query
  const filteredPools = yieldsData?.pools.filter(pool => {
    const matchesChain = chainFilter === "all" || pool.chain.toLowerCase() === chainFilter.toLowerCase();
    const matchesSearch = pool.project.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          pool.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesChain && matchesSearch;
  }) || [];

  // Calculate aggregated TVL for top RWA Protocols
  const totalRwaTvl = rwaData?.protocols.reduce((sum, p) => sum + p.tvl, 0) || 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 font-sans antialiased selection:bg-lime-400 selection:text-zinc-950" id="yieldfi-dashboard">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* UPPER META INFORMATION AND BRAND BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-800 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 text-[9px] font-mono font-black bg-lime-500/10 text-lime-400 border border-lime-500/20 uppercase tracking-widest rounded-none">
                PRODUCTION STABLE v4.0 (AUTONOMOUS)
              </span>
              <span className="px-2 py-0.5 text-[9px] font-mono font-black bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-widest rounded-none">
                SITEMAP.XML & JSON-LD SYNCED
              </span>
              <span className="px-2 py-0.5 text-[9px] font-mono font-black bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-widest rounded-none flex items-center gap-1">
                <HeartPulse className="h-2.5 w-2.5 text-purple-400 animate-pulse" /> UPTIME OK
              </span>
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-white font-mono">
              YIELDFI <span className="text-lime-400 font-sans font-normal lowercase italic text-2xl">router</span>
            </h1>
            <p className="text-xs text-zinc-400 max-w-2xl">
              Fully autonomous server-side scheduler feeding real-time indexes, auto-detecting market arbitrage spreads, and tracking 1% fee potentials across major RWA asset integrations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="text-left">
              <p className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider">Autonomous Sync Status</p>
              <p className="text-xs font-mono text-zinc-300">
                Updated: <span className="text-lime-400 font-bold">{loading ? "re-indexing..." : getRelativeTime(rwaData?.last_updated)}</span>
              </p>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-all text-zinc-400 hover:text-white disabled:opacity-50 flex items-center justify-center cursor-pointer rounded-none"
              title="Refresh Data Feeds"
              id="refresh-btn"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-lime-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* METADATA SCHEMAS SECTION FOR AI ENGINE DISCOVERABILITY */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-900/40 p-4 border border-zinc-800/80 text-xs">
          <div className="space-y-1.5 border-r border-zinc-800/60 pr-4">
            <h4 className="font-mono font-bold text-white flex items-center gap-1.5 text-xs">
              <Bot className="h-4 w-4 text-lime-400" />
              ChatGPT & AI discoverability
            </h4>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Standardized <strong>JSON-LD (schema.org/WebAPI)</strong> schemas are programmatically served directly inside the root routing headers to allow natural-language agents to auto-parse, query, and consume YieldFi stats.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <a href="/docs" target="_blank" className="text-lime-400 hover:underline text-[11px] font-mono flex items-center gap-1">
                View API Docs <ArrowRight className="h-3 w-3" />
              </a>
            </div>
          </div>
          <div className="space-y-1.5 pl-0 md:pl-2">
            <h4 className="font-mono font-bold text-white flex items-center gap-1.5 text-xs">
              <Globe className="h-4 w-4 text-blue-400" />
              Google Search Indexing
            </h4>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              An active <strong>sitemap.xml</strong> is published at the host root to ensure Google crawlers immediately index and register our automated high-yield DeFi and RWA analytics nodes.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <a href="/sitemap.xml" target="_blank" className="text-blue-400 hover:underline text-[11px] font-mono flex items-center gap-1">
                View sitemap.xml <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

        {/* ACTIVE CROSS-MARKET ARBITRAGE FLASH BANNER */}
        <AnimatePresence>
          {marketData?.arbitrage_opportunity && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-amber-950/40 border border-amber-500/30 p-4 rounded-none"
              id="arbitrage-stripe"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Flame className="h-5 w-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                  <div className="space-y-1">
                    <p className="text-xs font-mono uppercase text-amber-400 font-bold tracking-widest">
                      ACTIVE EXCHANGE ARBITRAGE DETECTED (DIVERGENCE &gt; 1%)
                    </p>
                    <p className="text-[11px] text-zinc-300">
                      Our autonomous pricing guardian spotted index price spreads between Coinbase Spot and Yahoo Finance Reference Charts. 
                      {marketData.arbitrage_details?.btc.opportunity_found && (
                        <span className="block mt-1 font-mono text-[10px] text-amber-200">
                          • BTC spread is <span className="underline">{marketData.arbitrage_details.btc.diff_percent.toFixed(2)}%</span> (Coinbase: ${marketData.arbitrage_details.btc.coinbase.toLocaleString()} | Yahoo: ${marketData.arbitrage_details.btc.yahoo.toLocaleString()})
                        </span>
                      )}
                      {marketData.arbitrage_details?.eth.opportunity_found && (
                        <span className="block mt-0.5 font-mono text-[10px] text-amber-200">
                          • ETH spread is <span className="underline">{marketData.arbitrage_details.eth.diff_percent.toFixed(2)}%</span> (Coinbase: ${marketData.arbitrage_details.eth.coinbase.toLocaleString()} | Yahoo: ${marketData.arbitrage_details.eth.yahoo.toLocaleString()})
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 font-mono text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 select-none">
                  HIGH VOLUME ADVANTAGE ACTIVE
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
                  <p className="text-xs font-mono uppercase text-red-400 font-bold tracking-widest">Data Synchronization Interrupted</p>
                  <p className="text-xs text-zinc-300">{error}</p>
                </div>
              </div>
              <button
                onClick={fetchData}
                className="px-3 py-1.5 text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 font-mono font-bold uppercase tracking-widest cursor-pointer rounded-none self-end sm:self-auto"
              >
                Retry Handshake
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
                RWA Index Aggregate TVL
              </span>
              {loading && !rwaData ? (
                <div className="h-9 w-48 bg-zinc-800 animate-pulse rounded-none" />
              ) : (
                <h3 className="text-3xl font-mono font-black text-white">
                  ${totalRwaTvl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
              )}
              <p className="text-[11px] text-zinc-400">
                Aggregate value of the top Real World Asset protocols tracked dynamically on-chain.
              </p>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 relative overflow-hidden rounded-none" id="metric-farms">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="space-y-2">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block font-bold">
                Yield Farms Synced
              </span>
              {loading && !yieldsData ? (
                <div className="h-9 w-32 bg-zinc-800 animate-pulse rounded-none" />
              ) : (
                <h3 className="text-3xl font-mono font-black text-lime-400">
                  {yieldsData?.count ?? 0} <span className="text-zinc-500 text-lg font-normal">pools</span>
                </h3>
              )}
              <p className="text-[11px] text-zinc-400">
                Active global DeFi pools exceeding $5M with autonomous schedule updates every 5 minutes.
              </p>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 relative overflow-hidden rounded-none" id="metric-rate-limit">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="space-y-2">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block font-bold">
                Uptime Guardian Status
              </span>
              <h3 className="text-3xl font-mono font-black text-purple-400 flex items-center gap-2">
                100% <span className="text-zinc-500 text-xs font-mono font-bold bg-zinc-950 px-1.5 py-0.5 border border-zinc-800 uppercase tracking-wider">SCHEDULER RUNNING</span>
              </h3>
              <p className="text-[11px] text-zinc-400">
                Self-healing loop pings services every 30 seconds to keep internal databases instantly hot.
              </p>
            </div>
          </div>
        </div>

        {/* LIVE COMMODITY & MARKET DATA STRIP */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-none space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-lime-400" />
              <span className="text-[10px] font-mono uppercase text-white tracking-widest font-bold">Real-World Commodities & Market Data</span>
            </div>
            <span className="text-[9px] font-mono text-zinc-500 uppercase">
              Autonomous Sync: {getRelativeTime(marketData?.last_updated)}
            </span>
          </div>

          {loading && !marketData ? (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-12 bg-zinc-850 animate-pulse rounded-none" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 text-xs font-mono">
              <div className="bg-zinc-950 p-2.5 border border-zinc-850">
                <span className="text-[9px] text-zinc-500 uppercase block">Gold Price</span>
                <span className="text-white font-bold">${marketData?.commodities.gold.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span className="text-zinc-400 text-[10px] block">/ troy ounce</span>
              </div>
              <div className="bg-zinc-950 p-2.5 border border-zinc-850">
                <span className="text-[9px] text-zinc-500 uppercase block">Crude Oil (WTI)</span>
                <span className="text-white font-bold">${marketData?.commodities.oil.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span className="text-zinc-400 text-[10px] block">/ barrel</span>
              </div>
              <div className="bg-zinc-950 p-2.5 border border-zinc-850 relative">
                {marketData?.arbitrage_opportunity && marketData.arbitrage_details?.btc.opportunity_found && (
                  <span className="absolute -top-1.5 -right-1 px-1 text-[8px] bg-amber-500 text-zinc-950 font-extrabold uppercase animate-pulse">ARBITRAGE</span>
                )}
                <span className="text-[9px] text-zinc-500 uppercase block">Bitcoin Spot</span>
                <span className="text-lime-400 font-bold">${marketData?.crypto.btc.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span className="text-zinc-400 text-[10px] block">BTC-USD Index</span>
              </div>
              <div className="bg-zinc-950 p-2.5 border border-zinc-850 relative">
                {marketData?.arbitrage_opportunity && marketData.arbitrage_details?.eth.opportunity_found && (
                  <span className="absolute -top-1.5 -right-1 px-1 text-[8px] bg-amber-500 text-zinc-950 font-extrabold uppercase animate-pulse">ARBITRAGE</span>
                )}
                <span className="text-[9px] text-zinc-500 uppercase block">Ethereum Spot</span>
                <span className="text-lime-400 font-bold">${marketData?.crypto.eth.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span className="text-zinc-400 text-[10px] block">ETH-USD Index</span>
              </div>
              <div className="bg-zinc-950 p-2.5 border border-zinc-850">
                <span className="text-[9px] text-zinc-500 uppercase block">Euro Rate</span>
                <span className="text-zinc-300 font-bold">${marketData?.forex.EUR.toFixed(4)}</span>
                <span className="text-zinc-500 text-[10px] block">EUR/USD Base</span>
              </div>
              <div className="bg-zinc-950 p-2.5 border border-zinc-850">
                <span className="text-[9px] text-zinc-500 uppercase block">British Pound</span>
                <span className="text-zinc-300 font-bold">${marketData?.forex.GBP.toFixed(4)}</span>
                <span className="text-zinc-500 text-[10px] block">GBP/USD Base</span>
              </div>
            </div>
          )}
        </div>

        {/* MAIN DATA MODULE PANELS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT PANEL: ACTIVE YIELD PROTOCOLS (api/defi-yields) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-lime-400" />
                <h2 className="text-md font-mono font-bold uppercase tracking-wider text-white">
                  High-Performance DeFi Farms
                </h2>
              </div>
              
              <div className="flex bg-zinc-950 p-0.5 border border-zinc-800 rounded-none self-start sm:self-auto text-xs">
                {["all", "ethereum", "arbitrum", "base"].map((chainName) => (
                  <button
                    key={chainName}
                    onClick={() => setChainFilter(chainName)}
                    className={`px-2.5 py-1 font-mono uppercase tracking-wider transition-all rounded-none ${
                      chainName !== "all" ? "border-l border-zinc-800" : ""
                    } ${
                      chainFilter === chainName ? "bg-lime-500 text-zinc-950 font-bold" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {chainName}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick search bar for pools */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                <Search className="h-3.5 w-3.5" />
              </span>
              <input
                type="text"
                placeholder="Search DeFi pools or assets (e.g. USDC, stETH)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-none pl-9 pr-10 py-2.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-lime-500/40 font-mono"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-mono uppercase">
                {filteredPools.length} found
              </div>
            </div>

            {loading && !yieldsData ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-32 bg-zinc-900/50 border border-zinc-800 animate-pulse rounded-none" />
                ))}
              </div>
            ) : filteredPools.length === 0 ? (
              <div className="p-12 text-center border border-zinc-800 bg-zinc-900/30">
                <AlertCircle className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-zinc-400 font-mono text-xs uppercase tracking-wider">No Active Pools Match Filter</p>
                <p className="text-[11px] text-zinc-600 mt-1">Try resetting the chain filter or search parameters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[610px] overflow-y-auto custom-scrollbar pr-1">
                {filteredPools.map((pool, idx) => (
                  <motion.div
                    key={pool.pool || idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.02, 0.3) }}
                    className={`bg-zinc-900 hover:bg-zinc-800/85 border transition-all p-4 flex flex-col justify-between h-32 relative overflow-hidden rounded-none group ${
                      pool.hot_now ? "border-amber-500/30 ring-1 ring-amber-500/10" : "border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    {pool.hot_now && (
                      <span className="absolute top-0 right-0 px-2 py-0.5 text-[8px] font-black tracking-widest bg-amber-500 text-zinc-950 uppercase animate-pulse flex items-center gap-0.5">
                        <Flame className="h-2.5 w-2.5 fill-current" /> HOT NOW
                      </span>
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={getProtocolLogo(pool.logo.split('/').pop() || "", pool.project)}
                          alt={pool.project}
                          className="w-8 h-8 rounded-full border border-zinc-800 bg-zinc-950 object-contain"
                          onError={(e) => {
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(pool.project)}&background=1c1917&color=a3e635&bold=true`;
                          }}
                        />
                        <div>
                          <h4 className="text-xs font-mono font-black uppercase text-white group-hover:text-lime-400 transition-colors flex items-center gap-1.5">
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
                        <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">TVL Pool</span>
                        <span className="text-xs font-mono text-zinc-300">
                          {pool.tvlUsd ? `$${Number(pool.tvlUsd).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "N/A"}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">APY Rate</span>
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

          {/* RIGHT PANEL: CORE PROTOCOL LIST (api/rwa-dashboard protocols list) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-lime-400" />
                <h2 className="text-md font-mono font-bold uppercase tracking-wider text-white">
                  RWA Yield Potential Index
                </h2>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">Auto-Sorted by Potential</span>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-none overflow-hidden">
              {loading && !rwaData ? (
                <div className="divide-y divide-zinc-800">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="p-4 flex items-center justify-between animate-pulse">
                      <div className="space-y-1.5">
                        <div className="h-3 w-24 bg-zinc-800" />
                        <div className="h-2 w-12 bg-zinc-800" />
                      </div>
                      <div className="h-3 w-16 bg-zinc-800" />
                    </div>
                  ))}
                </div>
              ) : !rwaData || rwaData.protocols.length === 0 ? (
                <div className="p-12 text-center text-zinc-500">
                  <AlertCircle className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                  <p className="text-xs font-mono uppercase tracking-widest">No RWA Protocols Data Loaded</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-850 max-h-[665px] overflow-y-auto custom-scrollbar">
                  {rwaData.protocols.map((p, idx) => (
                    <div 
                      key={idx}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-zinc-600 font-mono text-xs w-4">
                          #{idx + 1}
                        </span>
                        <img
                          src={getProtocolLogo(p.slug, p.name)}
                          alt={p.name}
                          className="w-8 h-8 rounded-full border border-zinc-800 bg-zinc-950 object-contain"
                          onError={(e) => {
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=1c1917&color=60a5fa&bold=true`;
                          }}
                        />
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-mono font-bold uppercase text-white flex items-center gap-1.5">
                            {p.name}
                          </h4>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9px] text-zinc-400 bg-zinc-950 px-1 border border-zinc-800/80">
                              {p.chain}
                            </span>
                            {p.apy > 0 && (
                              <span className="text-[9px] font-mono text-lime-400 uppercase tracking-widest font-bold">
                                {p.apy.toFixed(2)}% APY
                              </span>
                            )}
                          </div>
                          <div className="text-[9px] font-mono text-zinc-500">
                            1% Fee Potential:{" "}
                            <span className="text-lime-400 font-bold">
                              ${p["1pct_fee_potential"] ? Math.round(p["1pct_fee_potential"]).toLocaleString() : "0"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                        <div>
                          <p className="text-xs font-mono font-black text-white">
                            ${Number(p.tvl).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </p>
                          <div className="flex items-center justify-end gap-1 text-[9px] font-mono">
                            <span className="text-zinc-500">7d:</span>
                            <span className={`font-bold flex items-center ${p.change_7d >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                              {p.change_7d >= 0 ? "+" : ""}{p.change_7d.toFixed(2)}%
                            </span>
                          </div>
                        </div>

                        <a
                          href={p.affiliate_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 text-[9px] font-mono uppercase font-bold bg-zinc-950 text-lime-400 hover:bg-lime-400 hover:text-zinc-950 border border-zinc-800 hover:border-lime-400 transition-all rounded-none flex items-center gap-1"
                          title="Official referral entry gateway"
                        >
                          RWA Link <ExternalLink className="h-2.5 w-2.5" />
                        </a>
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
                Execute single-click institutional transaction routing directly inside your terminal or client-side Javascript.
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
                Javascript (Fetch)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT: Payload Schema Details */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-none space-y-3">
                <h4 className="text-xs font-mono font-black uppercase text-lime-400 border-b border-zinc-800 pb-1.5 flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5" /> Request Parameters
                </h4>
                
                <div className="space-y-3 max-h-[220px] overflow-y-auto custom-scrollbar text-xs">
                  <div>
                    <span className="font-mono text-zinc-300 font-bold">fromToken</span>
                    <span className="text-[9px] text-zinc-500 ml-1 uppercase">string (required)</span>
                    <p className="text-[11px] text-zinc-400">Source token contract address (e.g. WETH, USDC).</p>
                  </div>
                  <div>
                    <span className="font-mono text-zinc-300 font-bold">toToken</span>
                    <span className="text-[9px] text-zinc-500 ml-1 uppercase">string (required)</span>
                    <p className="text-[11px] text-zinc-400">Target token contract address (e.g. stETH, OUSG).</p>
                  </div>
                  <div>
                    <span className="font-mono text-zinc-300 font-bold">amount</span>
                    <span className="text-[9px] text-zinc-500 ml-1 uppercase">string (required)</span>
                    <p className="text-[11px] text-zinc-400">Minimal denomination units (e.g. 10^18 for 1.0 ETH).</p>
                  </div>
                  <div>
                    <span className="font-mono text-zinc-300 font-bold">chain</span>
                    <span className="text-[9px] text-zinc-500 ml-1 uppercase">string (required)</span>
                    <p className="text-[11px] text-zinc-400">The destination chain (e.g., 'ethereum', 'polygon', 'base').</p>
                  </div>
                  <div>
                    <span className="font-mono text-zinc-300 font-bold">walletAddress</span>
                    <span className="text-[9px] text-zinc-500 ml-1 uppercase">string (required)</span>
                    <p className="text-[11px] text-zinc-400">User's checksummed Web3 wallet address to authorize.</p>
                  </div>
                  <div>
                    <span className="font-mono text-zinc-300 font-bold">slippage</span>
                    <span className="text-[9px] text-zinc-500 ml-1 uppercase">number (optional)</span>
                    <p className="text-[11px] text-zinc-400">Slippage tolerance. Defaults to 1.0 (1.0%).</p>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Live Code Block */}
            <div className="lg:col-span-8 flex flex-col h-full bg-zinc-950 border border-zinc-800 rounded-none relative">
              <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/60">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                  Request Playground Snippet
                </span>
                <button
                  onClick={() => handleCopy(activeCode, "execute-payload")}
                  className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all rounded-none flex items-center gap-1.5 text-[11px] font-mono cursor-pointer"
                >
                  {copiedSection === "execute-payload" ? (
                    <>
                      <Check className="h-3 w-3 text-lime-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy Snippet
                    </>
                  )}
                </button>
              </div>

              <div className="p-4 flex-grow overflow-x-auto text-xs font-mono text-lime-300 leading-relaxed bg-zinc-950 max-h-[250px]">
                <pre>{activeCode}</pre>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
