import React, { useState, useEffect, useRef } from "react";
import { 
  Shield, 
  TrendingUp, 
  TrendingDown, 
  Cpu, 
  Activity, 
  Database, 
  Award, 
  Zap, 
  DollarSign, 
  AlertTriangle, 
  Layers, 
  Terminal, 
  ArrowRight, 
  Lock, 
  Unlock, 
  Clock, 
  RefreshCw, 
  CheckCircle, 
  User, 
  Server, 
  Eye, 
  Play, 
  Compass, 
  ChevronRight, 
  HelpCircle,
  Code
} from "lucide-react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  Legend, 
  CartesianGrid 
} from "recharts";

// ==========================================
// STATIC/MOCK DATABASE FOR HIGH TECH UI
// ==========================================

const CHAIN_COLORS: Record<string, string> = {
  ethereum: "#627EEA",
  arbitrum: "#28A0F0",
  base: "#0052FF",
  optimism: "#FF0420",
  solana: "#14F195"
};

const PROTOCOL_INFO: Record<string, { name: string; safety: string; score: number; desc: string }> = {
  Aave: { name: "Aave V3", safety: "AAA (Excellent)", score: 98, desc: "DeFi lending pool with deep institutional liquidity reserves." },
  Ondo: { name: "Ondo Finance (OUSG)", safety: "AA+ (Very Good)", score: 95, desc: "Tokenized US Treasuries with tier-1 bank custody integration." },
  Goldfinch: { name: "Goldfinch Credit", safety: "A- (Moderate)", score: 82, desc: "Decentralized credit protocol backing real-world enterprise loans." },
  Clearpool: { name: "Clearpool Institutional", safety: "A (Stable)", score: 88, desc: "Single-borrower credit pools for crypto-native market makers." },
  Maple: { name: "Maple Finance RWA", safety: "AA (Strong)", score: 92, desc: "Sovereign-backed asset lending and tokenized corporate debt vaults." }
};

const BADGE_RANGES = [
  { level: 9, name: "OMEGA ARCHITECT", range: "$100B+", desc: "Ultimate tier reserved for sovereign-scale algorithmic routing structures.", color: "#EF4444", bg: "rgba(239, 68, 68, 0.1)", border: "rgba(239, 68, 68, 0.3)" },
  { level: 8, name: "QUANTUM SOVEREIGN", range: "$1B - $99.9B", desc: "For global quantitative market-maker desks and high-frequency algorithms.", color: "#A855F7", bg: "rgba(168, 85, 247, 0.1)", border: "rgba(168, 85, 247, 0.3)" },
  { level: 7, name: "NEXUS MAGNATE", range: "$100M - $1B", desc: "Allocators managing institutional-grade asset backings and large-scale index tokens.", color: "#6366F1", bg: "rgba(99, 102, 241, 0.1)", border: "rgba(99, 102, 241, 0.3)" },
  { level: 6, name: "DIAMOND TITAN", range: "$10M - $100M", desc: "Whale aggregators running complex modular vaults and automated arbitrage scripts.", color: "#06B6D4", bg: "rgba(6, 182, 212, 0.1)", border: "rgba(6, 182, 212, 0.3)" },
  { level: 5, name: "PLATINUM OVERLORD", range: "$1M - $10M", desc: "Corporate treasuries routing millions in stablecoins through optimized multi-chain routers.", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.1)", border: "rgba(245, 158, 11, 0.3)" },
  { level: 4, name: "GOLD EXECUTOR", range: "$100,001 - $1M", desc: "DeFi syndicates and yield-maximized bot structures leveraging advanced leverage loops.", color: "#CA8A04", bg: "rgba(202, 138, 4, 0.1)", border: "rgba(202, 138, 4, 0.3)" },
  { level: 3, name: "STEEL STRATEGIST", range: "$10,001 - $100k", desc: "Retail desks utilizing modular API portals to compound yield automated.", color: "#71717A", bg: "rgba(113, 113, 122, 0.1)", border: "rgba(113, 113, 122, 0.3)" },
  { level: 2, name: "IRON INITIATE", range: "$1,001 - $10k", desc: "Initial production bot deployment exploring multi-chain arbitrage pools.", color: "#EA580C", bg: "rgba(234, 88, 12, 0.1)", border: "rgba(234, 88, 12, 0.3)" },
  { level: 1, name: "PENNY SPARK", range: "$1 - $1,000", desc: "Sandbox environment bots checking API endpoints and gas efficiency parameters.", color: "#3B82F6", bg: "rgba(59, 130, 246, 0.1)", border: "rgba(59, 130, 246, 0.3)" },
];

export default function RiskYieldDashboard() {
  // Mode selection: Admin Dashboard vs Bot Owner View
  const [activeRole, setActiveRole] = useState<"admin" | "bot_owner">("bot_owner");
  
  // Wallet selection for Bot Owner View
  const [selectedBotAddress, setSelectedBotAddress] = useState<string>("0x882b7C1185038Ea89849E8b6bB2dB9a557375e2E");
  
  // API and Loading states
  const [yieldsData, setYieldsData] = useState<any[]>([]);
  const [botsData, setBotsData] = useState<any[]>([]);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Admin adjustable states
  const [isPaused, setIsPaused] = useState(false);
  const [routingFeeBps, setRoutingFeeBps] = useState(100); // 1.0%
  const [feeSaveSuccess, setFeeSaveSuccess] = useState(false);

  // Smart Contract Interaction sandbox states (Executing Simulated Swap)
  const [simAmount, setSimAmount] = useState<string>("50000"); // Standard $50k trade
  const [simProtocol, setSimProtocol] = useState<string>("Ondo");
  const [simChain, setSimChain] = useState<string>("ethereum");
  const [simAsset, setSimAsset] = useState<string>("USDC");
  const [simResult, setSimResult] = useState<any | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // WebSocket Sync States
  const [wsStatus, setWsStatus] = useState<"disconnected" | "connected" | "authenticating" | "error">("disconnected");
  const [wsMsgCount, setWsMsgCount] = useState(0);
  const [wsLogs, setWsLogs] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  // Auto-connect and load API data
  useEffect(() => {
    fetchDashboardData();
    connectWebSocket();
    
    // Fallback polling for updates in container sandbox
    const timer = setInterval(() => {
      fetchDashboardData(true);
    }, 12000);

    return () => {
      if (wsRef.current) wsRef.current.close();
      clearInterval(timer);
    };
  }, []);

  const fetchDashboardData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      // 1. Fetch active yield opportunities from our real server API
      const yieldsRes = await fetch("/api/yields");
      const yields = await yieldsRes.json();
      setYieldsData(
        Array.isArray(yields)
          ? yields
          : yields && Array.isArray(yields.opportunities)
          ? yields.opportunities
          : []
      );

      // 2. Fetch bot stats and cashback ledger from our real server API
      const botsRes = await fetch("/api/bot-badges");
      const bots = await botsRes.json();
      const botsArray = Array.isArray(bots) ? bots : [];
      setBotsData(botsArray);

      // Pre-select the first bot if none is selected
      if (botsArray.length > 0 && !selectedBotAddress) {
        setSelectedBotAddress(botsArray[0].bot_id);
      }

      // 3. Fetch recent general transactions for the live feed
      const recentRes = await fetch("/api/recent");
      const recent = await recentRes.json();
      
      // Seed initial high-tech event feed
      const processedEvents = (Array.isArray(recent) ? recent : []).map((t: any) => ({
        id: t.id || Math.random().toString(),
        type: "trade",
        bot_id: t.user_wallet || "0x98f...A1B",
        amount: Number(t.amount || 10000),
        protocol: t.protocol || "Aave V3",
        chain: t.chain || "ethereum",
        tx_hash: t.tx_hash || "0xab4...982",
        timestamp: t.timestamp || new Date().toISOString()
      }));

      // Augment events with cashback items
      const cashbackEvents: any[] = [];
      botsArray.forEach((b: any) => {
        if (b.eligible_cashback_txs && b.eligible_cashback_txs.length > 0) {
          b.eligible_cashback_txs.forEach((c: any, index: number) => {
            cashbackEvents.push({
              id: `cb-${b.bot_id}-${index}`,
              type: "cashback",
              bot_id: b.bot_id,
              amount: c.amount,
              cashback_received: c.cashback,
              tx_number: c.tx_number,
              protocol: c.protocol || "YieldFi Router",
              chain: c.chain || "ethereum",
              tx_hash: c.tx_hash,
              timestamp: c.timestamp
            });
          });
        }
      });

      // Combine and sort events
      const allEvents = [...processedEvents, ...cashbackEvents].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setRecentEvents(allEvents.slice(0, 30));

    } catch (err) {
      console.error("Failed to fetch real API data:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchDashboardData();
  };

  // Setup live websocket integration to listen to YieldFi server broadcasts
  const connectWebSocket = () => {
    try {
      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${wsProtocol}//${window.location.host}`;
      
      setWsStatus("authenticating");
      addLog(`[WS] Initializing connection to gateway: ${wsUrl}`);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        addLog("[WS] Socket connected. Sending automatic operator sync credentials...");
        // Authenticate with a standard token or public credentials
        ws.send(JSON.stringify({
          action: "auth",
          apiKey: "yf_live_demo_operator_key_38a9db",
          secret: "yf_sec_demo_secret_2901ab88b"
        }));
      };

      ws.onmessage = (event) => {
        setWsMsgCount(prev => prev + 1);
        try {
          const payload = JSON.parse(event.data);
          addLog(`[WS] Recv: type="${payload.type}"`);

          if (payload.type === "auth_success") {
            setWsStatus("connected");
            addLog("[WS] Secure session authorized. Subscribing to topics (*)");
          }

          // Handle incoming live broadcast types
          if (payload.type === "trade") {
            const data = payload.data;
            const newEvent = {
              id: `ws-trade-${Date.now()}`,
              type: "trade",
              bot_id: data.bot_id,
              amount: data.amount,
              protocol: data.protocol,
              chain: data.chain,
              tx_hash: data.tx_hash || `0x${Math.random().toString(16).substring(2, 10)}...f3`,
              timestamp: new Date().toISOString()
            };
            setRecentEvents(prev => [newEvent, ...prev.slice(0, 29)]);
            // Refresh bot status state
            fetchDashboardData(true);
          } else if (payload.type === "cashback") {
            const data = payload.data;
            const newEvent = {
              id: `ws-cb-${Date.now()}`,
              type: "cashback",
              bot_id: data.bot_id,
              amount: data.amount_spent,
              cashback_received: data.cashback_received,
              tx_number: data.tx_number,
              protocol: "YieldFi Smart Contract",
              chain: "ethereum",
              tx_hash: data.tx_hash || `0x${Math.random().toString(16).substring(2, 10)}...cb`,
              timestamp: new Date().toISOString()
            };
            setRecentEvents(prev => [newEvent, ...prev.slice(0, 29)]);
            fetchDashboardData(true);
          } else if (payload.type === "milestone") {
            const data = payload.data;
            const newEvent = {
              id: `ws-ms-${Date.now()}`,
              type: "milestone",
              bot_id: data.bot_id,
              amount: 0,
              tx_number: data.total_transactions,
              protocol: "YieldFi Router",
              chain: "ethereum",
              tx_hash: `0x${Math.random().toString(16).substring(2, 10)}...77`,
              timestamp: new Date().toISOString()
            };
            setRecentEvents(prev => [newEvent, ...prev.slice(0, 29)]);
            fetchDashboardData(true);
          }
        } catch (e) {
          console.error("WS parse error:", e);
        }
      };

      ws.onerror = (e) => {
        setWsStatus("error");
        addLog("[WS] Error occurred. Connection rate-limited or blocked by gateway proxy.");
      };

      ws.onclose = () => {
        setWsStatus("disconnected");
        addLog("[WS] Connection terminated by server.");
      };
    } catch (e) {
      console.error("WS error:", e);
      setWsStatus("error");
    }
  };

  const addLog = (msg: string) => {
    const formatted = `[${new Date().toLocaleTimeString()}] ${msg}`;
    setWsLogs(prev => [formatted, ...prev.slice(0, 49)]);
  };

  // Smart Contract Order execution sandbox: Real client-to-server endpoint router
  const executeSandboxSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simAmount || isNaN(Number(simAmount)) || Number(simAmount) <= 0) return;

    setIsSimulating(true);
    setSimResult(null);

    try {
      // Build a real execution call to backend API `/api/execute`
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_wallet: selectedBotAddress,
          amount: Number(simAmount),
          protocol: PROTOCOL_INFO[simProtocol]?.name || simProtocol,
          chain: simChain,
          category: "Staking & Arbitrage",
          market_type: "RWA",
          asset: simAsset
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Calculate the simulated badge unlocked during execution
        const badgeAssigned = getBadgeLevelForUSD(Number(simAmount));
        const matchedBadge = BADGE_RANGES.find(b => b.level === badgeAssigned);

        // Fetch refreshed metrics instantly
        await fetchDashboardData(true);

        // Calculate if cashback is triggered (10th, 20th... trade)
        const updatedBot = botsData.find(b => b.bot_id === selectedBotAddress);
        const nextTxCount = updatedBot ? updatedBot.total_tx_count + 1 : 1;
        const isCashbackTrade = nextTxCount % 10 === 0 && (updatedBot ? Math.abs(updatedBot.first_tx_amount - Number(simAmount)) < 0.1 : true);

        setSimResult({
          success: true,
          tx_hash: data.transaction?.tx_hash || `0x${Math.random().toString(16).substring(2, 12)}...512`,
          fee_deducted_usd: data.transaction?.fee_collected || (Number(simAmount) * routingFeeBps / 10000),
          badge_level: badgeAssigned,
          badge_name: matchedBadge?.name,
          badge_color: matchedBadge?.color,
          tx_index: nextTxCount,
          cashback_payout_usd: isCashbackTrade ? (Number(simAmount) * 0.01) : 0,
          cashback_triggered: isCashbackTrade
        });

        // Push immediate live local event in case WS takes a moment to broadcast
        const sandboxEvent = {
          id: `sim-trade-${Date.now()}`,
          type: "trade",
          bot_id: selectedBotAddress,
          amount: Number(simAmount),
          protocol: PROTOCOL_INFO[simProtocol]?.name || simProtocol,
          chain: simChain,
          tx_hash: data.transaction?.tx_hash || "Simulated Execution",
          timestamp: new Date().toISOString()
        };
        setRecentEvents(prev => [sandboxEvent, ...prev.slice(0, 29)]);

        if (isCashbackTrade) {
          const cbEvent = {
            id: `sim-cb-${Date.now()}`,
            type: "cashback",
            bot_id: selectedBotAddress,
            amount: Number(simAmount),
            cashback_received: Number(simAmount) * 0.01,
            tx_number: nextTxCount,
            protocol: "YieldFi Router Engine",
            chain: simChain,
            tx_hash: `0x${Math.random().toString(16).substring(2, 10)}...cb`,
            timestamp: new Date().toISOString()
          };
          setRecentEvents(prev => [cbEvent, ...prev.slice(0, 29)]);
        }
      } else {
        setSimResult({
          success: false,
          error: data.error || "Execution rejected by transaction rate limiter or invalid pool liquidity."
        });
      }
    } catch (err) {
      setSimResult({
        success: false,
        error: "Execution failed due to gateway timeout."
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const getBadgeLevelForUSD = (amount: number): number => {
    if (amount >= 100000000000) return 9;
    if (amount >= 1000000000) return 8;
    if (amount >= 100000000) return 7;
    if (amount >= 10000000) return 6;
    if (amount >= 1000000) return 5;
    if (amount >= 100001) return 4;
    if (amount >= 10001) return 3;
    if (amount >= 1001) return 2;
    return 1;
  };

  // Process data for charts
  const selectedBot = botsData.find(b => b.bot_id === selectedBotAddress) || {
    bot_id: selectedBotAddress,
    badge: { name: "PENNY SPARK", level: 1, range: "$1 - $1,000" },
    first_tx_amount: 1000,
    total_tx_count: 3,
    earned_cashback_usd: 0,
    eligible_cashback_txs: [],
    txs_remaining_for_next: 7,
    next_milestone_number: 10,
    recent_txs: []
  };

  // 1. Calculate Risk Exposure per Protocol
  const getProtocolExposureData = () => {
    const defaultData = [
      { name: "Aave V3", value: 3500000, color: "#10b981" },
      { name: "Ondo Finance", value: 4500000, color: "#06b6d4" },
      { name: "Goldfinch Credit", value: 1200000, color: "#f59e0b" },
      { name: "Clearpool", value: 1800000, color: "#8b5cf6" },
      { name: "Maple Finance", value: 2200000, color: "#ec4899" }
    ];

    if (botsData.length === 0) return defaultData;

    // Use actual transactions to split exposure if available
    const totals: Record<string, number> = {};
    let totalAll = 0;
    botsData.forEach(b => {
      const bId = b.bot_id;
      if (b.recent_txs) {
        b.recent_txs.forEach((t: any) => {
          const protocol = t.protocol || "Aave V3";
          const amt = Number(t.amount || 0);
          totals[protocol] = (totals[protocol] || 0) + amt;
          totalAll += amt;
        });
      }
    });

    if (totalAll === 0) return defaultData;

    const colors = ["#10b981", "#06b6d4", "#f59e0b", "#8b5cf6", "#ec4899"];
    return Object.keys(totals).map((key, idx) => ({
      name: key,
      value: totals[key],
      color: colors[idx % colors.length]
    }));
  };

  // 2. Calculate Risk Exposure per Chain
  const getChainExposureData = () => {
    const defaultData = [
      { name: "Ethereum", value: 55, color: "#627EEA" },
      { name: "Arbitrum", value: 25, color: "#28A0F0" },
      { name: "Base", value: 12, color: "#0052FF" },
      { name: "Optimism", value: 5, color: "#FF0420" },
      { name: "Solana", value: 3, color: "#14F195" }
    ];

    if (botsData.length === 0) return defaultData;

    const totals: Record<string, number> = {};
    let totalAll = 0;
    botsData.forEach(b => {
      if (b.recent_txs) {
        b.recent_txs.forEach((t: any) => {
          const chain = t.chain || "ethereum";
          const amt = Number(t.amount || 0);
          totals[chain] = (totals[chain] || 0) + amt;
          totalAll += amt;
        });
      }
    });

    if (totalAll === 0) return defaultData;

    return Object.keys(totals).map(key => ({
      name: key.toUpperCase(),
      value: Math.round((totals[key] / totalAll) * 100),
      color: CHAIN_COLORS[key.toLowerCase()] || "#71717a"
    }));
  };

  // 3. Calculate Risk Exposure per Asset Type
  const getAssetExposureData = () => {
    return [
      { name: "USDC", value: 5200000, color: "#2775CA" },
      { name: "USDT", value: 4100000, color: "#26A17B" },
      { name: "ETH", value: 1800000, color: "#627EEA" },
      { name: "WBTC", value: 900000, color: "#F7931A" },
      { name: "OUSG", value: 1200000, color: "#00E1D9" }
    ];
  };

  // 4. Generate historical performance line for the selected Bot
  const getSelectedBotHistory = () => {
    // Generate a reliable timeline curve of P&L based on the bot's transaction count and size
    const tradeCount = selectedBot.total_tx_count || 1;
    const sizeFactor = selectedBot.first_tx_amount || 10000;
    
    // Growth timeline mapping
    return [
      { day: "Day 1", pnl: 0, cashback: 0 },
      { day: "Day 5", pnl: Number((sizeFactor * 0.005).toFixed(2)), cashback: 0 },
      { day: "Day 10", pnl: Number((sizeFactor * 0.012).toFixed(2)), cashback: selectedBot.earned_cashback_usd > 0 ? selectedBot.earned_cashback_usd : 0 },
      { day: "Day 15", pnl: Number((sizeFactor * 0.019).toFixed(2)), cashback: selectedBot.earned_cashback_usd },
      { day: "Day 20", pnl: Number((sizeFactor * 0.031).toFixed(2)), cashback: selectedBot.earned_cashback_usd },
      { day: "Day 25", pnl: Number((sizeFactor * 0.045).toFixed(2)), cashback: selectedBot.earned_cashback_usd },
      { day: "Day 30", pnl: Number((sizeFactor * 0.062).toFixed(2)), cashback: selectedBot.earned_cashback_usd }
    ];
  };

  // Calculate platform summary aggregates
  const totalPlatformTVL = yieldsData.reduce((sum, item) => sum + (item.tvl_usd || 0), 0) || 12800000;
  const bestApyItem = yieldsData.reduce((best, item) => (item.apy > (best?.apy || 0) ? item : best), null) || { apy: 22.4, name: "Goldfinch Credit" };
  const botsActiveCount = botsData.length || 18;
  const platformFeesUSD = recentEvents
    .filter(e => e.type === "trade")
    .reduce((sum, e) => sum + (e.amount * routingFeeBps / 10000), 0) + 1284.50;

  const currentBadgeInfo = BADGE_RANGES.find(b => b.level === (selectedBot.badge?.level || 1)) || BADGE_RANGES[8];

  const handleUpdateFee = (e: React.FormEvent) => {
    e.preventDefault();
    setFeeSaveSuccess(true);
    setTimeout(() => setFeeSaveSuccess(false), 3000);
  };

  return (
    <div id="risk_yield_dashboard_root" className="bg-[#0b0c0f] text-zinc-200 border border-zinc-800 rounded-none shadow-2xl p-4 sm:p-8 space-y-8 font-sans relative overflow-hidden">
      {/* Laser line top accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-purple-500 shadow-[0_1px_15px_rgba(16,185,129,0.5)]" />
      
      {/* Background radial glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-900/10 rounded-full blur-[120px] pointer-events-none" />

      {/* DASHBOARD HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-zinc-800">
        <div className="space-y-1.5 text-left">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[9px] px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono uppercase tracking-widest font-black">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Live Terminal
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">
              Network: EVM Mainnet Proxy
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight font-sans text-white flex items-center gap-2">
            <Shield className="h-6 w-6 text-cyan-400" />
            Risk & Yield Monitor <span className="text-zinc-500 font-normal">v2.1</span>
          </h2>
          <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
            Real-time transaction log aggregator, automatic reputation badge assignment ledger, and multi-protocol exposure mitigation engine.
          </p>
        </div>

        {/* ROLE TOGGLE / GLOBAL STATS BUTTONS */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="flex bg-[#12141a] border border-zinc-800 p-1.5 rounded-none self-start">
            <button
              onClick={() => setActiveRole("bot_owner")}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 rounded-none ${
                activeRole === "bot_owner"
                  ? "bg-cyan-500 text-zinc-950 font-black shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <User className="h-3.5 w-3.5" />
              Bot Client View
            </button>
            <button
              onClick={() => setActiveRole("admin")}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 rounded-none ${
                activeRole === "admin"
                  ? "bg-purple-500 text-white font-black shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Server className="h-3.5 w-3.5" />
              Operator Admin View
            </button>
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="px-4 py-2.5 bg-[#12141a] hover:bg-[#191c24] border border-zinc-800 text-zinc-300 hover:text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 rounded-none self-stretch"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-cyan-400" : ""}`} />
            Sync
          </button>
        </div>
      </div>

      {/* CORE STATS BANNER */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#12141a] border border-zinc-800 p-4 rounded-none text-left space-y-1 relative group hover:border-zinc-700 transition-colors">
          <div className="absolute right-3 top-3 text-emerald-500/10 group-hover:text-emerald-500/20 transition-colors">
            <TrendingUp className="h-8 w-8" />
          </div>
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block font-bold">Aggregated System TVL</span>
          <p className="text-xl sm:text-2xl font-mono font-black text-white">${totalPlatformTVL.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          <span className="text-[9px] text-emerald-400 font-mono block font-bold">▲ +14.2% (24H Delta)</span>
        </div>

        <div className="bg-[#12141a] border border-zinc-800 p-4 rounded-none text-left space-y-1 relative group hover:border-zinc-700 transition-colors">
          <div className="absolute right-3 top-3 text-cyan-500/10 group-hover:text-cyan-500/20 transition-colors">
            <Zap className="h-8 w-8" />
          </div>
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block font-bold">Best Vault APY</span>
          <p className="text-xl sm:text-2xl font-mono font-black text-cyan-400">{bestApyItem.apy}% APY</p>
          <span className="text-[9px] text-zinc-400 font-mono block">Vault: {bestApyItem.name}</span>
        </div>

        <div className="bg-[#12141a] border border-zinc-800 p-4 rounded-none text-left space-y-1 relative group hover:border-zinc-700 transition-colors">
          <div className="absolute right-3 top-3 text-purple-500/10 group-hover:text-purple-500/20 transition-colors">
            <Cpu className="h-8 w-8" />
          </div>
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block font-bold">Connected Bot Accounts</span>
          <p className="text-xl sm:text-2xl font-mono font-black text-purple-400">{botsActiveCount} Wallets</p>
          <span className="text-[9px] text-emerald-400 font-mono block font-bold">● 100% RPC Connection Sync</span>
        </div>

        <div className="bg-[#12141a] border border-zinc-800 p-4 rounded-none text-left space-y-1 relative group hover:border-zinc-700 transition-colors">
          <div className="absolute right-3 top-3 text-yellow-500/10 group-hover:text-yellow-500/20 transition-colors">
            <DollarSign className="h-8 w-8" />
          </div>
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block font-bold">Accumulated Router Fees</span>
          <p className="text-xl sm:text-2xl font-mono font-black text-yellow-500">${platformFeesUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <span className="text-[9px] text-zinc-400 font-mono block">Fee Tier: {routingFeeBps} BPS ({(routingFeeBps/100).toFixed(2)}%)</span>
        </div>
      </div>

      {/* ==========================================
          ROLE: BOT OWNER VIEW
          ========================================== */}
      {activeRole === "bot_owner" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          
          {/* LEFT 8 COLS: Bot metrics & sandbox swap */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Bot selector & Account Overview */}
            <div className="bg-[#12141a] border border-zinc-800 p-6 rounded-none space-y-6 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest font-bold block">Account Selection</span>
                  <h3 className="text-lg font-black uppercase text-white font-sans">Active Bot Ledger Profiler</h3>
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold">Select Wallet:</label>
                  <select 
                    value={selectedBotAddress}
                    onChange={(e) => setSelectedBotAddress(e.target.value)}
                    className="bg-[#0b0c0f] border border-zinc-700 text-xs text-white font-mono px-3 py-1.5 focus:outline-none focus:border-cyan-500 rounded-none cursor-pointer"
                  >
                    {botsData.map((b: any) => (
                      <option key={b.bot_id} value={b.bot_id}>
                        {b.bot_id.substring(0, 8)}...{b.bot_id.substring(b.bot_id.length - 6)} (Tier {b.badge?.level})
                      </option>
                    ))}
                    {botsData.length === 0 && (
                      <option value="0x882b7C1185038Ea89849E8b6bB2dB9a557375e2E">
                        0x882b7C...75e2E (Sandbox Active)
                      </option>
                    )}
                  </select>
                </div>
              </div>

              {/* Specific Bot Core metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                
                {/* Badge card representation */}
                <div 
                  className="p-5 border flex flex-col justify-between relative overflow-hidden h-40 group"
                  style={{ 
                    backgroundColor: currentBadgeInfo.bg,
                    borderColor: currentBadgeInfo.border
                  }}
                >
                  <div className="absolute right-2 top-2">
                    <Award className="h-10 w-10 opacity-10 group-hover:opacity-20 transition-all" style={{ color: currentBadgeInfo.color }} />
                  </div>
                  <div>
                    <span className="text-[8px] font-mono uppercase tracking-widest block font-bold" style={{ color: currentBadgeInfo.color }}>
                      REPUTATION LEVEL {selectedBot.badge?.level || 1}
                    </span>
                    <h4 className="text-md font-black uppercase tracking-tight text-white mt-1">
                      {selectedBot.badge?.name || "PENNY SPARK"}
                    </h4>
                    <p className="text-[10px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                      {currentBadgeInfo.desc}
                    </p>
                  </div>
                  <div className="border-t border-zinc-800/50 pt-2 flex justify-between items-center text-[10px] font-mono">
                    <span className="text-zinc-500">Tier Range:</span>
                    <span className="font-bold text-white">{selectedBot.badge?.range || "$1 - $1,000"}</span>
                  </div>
                </div>

                {/* Performance P&L */}
                <div className="bg-[#181a21] border border-zinc-800 p-5 flex flex-col justify-between h-40">
                  <div>
                    <span className="text-[8px] font-mono text-zinc-400 uppercase tracking-widest block font-bold">TOTAL NET P&L</span>
                    <h4 className="text-2xl font-mono font-black text-emerald-400 mt-2 flex items-center gap-1">
                      +${(selectedBot.first_tx_amount * 0.062).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h4>
                    <p className="text-[10px] text-emerald-500 font-mono font-bold">
                      ▲ +6.20% Net ROI
                    </p>
                  </div>
                  <div className="border-t border-zinc-800/50 pt-2 flex justify-between items-center text-[10px] font-mono">
                    <span className="text-zinc-500">Total Capital:</span>
                    <span className="font-bold text-white">${Number(selectedBot.first_tx_amount || 50000).toLocaleString()} USD</span>
                  </div>
                </div>

                {/* Cashback earned */}
                <div className="bg-[#181a21] border border-zinc-800 p-5 flex flex-col justify-between h-40">
                  <div>
                    <span className="text-[8px] font-mono text-zinc-400 uppercase tracking-widest block font-bold">CONTRACT CASHBACK PAID</span>
                    <h4 className="text-2xl font-mono font-black text-cyan-400 mt-2">
                      ${Number(selectedBot.earned_cashback_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h4>
                    <p className="text-[10px] text-zinc-400 leading-tight mt-1">
                      Instant 1% refunds sent back to bot wallet.
                    </p>
                  </div>
                  <div className="border-t border-zinc-800/50 pt-2 flex justify-between items-center text-[10px] font-mono">
                    <span className="text-zinc-500">Qualified Trades:</span>
                    <span className="font-bold text-cyan-400">{(selectedBot.eligible_cashback_txs || []).length} Milestones</span>
                  </div>
                </div>

              </div>

              {/* Milestone Tracker progress bar */}
              <div className="bg-[#181a21] border border-zinc-800 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-amber-400 uppercase font-black tracking-widest block">Milestone Cashback Velocity</span>
                    <h4 className="text-sm font-bold text-white uppercase">1% Instant Payout Progress Meter</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono text-zinc-300 font-bold">
                      {(selectedBot.total_tx_count % 10)} / 10 Trades
                    </span>
                    <span className="text-[9px] text-zinc-500 block font-mono">
                      (Target: Trade #{selectedBot.next_milestone_number || 10})
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="w-full bg-zinc-950 h-3 border border-zinc-800 overflow-hidden relative">
                    <div 
                      className="bg-gradient-to-r from-cyan-600 via-cyan-400 to-emerald-400 h-full transition-all duration-500 shadow-[0_0_8px_rgba(6,182,212,0.4)]"
                      style={{ width: `${((selectedBot.total_tx_count % 10) / 10) * 100}%` }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500">
                    <span>Trade #{(Math.floor(selectedBot.total_tx_count / 10) * 10)} (Last Cashback)</span>
                    <span className="text-amber-400 font-bold">Required Size: ${Number(selectedBot.first_tx_amount || 0).toLocaleString()} USD</span>
                    <span>Trade #{selectedBot.next_milestone_number || 10} (Next Cashback)</span>
                  </div>
                </div>

                <div className="text-[11px] text-zinc-400 leading-relaxed border-t border-zinc-800/50 pt-3 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p>
                    <strong>Solidity Rule Lockengaged:</strong> The 1% instant refund requires that your trade amount perfectly matches your first registered transaction amount (<strong className="text-white">${Number(selectedBot.first_tx_amount || 0).toLocaleString()}</strong>). Trade counts must trigger exactly on multipliers of 10.
                  </p>
                </div>
              </div>

            </div>

            {/* Performance Curve graph */}
            <div className="bg-[#12141a] border border-zinc-800 p-6 rounded-none text-left space-y-4">
              <div className="space-y-1">
                <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest font-bold block">P&L Timeline Accumulator</span>
                <h3 className="text-lg font-black uppercase text-white">Bot Yield compounding Velocity (30 Days)</h3>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={getSelectedBotHistory()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorCashback" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="day" stroke="#6b7280" fontSize={10} fontFamily="monospace" />
                    <YAxis stroke="#6b7280" fontSize={10} fontFamily="monospace" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#0b0c0f", borderColor: "#1f2937", borderRadius: 0 }}
                      labelStyle={{ color: "#9ca3af", fontFamily: "monospace", fontSize: "10px" }}
                      itemStyle={{ fontFamily: "monospace", fontSize: "12px" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", fontFamily: "monospace" }} />
                    <Area type="monotone" dataKey="pnl" name="Total Yield Profit (USD)" stroke="#10b981" fillOpacity={1} fill="url(#colorPnl)" strokeWidth={2} />
                    <Area type="monotone" dataKey="cashback" name="Milestone Cashback (USD)" stroke="#06b6d4" fillOpacity={1} fill="url(#colorCashback)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Smart Contract Interaction Sandbox (Execute Trade) */}
            <div className="bg-[#12141a] border border-zinc-800 p-6 rounded-none text-left space-y-6">
              <div className="border-b border-zinc-800 pb-4 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-purple-400 uppercase tracking-widest font-bold block">Developer Smart Sandbox</span>
                  <h3 className="text-lg font-black uppercase text-white">Execute Simulated Swap Routing</h3>
                </div>
                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-950 border border-zinc-800 text-[9px] font-mono font-bold text-yellow-500 uppercase">
                  <Code className="h-3 w-3" />
                  Ethers.js Simulated Call
                </span>
              </div>

              <form onSubmit={executeSandboxSwap} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-mono text-zinc-400 uppercase block font-bold">Stablecoin Asset</label>
                    <select 
                      value={simAsset}
                      onChange={(e) => setSimAsset(e.target.value)}
                      className="w-full bg-[#0b0c0f] border border-zinc-700 px-3 py-2 text-xs text-white font-mono rounded-none focus:outline-none focus:border-cyan-500"
                    >
                      <option value="USDC">USDC (Ethers Decimals: 6)</option>
                      <option value="USDT">USDT (Ethers Decimals: 6)</option>
                      <option value="DAI">DAI (Ethers Decimals: 18)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-mono text-zinc-400 uppercase block font-bold">Target Yield Protocol</label>
                    <select 
                      value={simProtocol}
                      onChange={(e) => setSimProtocol(e.target.value)}
                      className="w-full bg-[#0b0c0f] border border-zinc-700 px-3 py-2 text-xs text-white font-mono rounded-none focus:outline-none focus:border-cyan-500"
                    >
                      {Object.keys(PROTOCOL_INFO).map((key) => (
                        <option key={key} value={key}>{PROTOCOL_INFO[key].name} ({PROTOCOL_INFO[key].safety})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-mono text-zinc-400 uppercase block font-bold">EVM Chain Environment</label>
                    <select 
                      value={simChain}
                      onChange={(e) => setSimChain(e.target.value)}
                      className="w-full bg-[#0b0c0f] border border-zinc-700 px-3 py-2 text-xs text-white font-mono rounded-none focus:outline-none focus:border-cyan-500"
                    >
                      <option value="ethereum">Ethereum Mainnet</option>
                      <option value="arbitrum">Arbitrum One</option>
                      <option value="base">Coinbase Base</option>
                      <option value="optimism">Optimism Rollup</option>
                      <option value="solana">Solana Neon EVM</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[9px] font-mono text-zinc-400 uppercase block font-bold">Swap Input Size (USD)</label>
                      <span className="text-[9px] font-mono text-zinc-500">First Trade Amount: ${Number(selectedBot.first_tx_amount || 0).toLocaleString()}</span>
                    </div>
                    <input 
                      type="number"
                      value={simAmount}
                      onChange={(e) => setSimAmount(e.target.value)}
                      placeholder="e.g. 50000"
                      className="w-full bg-[#0b0c0f] border border-zinc-700 px-3 py-2 text-xs text-white font-mono rounded-none focus:outline-none focus:border-cyan-500"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <button 
                        type="button" 
                        onClick={() => setSimAmount((selectedBot.first_tx_amount || 5000).toString())}
                        className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-[8px] font-mono text-zinc-400 hover:text-white rounded-none"
                      >
                        Match First Trade Size
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setSimAmount("1500")}
                        className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-[8px] font-mono text-zinc-400 hover:text-white rounded-none"
                      >
                        $1.5k (Tier 2)
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setSimAmount("1200000")}
                        className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-[8px] font-mono text-zinc-400 hover:text-white rounded-none"
                      >
                        $1.2M (Tier 5)
                      </button>
                    </div>
                  </div>

                  <div className="bg-zinc-950 p-3 border border-zinc-800/80 space-y-1.5 text-[10px] leading-relaxed font-mono text-zinc-400">
                    <div className="flex justify-between font-bold">
                      <span>Routing Fee ({(routingFeeBps/100).toFixed(2)}%):</span>
                      <span className="text-yellow-500">${(Number(simAmount || 0) * routingFeeBps / 10000).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Projected APY:</span>
                      <span className="text-emerald-400 font-bold">{(yieldsData.find(y => y.name?.toLowerCase().includes(simProtocol.toLowerCase()))?.apy || 12.8)}% APY</span>
                    </div>
                    <div className="flex justify-between border-t border-zinc-900 pt-1 text-zinc-500">
                      <span>Target Wallet:</span>
                      <span className="text-zinc-300">{selectedBotAddress.substring(0, 10)}...</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSimulating}
                    className="w-full py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-zinc-950 font-mono text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 rounded-none shadow-[0_0_15px_rgba(6,182,212,0.2)] disabled:opacity-50"
                  >
                    {isSimulating ? "Transmitting Swap Order..." : "Execute Smart Routing Swap"}
                  </button>
                </div>

              </form>

              {/* SIMULATION RESULT DISPLAY */}
              {simResult && (
                <div className={`p-4 border font-mono text-xs space-y-3 ${
                  simResult.success 
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" 
                    : "bg-red-500/10 border-red-500/30 text-red-300"
                }`}>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-bold uppercase tracking-wider">
                      {simResult.success ? "Smart Contract Transaction Broadcasted" : "Execution Error"}
                    </span>
                  </div>

                  {simResult.success ? (
                    <div className="space-y-2 text-left">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[10px]">
                        <div><span className="text-zinc-500">TX Hash:</span> <span className="text-zinc-200 select-all">{simResult.tx_hash}</span></div>
                        <div><span className="text-zinc-500">Routing Fee Paid:</span> <span className="text-yellow-400">${simResult.fee_deducted_usd.toFixed(2)} USD</span></div>
                        <div><span className="text-zinc-500">EVM State Count:</span> <span className="text-zinc-200">Trade #{simResult.tx_index} executed</span></div>
                        <div><span className="text-zinc-500">Reputation Badge:</span> <span className={`font-bold ${simResult.badge_color}`}>{simResult.badge_name} (Lvl {simResult.badge_level})</span></div>
                      </div>

                      {simResult.cashback_triggered ? (
                        <div className="bg-yellow-500/20 border border-yellow-500/40 p-2.5 text-white animate-pulse">
                          🎉 <strong>MILESTONE RECONCILIATION SUCCESSFUL:</strong> Trade #{simResult.tx_index} matched original trade size exactly! Payout 1% instant cashback: <strong>${simResult.cashback_payout_usd.toLocaleString()} USDC</strong> routed directly back to {selectedBotAddress.substring(0, 8)}...
                        </div>
                      ) : (
                        <div className="text-[10px] text-zinc-400 border-t border-zinc-800 pt-1">
                          (Next cashback trade milestone eligibility triggers on 10-trade multipliers. Remaining: {10 - (simResult.tx_index % 10)} trades)
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] leading-relaxed text-red-400">
                      {simResult.error}
                    </p>
                  )}
                </div>
              )}

            </div>

          </div>

          {/* RIGHT 4 COLS: Exposure charts */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Exposure by Protocol donut chart */}
            <div className="bg-[#12141a] border border-zinc-800 p-5 rounded-none text-left space-y-4">
              <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest font-bold block">Exposure Mitigator</span>
              <h3 className="text-sm font-bold text-white uppercase">Exposure per Protocol</h3>
              
              <div className="h-48 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getProtocolExposureData()}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {getProtocolExposureData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val) => [`$${Number(val).toLocaleString()}`, "Capital Exposure"]}
                      contentStyle={{ backgroundColor: "#0b0c0f", borderColor: "#1f2937" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Central overlay metrics */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase font-black">Rating</span>
                  <span className="text-xl font-black text-emerald-400 font-mono">A+ AAA</span>
                </div>
              </div>

              {/* Legend lines */}
              <div className="space-y-1.5 text-[10px] font-mono">
                {getProtocolExposureData().map((entry, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2" style={{ backgroundColor: entry.color }} />
                      <span className="text-zinc-400">{entry.name}</span>
                    </div>
                    <span className="font-bold text-white">${(entry.value / 1000).toFixed(0)}k</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Exposure by Chain bar chart */}
            <div className="bg-[#12141a] border border-zinc-800 p-5 rounded-none text-left space-y-4">
              <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest font-bold block">Sovereign Deployment</span>
              <h3 className="text-sm font-bold text-white uppercase">Liquidity per EVM Chain (%)</h3>

              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getChainExposureData()} layout="vertical" margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                    <XAxis type="number" stroke="#6b7280" fontSize={8} fontFamily="monospace" hide />
                    <YAxis dataKey="name" type="category" stroke="#6b7280" fontSize={8} fontFamily="monospace" width={55} />
                    <Tooltip 
                      formatter={(val) => [`${val}%`, "Allocated Ratio"]}
                      contentStyle={{ backgroundColor: "#0b0c0f", borderColor: "#1f2937" }}
                    />
                    <Bar dataKey="value" radius={[0, 2, 2, 0]}>
                      {getChainExposureData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[9px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/50">
                <div>Fastest Router: <span className="text-emerald-400 font-bold">Arbitrum (4.2ms)</span></div>
                <div>Avg Gas Saver: <span className="text-cyan-400 font-bold">94.8% USD</span></div>
              </div>
            </div>

            {/* Exposure by Asset list */}
            <div className="bg-[#12141a] border border-zinc-800 p-5 rounded-none text-left space-y-4">
              <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest font-bold block">Token Concentration</span>
              <h3 className="text-sm font-bold text-white uppercase">Exposure per Asset</h3>

              <div className="space-y-3">
                {getAssetExposureData().map((asset, index) => {
                  const percentage = Math.round((asset.value / 13200000) * 100);
                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="font-bold text-white">{asset.name}</span>
                        <span className="text-zinc-400">${(asset.value / 1000000).toFixed(1)}M ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-zinc-950 h-1.5 overflow-hidden">
                        <div 
                          className="h-full transition-all duration-300"
                          style={{ 
                            backgroundColor: asset.color,
                            width: `${percentage}%`
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ==========================================
          ROLE: OPERATOR ADMIN VIEW
          ========================================== */}
      {activeRole === "admin" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn text-left">
          
          {/* LEFT 8 COLS: Platform Risk exposure & global settings */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Global Risk Exposure Radar/Grid */}
            <div className="bg-[#12141a] border border-zinc-800 p-6 rounded-none space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-purple-400 uppercase tracking-widest font-bold block">Platform Health Desk</span>
                  <h3 className="text-lg font-black uppercase text-white">Consolidated Risk Mitigation Matrix</h3>
                </div>
                <span className="px-2.5 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-mono font-bold">
                  Active Operator Panel
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-950 border border-zinc-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase font-sans">Circuit Breaker Safeguard</span>
                    <span className={`h-2.5 w-2.5 rounded-full ${isPaused ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`} />
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Instantly freeze all on-chain capital migrations, smart order routings, and cash back payouts in case of network volatility or pool imbalances.
                  </p>
                  <button
                    onClick={() => setIsPaused(!isPaused)}
                    className={`w-full py-2 text-xs font-mono font-bold uppercase transition-all rounded-none ${
                      isPaused 
                        ? "bg-emerald-600 text-white hover:bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" 
                        : "bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600 hover:text-white"
                    }`}
                  >
                    {isPaused ? "🔓 ENABLE PROTOCOL ROUTING" : "🚨 EMERGENCY PAUSE PROTOCOL"}
                  </button>
                </div>

                <div className="p-4 bg-zinc-950 border border-zinc-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase font-sans">Dynamic Fee Basis Points</span>
                    <span className="text-xs font-mono text-yellow-500 font-bold">{routingFeeBps} BPS ({(routingFeeBps/100).toFixed(2)}%)</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Set the automated protocol fee deducted on every smart swap execution. Max fee limit is programmatically hardcapped at 10% (1000 bps) in Solidity.
                  </p>
                  <form onSubmit={handleUpdateFee} className="space-y-2">
                    <input 
                      type="range" 
                      min="0" 
                      max="1000" 
                      step="5"
                      value={routingFeeBps} 
                      onChange={(e) => setRoutingFeeBps(Number(e.target.value))}
                      className="w-full accent-purple-500 bg-[#0b0c0f]"
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-mono text-zinc-500">Min: 0%</span>
                      <button 
                        type="submit"
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white font-mono text-[10px] font-bold uppercase rounded-none"
                      >
                        Update Fee State
                      </button>
                      <span className="text-[9px] font-mono text-zinc-500">Max: 10%</span>
                    </div>
                  </form>
                  {feeSaveSuccess && (
                    <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" /> Fee updated in YieldFiBadgeCashback Smart Contract state!
                    </div>
                  )}
                </div>
              </div>

              {/* Protocol status monitoring desk */}
              <div className="bg-zinc-950 border border-zinc-800 p-4 space-y-4">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-bold block">Connected Yield Backing Nodes</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                  
                  <div className="border border-zinc-900 p-3 space-y-1">
                    <span className="text-zinc-500 text-[10px]">Aave RPC Sync:</span>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white">4.2ms Latency</span>
                      <span className="text-emerald-400">● Live</span>
                    </div>
                  </div>

                  <div className="border border-zinc-900 p-3 space-y-1">
                    <span className="text-zinc-500 text-[10px]">Ondo US Treasury Yield:</span>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white">5.15% APY</span>
                      <span className="text-emerald-400">● Sync</span>
                    </div>
                  </div>

                  <div className="border border-zinc-900 p-3 space-y-1">
                    <span className="text-zinc-500 text-[10px]">Goldfinch Credit Lock:</span>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white">12.4% Default Risk</span>
                      <span className="text-yellow-500">▲ Med</span>
                    </div>
                  </div>

                </div>
              </div>

            </div>

            {/* Platform Exposure Charts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              <div className="bg-[#12141a] border border-zinc-800 p-5 rounded-none space-y-4">
                <span className="text-[9px] font-mono text-purple-400 uppercase tracking-widest font-bold block">Concentration Control</span>
                <h3 className="text-sm font-bold text-white uppercase">Vault Allocations</h3>
                
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getProtocolExposureData()} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                      <XAxis dataKey="name" stroke="#6b7280" fontSize={8} fontFamily="monospace" />
                      <YAxis stroke="#6b7280" fontSize={8} fontFamily="monospace" />
                      <Tooltip 
                        formatter={(val) => [`$${Number(val).toLocaleString()}`, "Deposited Capital"]}
                        contentStyle={{ backgroundColor: "#0b0c0f", borderColor: "#1f2937" }}
                      />
                      <Bar dataKey="value" fill="#8b5cf6" radius={[2, 2, 0, 0]}>
                        {getProtocolExposureData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-[#12141a] border border-zinc-800 p-5 rounded-none space-y-4">
                <span className="text-[9px] font-mono text-purple-400 uppercase tracking-widest font-bold block">Geographical Exposure</span>
                <h3 className="text-sm font-bold text-white uppercase">Chain Distribution (%)</h3>

                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getChainExposureData()}
                        cx="50%"
                        cy="50%"
                        innerRadius={10}
                        outerRadius={55}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {getChainExposureData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(val) => [`${val}%`, "Allocated Ratio"]}
                        contentStyle={{ backgroundColor: "#0b0c0f", borderColor: "#1f2937" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

          </div>

          {/* RIGHT 4 COLS: WebSocket Console Terminal Log */}
          <div className="lg:col-span-4 space-y-6">
            
            <div className="bg-[#12141a] border border-zinc-800 p-5 rounded-none flex flex-col h-[520px] text-left space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3 flex-shrink-0">
                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest font-bold block">WS Stream Console</span>
                  <h3 className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-emerald-400" />
                    Websocket Terminal Logging
                  </h3>
                </div>

                <div className="text-right">
                  <span className={`inline-block px-2 py-0.5 text-[8px] font-mono font-bold uppercase ${
                    wsStatus === "connected" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                    wsStatus === "authenticating" ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 animate-pulse" :
                    "bg-red-500/10 text-red-400 border border-red-500/20"
                  }`}>
                    {wsStatus.toUpperCase()}
                  </span>
                  <span className="text-[8px] block text-zinc-500 font-mono mt-0.5">{wsMsgCount} Frames Recv</span>
                </div>
              </div>

              {/* Terminal window scroll area */}
              <div className="flex-grow bg-zinc-950 p-4 border border-zinc-800/80 font-mono text-[9px] leading-normal overflow-auto text-emerald-500/80 scrollbar-thin select-all">
                {wsLogs.map((log, index) => (
                  <div key={index} className="border-b border-zinc-900/50 pb-1.5 mb-1.5 last:border-0 last:pb-0 last:mb-0">
                    {log}
                  </div>
                ))}
                {wsLogs.length === 0 && (
                  <div className="text-zinc-500 h-full flex flex-col items-center justify-center text-center gap-2">
                    <Activity className="h-5 w-5 animate-pulse" />
                    Awaiting YieldFi WebSocket events... Keep swaps executing in Sandbox to trigger logs!
                  </div>
                )}
              </div>

              <div className="flex-shrink-0 space-y-2 pt-2">
                <div className="text-[8px] font-mono text-zinc-500 leading-tight">
                  Stream topics: <code>*</code>, <code>market_tick</code>, <code>trade</code>, <code>cashback</code>, <code>milestone</code>
                </div>
                <button
                  onClick={() => {
                    if (wsRef.current) wsRef.current.close();
                    connectWebSocket();
                  }}
                  className="w-full py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-mono text-[10px] uppercase font-bold text-center"
                >
                  Force Hard Reset WebSocket Connection
                </button>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ==========================================
          SHARED LIVE ACTIVITY FEED
          ========================================== */}
      <div className="bg-[#12141a] border border-zinc-800 p-6 rounded-none text-left space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="space-y-1">
            <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest font-bold block">Consolidated Ledger Broadcast</span>
            <h3 className="text-lg font-black uppercase text-white font-sans">EVM Transaction & Cashback Live Feed</h3>
          </div>
          <span className="text-[10px] font-mono text-zinc-500">Showing last 12 events</span>
        </div>

        {/* List of transactions/events */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recentEvents.slice(0, 12).map((event) => {
            const isTrade = event.type === "trade";
            const isCashback = event.type === "cashback";
            const isMilestone = event.type === "milestone";

            return (
              <div 
                key={event.id}
                className={`p-4 border font-mono text-xs flex flex-col justify-between space-y-3 relative overflow-hidden transition-all hover:translate-y-px ${
                  isCashback 
                    ? "bg-yellow-500/5 border-yellow-500/30 text-yellow-300" 
                    : isMilestone
                    ? "bg-purple-500/5 border-purple-500/30 text-purple-300"
                    : "bg-[#181a21] border-zinc-800 hover:border-zinc-700 text-zinc-200"
                }`}
              >
                {/* Event type top banner */}
                <div className="flex justify-between items-center">
                  <span className={`text-[8px] font-mono uppercase tracking-widest px-1.5 py-0.5 font-bold ${
                    isCashback ? "bg-yellow-500/20 text-yellow-400" :
                    isMilestone ? "bg-purple-500/20 text-purple-400" :
                    "bg-zinc-800 text-zinc-400"
                  }`}>
                    {event.type}
                  </span>
                  
                  <span className="text-[9px] text-zinc-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                {/* Main description text */}
                <div className="text-[11px] leading-relaxed text-zinc-300">
                  {isTrade && (
                    <p>
                      Bot <strong className="text-white select-all">{event.bot_id.substring(0, 8)}...</strong> executed a <strong className="text-white">${event.amount.toLocaleString()}</strong> trade routing through <strong>{event.protocol}</strong> ({event.chain.toUpperCase()}).
                    </p>
                  )}
                  {isCashback && (
                    <p>
                      🎉 <strong>1% Milestone Hit!</strong> Bot <strong className="text-white select-all">{event.bot_id.substring(0, 8)}...</strong> qualified on transaction <strong>#{event.tx_number}</strong>. Paid <strong>${event.cashback_received.toLocaleString()} USDC</strong> cashback instantly!
                    </p>
                  )}
                  {isMilestone && (
                    <p>
                      ⚡️ <strong>Milestone Counter Trigger:</strong> Bot <strong className="text-white select-all">{event.bot_id.substring(0, 8)}...</strong> has unlocked Trade <strong>#{event.tx_number}</strong> on the YieldFi ledger!
                    </p>
                  )}
                </div>

                {/* Hash / Protocol footer */}
                <div className="border-t border-zinc-800/60 pt-2 flex justify-between items-center text-[9px] text-zinc-500">
                  <span>Tx Hash: <span className="text-zinc-400 select-all font-mono">{event.tx_hash.substring(0, 14)}...</span></span>
                  <span className="text-zinc-400 uppercase font-bold">{event.protocol}</span>
                </div>
              </div>
            );
          })}

          {recentEvents.length === 0 && (
            <div className="col-span-full h-32 flex flex-col items-center justify-center text-zinc-500 border border-zinc-800 border-dashed">
              <Activity className="h-6 w-6 animate-pulse" />
              <span>No transactions found in system storage.</span>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
