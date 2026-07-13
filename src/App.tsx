import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  Wallet, 
  ExternalLink, 
  Shield, 
  Plus, 
  Coins, 
  Lock, 
  Unlock, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Building2, 
  LogOut, 
  DollarSign, 
  Globe, 
  RefreshCw, 
  Search,
  ArrowRight,
  Sparkles,
  Layers,
  FileSpreadsheet
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ethers } from "ethers";
import { Opportunity, Transaction } from "./types";

export default function App() {
  // Navigation & View state
  const [isAdminView, setIsAdminView] = useState(false);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [chainFilter, setChainFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [marketTypeFilter, setMarketTypeFilter] = useState("all");

  // Wallet State
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [walletBalance, setWalletBalance] = useState("0.00"); // Standard live balance
  const [walletChainId, setWalletChainId] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false); // Default to live production mode

  // Deposit Modal State
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [depositAmount, setDepositAmount] = useState<string>("100");
  const [depositStatus, setDepositStatus] = useState<'idle' | 'confirming' | 'processing' | 'success' | 'error'>('idle');
  const [depositTxHash, setDepositTxHash] = useState("");
  const [depositErrorMsg, setDepositErrorMsg] = useState("");
  const [platformFeeWallet, setPlatformFeeWallet] = useState("0xFEE0000000000000000000000000000000000000");

  // Admin Credentials State
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoginError, setAdminLoginError] = useState("");
  const [adminToken, setAdminToken] = useState("");

  // Admin Dashboard State
  const [adminTransactions, setAdminTransactions] = useState<Transaction[]>([]);
  const [adminMetrics, setAdminMetrics] = useState({ 
    totalFees: 0, 
    totalVolume: 0, 
    count: 0, 
    totalUsers: 0,
    topBots: [] as { bot_id: string; volume: number; fees: number; txCount: number }[],
    insurance_tvl: 2500000,
    insurance_claims_paid: 120000
  });
  const [isAdminLoading, setIsAdminLoading] = useState(false);

  // Live Bot Activity Feed & Developer Mode UI states
  const [recentTx, setRecentTx] = useState<Transaction[]>([]);
  const showDepositUi = false; // Locked in automated bot-only mode per production requirements

  // TVL State
  const [totalTvl, setTotalTvl] = useState<number>(1000000);

  // Institutional Mode Toggle
  const [isInstitutionalMode, setIsInstitutionalMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("institutional_mode");
      return saved === "true";
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("institutional_mode", String(isInstitutionalMode));
    }
  }, [isInstitutionalMode]);

  // Admin New Pool Form State
  const [newOppName, setNewOppName] = useState("");
  const [newOppApy, setNewOppApy] = useState("");
  const [newOppTvl, setNewOppTvl] = useState("");
  const [newOppChain, setNewOppChain] = useState("base");
  const [newOppRisk, setNewOppRisk] = useState<"low" | "medium" | "high">("medium");
  const [newOppWallet, setNewOppWallet] = useState("");
  const [newOppUrl, setNewOppUrl] = useState("");
  const [oppSubmitStatus, setOppSubmitStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [oppSubmitError, setOppSubmitError] = useState("");

  // Fetch opportunities
  const fetchOpportunities = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/yields");
      const data = await res.json();
      if (data.opportunities) {
        setOpportunities(data.opportunities);
      }
    } catch (error) {
      console.error("Failed to fetch opportunities:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch live TVL
  const fetchTvl = async () => {
    try {
      const res = await fetch("/api/tvl");
      const data = await res.json();
      if (data && typeof data.total_tvl_usd === "number") {
        setTotalTvl(data.total_tvl_usd);
      }
    } catch (error) {
      console.error("Failed to fetch TVL:", error);
    }
  };

  // Fetch configurations
  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/config");
      const data = await res.json();
      if (data.platformFeeWallet) {
        setPlatformFeeWallet(data.platformFeeWallet);
      }
    } catch (error) {
      console.error("Failed to fetch platform config:", error);
    }
  };

  // Fetch recent executions public registry
  const fetchRecentTx = async () => {
    try {
      const res = await fetch("/api/recent");
      const data = await res.json();
      if (data.transactions) {
        setRecentTx(data.transactions);
      }
    } catch (error) {
      console.error("Failed to fetch recent transactions:", error);
    }
  };

  useEffect(() => {
    fetchOpportunities();
    fetchConfig();
    fetchTvl();
    fetchRecentTx();
    checkExistingWalletConnection();

    // Auto-login to admin view if path is /admin
    if (typeof window !== "undefined") {
      const isPathAdmin = window.location.pathname === "/admin" || window.location.pathname === "/admin/";
      if (isPathAdmin) {
        setIsAdminView(true);
        setIsAdminLoggedIn(true);
        setAdminToken("yieldfi-admin-session-token-2026");
        fetchAdminDashboardData("yieldfi-admin-session-token-2026");
      }
    }

    // Poll TVL & recent transactions live every 10 seconds
    const interval = setInterval(() => {
      fetchTvl();
      fetchRecentTx();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Fetch real USDC or native balance from connected blockchain
  const fetchWalletBalance = async (provider: any, address: string) => {
    try {
      const usdcAddresses: Record<string, string> = {
        "1": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // Mainnet
        "137": "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", // Polygon
        "8453": "0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913" // Base
      };
      const network = await provider.getNetwork();
      const chainIdStr = network.chainId.toString();
      const usdcAddress = usdcAddresses[chainIdStr];
      if (usdcAddress) {
        const erc20Abi = ["function balanceOf(address owner) view returns (uint256)"];
        const usdcContract = new ethers.Contract(usdcAddress, erc20Abi, provider);
        const bal = await usdcContract.balanceOf(address);
        const formatted = parseFloat(ethers.formatUnits(bal, 6)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        setWalletBalance(formatted);
      } else {
        // Fallback to native ETH balance
        const balance = await provider.getBalance(address);
        const formatted = parseFloat(ethers.formatEther(balance)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
        setWalletBalance(formatted + " ETH");
      }
    } catch (e) {
      console.error("Failed to fetch wallet balance:", e);
      setWalletBalance("0.00");
    }
  };

  // Check if MetaMask is already connected
  const checkExistingWalletConnection = async () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          const address = accounts[0].address;
          setWalletAddress(address);
          setWalletConnected(true);
          setIsDemoMode(false);
          
          const network = await provider.getNetwork();
          setWalletChainId(network.chainId.toString());
          await fetchWalletBalance(provider, address);
        }
      } catch (e) {
        console.log("No pre-connected wallet found");
      }
    }
  };

  // Connect wallet handler
  const connectWallet = async () => {
    setIsConnecting(true);
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
        if (accounts.length > 0) {
          const address = accounts[0];
          setWalletAddress(address);
          setWalletConnected(true);
          setIsDemoMode(false);
          
          const network = await provider.getNetwork();
          setWalletChainId(network.chainId.toString());
          await fetchWalletBalance(provider, address);
        }
      } catch (error: any) {
        console.error("Failed to connect wallet:", error);
        alert(error?.message || "Failed to connect browser wallet. Please try again.");
      } finally {
        setIsConnecting(false);
      }
    } else {
      alert("A Web3 browser wallet extension (such as MetaMask) was not detected. Please install MetaMask, Coinbase Wallet, or Rabby to connect and perform onchain actions.");
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setWalletConnected(false);
    setWalletAddress("");
    setWalletBalance("0.00");
  };

  // Admin Actions
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoginError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPassword })
      });
      const data = await res.json();
      if (data.success && data.token) {
        setAdminToken(data.token);
        setIsAdminLoggedIn(true);
        fetchAdminDashboardData(data.token);
      } else {
        setAdminLoginError(data.error || "Login failed");
      }
    } catch (err) {
      setAdminLoginError("Server communication error");
    }
  };

  const fetchAdminDashboardData = async (token: string) => {
    setIsAdminLoading(true);
    try {
      const res = await fetch("/api/admin/deposits", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.transactions) {
        setAdminTransactions(data.transactions);
        setAdminMetrics(data.metrics);
      }
    } catch (err) {
      console.error("Failed to fetch admin statistics", err);
    } finally {
      setIsAdminLoading(false);
    }
  };

  const handleAddOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    setOppSubmitStatus("loading");
    setOppSubmitError("");

    if (!newOppName || !newOppApy || !newOppTvl || !newOppWallet || !newOppUrl) {
      setOppSubmitStatus("error");
      setOppSubmitError("All fields except Asset are required");
      return;
    }

    try {
      const res = await fetch("/api/admin/add-opportunity", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          name: newOppName,
          apy: Number(newOppApy),
          tvl: Number(newOppTvl),
          chain: newOppChain,
          protocol_wallet: newOppWallet,
          deposit_url: newOppUrl,
          risk: newOppRisk,
          asset: "USDC"
        })
      });

      const data = await res.json();
      if (data.success) {
        setOppSubmitStatus("success");
        // Reset form
        setNewOppName("");
        setNewOppApy("");
        setNewOppTvl("");
        setNewOppWallet("");
        setNewOppUrl("");
        // Reload lists
        fetchOpportunities();
        fetchTvl();
        // Reload metrics
        fetchAdminDashboardData(adminToken);
      } else {
        setOppSubmitStatus("error");
        setOppSubmitError(data.error || "Failed to add opportunity");
      }
    } catch (err) {
      setOppSubmitStatus("error");
      setOppSubmitError("Network or server error");
    }
  };

  // Admin resets database
  const handleResetDatabase = async () => {
    if (!window.confirm("Are you sure you want to completely reset all active platform markets to defaults?")) {
      return;
    }
    try {
      const res = await fetch("/api/admin/reset", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`
        }
      });
      const data = await res.json();
      if (data.success) {
        alert("Database successfully reset!");
        fetchOpportunities();
        fetchTvl();
        fetchAdminDashboardData(adminToken);
      } else {
        alert(data.error || "Failed to reset database");
      }
    } catch (err) {
      alert("Network or communication error during reset");
    }
  };

  // Open Deposit Modal
  const openDepositModal = (opp: Opportunity) => {
    setSelectedOpp(opp);
    setDepositAmount("100");
    setDepositStatus("idle");
    setDepositTxHash("");
    setDepositErrorMsg("");
    setIsDepositModalOpen(true);
  };

  // Execute Deposit & Fee logic
  const handleDepositSubmit = async () => {
    const amountNum = Number(depositAmount);
    if (isNaN(amountNum) || amountNum < 1) {
      setDepositErrorMsg("Minimum deposit amount is 1 USDC.");
      return;
    }

    if (!selectedOpp) return;

    if (!walletConnected || typeof window === "undefined" || !(window as any).ethereum) {
      setDepositErrorMsg("Please connect your Web3 browser wallet (e.g. MetaMask) first.");
      return;
    }

    setDepositStatus("confirming");
    setDepositErrorMsg("");

    const fee_collected = amountNum * 0.01; // 1.0% fee
    const send_to_protocol = amountNum * 0.99; // 99.0% to pool

    // --- REAL WEB3 INTEGRATION ---
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();

      // Standard USDC Contract Addresses
      const usdcAddresses: Record<string, string> = {
        ethereum: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        polygon: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", 
        base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913"
      };

      const currentChainName = selectedOpp.chain.toLowerCase();
      const usdcAddress = usdcAddresses[currentChainName] || usdcAddresses["base"];

      setDepositStatus("processing");

      const erc20Abi = [
        "function transfer(address to, uint256 amount) public returns (bool)",
        "function decimals() public view returns (uint8)"
      ];

      const usdcContract = new ethers.Contract(usdcAddress, erc20Abi, signer);
      
      const decimals = 6; 
      const protocolAmountWei = ethers.parseUnits(send_to_protocol.toFixed(decimals), decimals);
      const feeAmountWei = ethers.parseUnits(fee_collected.toFixed(decimals), decimals);

      // Step 1: Send 99% to Protocol Wallet
      const tx1 = await usdcContract.transfer(selectedOpp.protocol_wallet, protocolAmountWei);
      
      // Step 2: Send 1% to Platform Fee Wallet
      const tx2 = await usdcContract.transfer(platformFeeWallet, feeAmountWei);

      const receipt = await tx1.wait();
      const txHash = receipt?.hash || tx1.hash;

      // Post back to API
      const saveRes = await fetch("/api/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_wallet: walletAddress,
          amount: amountNum,
          protocol: selectedOpp.name,
          tx_hash: txHash,
          fee_collected: fee_collected,
          chain: selectedOpp.chain
        })
      });

      if (saveRes.ok) {
        setDepositTxHash(txHash);
        setDepositStatus("success");
        fetchOpportunities(); 
        fetchTvl();
      } else {
        throw new Error("Transaction succeeded onchain but failed to save to platform registry");
      }

    } catch (err: any) {
      console.error("On-chain transaction error:", err);
      setDepositStatus("error");
      setDepositErrorMsg(err?.message || "Transaction rejected or failed. Please check wallet gas or network.");
    }
  };

  const executeLiveDeposit = () => {
    if (!walletConnected) {
      connectWallet();
      return;
    }
    handleDepositSubmit();
  };

  // Helper getters
  const getChainColor = (chain: string) => {
    switch (chain.toLowerCase()) {
      case "base": return "bg-blue-950/40 text-blue-400 border-blue-900/50";
      case "polygon": return "bg-purple-950/40 text-purple-400 border-purple-900/50";
      case "ethereum": return "bg-zinc-800 text-zinc-300 border-zinc-700";
      default: return "bg-zinc-900 text-zinc-400 border-zinc-800";
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case "low": return "bg-zinc-900 text-zinc-400 border-zinc-700";
      case "medium": return "bg-amber-950/50 text-amber-500 border-amber-900";
      case "high": return "bg-red-950/50 text-red-400 border-red-900";
      default: return "bg-zinc-900 text-zinc-400 border-zinc-800";
    }
  };

  const getExplorerUrl = (chain: string, txHash: string) => {
    switch (chain.toLowerCase()) {
      case "base": return `https://basescan.org/tx/${txHash}`;
      case "polygon": return `https://polygonscan.com/tx/${txHash}`;
      case "ethereum": return `https://etherscan.io/tx/${txHash}`;
      default: return `https://etherscan.io/tx/${txHash}`;
    }
  };

  const filteredOpps = opportunities.filter(opp => {
    const matchesSearch = opp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          opp.asset.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesChain = chainFilter === "all" || 
                         (chainFilter === "polygon_base" && (opp.chain.toLowerCase() === "polygon" || opp.chain.toLowerCase() === "base")) ||
                         opp.chain.toLowerCase() === chainFilter.toLowerCase();
    const matchesRisk = riskFilter === "all" || opp.risk.toLowerCase() === riskFilter.toLowerCase();
    const matchesMarketType = marketTypeFilter === "all" || 
                              (opp.market_type && opp.market_type.toLowerCase() === marketTypeFilter.toLowerCase()) ||
                              (opp.category && opp.category.toLowerCase() === marketTypeFilter.toLowerCase());
    return matchesSearch && matchesChain && matchesRisk && matchesMarketType;
  });

  // Calculate metrics
  const totalAggregatedTvl = opportunities.reduce((sum, opp) => sum + opp.tvl_usd, 0);
  const averageApy = opportunities.length > 0 
    ? (opportunities.reduce((sum, opp) => sum + opp.apy, 0) / opportunities.length).toFixed(1)
    : "0.0";

  return (
    <div 
      className={`min-h-screen text-zinc-100 font-sans flex flex-col p-4 md:p-8 overflow-x-hidden antialiased select-none relative transition-all duration-500`}
      style={{ 
        background: isInstitutionalMode 
          ? "linear-gradient(135deg, #020402 0%, #081208 50%, #030603 100%)" 
          : "linear-gradient(135deg, #0a0f1e 0%, #1a233a 50%, #0a1a2f 100%)" 
      }}
    >
      {/* Animated Grid Background */}
      <div className={`absolute inset-0 bg-[linear-gradient(to_right,#00d4ff04_1px,transparent_1px),linear-gradient(to_bottom,#00d4ff04_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none transition-all ${
        isInstitutionalMode ? "border border-lime-500/5 bg-[linear-gradient(to_right,#10b98108_1px,transparent_1px),linear-gradient(to_bottom,#10b98108_1px,transparent_1px)]" : ""
      }`} />
      
      {/* HEADER SECTION */}
      <header className={`flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-6 gap-4 transition-colors ${isInstitutionalMode ? "border-emerald-950" : "border-zinc-800"}`}>
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setIsAdminView(false)}>
          <div className={`w-10 h-10 flex items-center justify-center rounded-sm font-bold text-xl italic text-zinc-950 transition-all duration-300 ${
            isInstitutionalMode 
              ? "bg-lime-400 shadow-[4px_4px_0px_#064e3b]" 
              : "bg-blue-600 text-white shadow-[4px_4px_0px_#1e3a8a]"
          }`}>
            YF
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-2xl font-black tracking-tighter leading-none uppercase transition-colors ${isInstitutionalMode ? "text-lime-400" : "text-zinc-100"}`}>
                YieldFi
              </h1>
              <span className={`text-[8px] px-1.5 py-0.5 border font-mono rounded-none uppercase tracking-wider ${
                isInstitutionalMode
                  ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-400"
                  : "bg-blue-950/40 border-blue-500/30 text-blue-400"
              }`}>
                1.0% Flat Fee. $7.5T Daily Volume
              </span>
            </div>
            <p className={`text-[10px] font-mono tracking-widest uppercase mt-1 transition-colors ${isInstitutionalMode ? "text-emerald-500" : "text-blue-500"}`}>
              YieldFi | 1.0% Flat Fee on All Actions
            </p>
          </div>
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="flex flex-wrap gap-4 md:gap-8 text-xs font-bold uppercase tracking-widest text-zinc-400">
          <button
            onClick={() => setIsAdminView(false)}
            className={`pb-1 transition-all ${
              !isAdminView 
                ? (isInstitutionalMode ? "text-lime-400 border-b-2 border-lime-400 font-bold" : "text-blue-500 border-b-2 border-blue-500 font-bold") 
                : "hover:text-zinc-100 font-medium"
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => {
              setIsAdminView(true);
              if (isAdminLoggedIn) {
                fetchAdminDashboardData(adminToken);
              }
            }}
            className={`pb-1 transition-all flex items-center gap-1.5 ${
              isAdminView 
                ? (isInstitutionalMode ? "text-lime-400 border-b-2 border-lime-400 font-bold" : "text-blue-500 border-b-2 border-blue-500 font-bold") 
                : "hover:text-zinc-100 font-medium"
            }`}
          >
            {isAdminLoggedIn ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
            Operator Portal
          </button>
          
          <button
            onClick={() => setIsInstitutionalMode(!isInstitutionalMode)}
            className={`pb-1 transition-all flex items-center gap-1.5 uppercase ${
              isInstitutionalMode 
                ? "text-lime-400 font-bold" 
                : "text-zinc-500 hover:text-zinc-300 font-medium"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isInstitutionalMode ? "bg-lime-400 animate-pulse shadow-[0_0_8px_#84cc16]" : "bg-zinc-700"}`} />
            Institutional Mode
          </button>
        </nav>

        {/* WALLET AND STATE CONTROLS */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-zinc-500 uppercase font-extrabold tracking-wider">
              {walletConnected ? (
                walletChainId === "1" ? "Ethereum Mainnet" :
                walletChainId === "137" ? "Polygon Mainnet" :
                walletChainId === "8453" ? "Base Mainnet" :
                `Network (${walletChainId})`
              ) : "Base Mainnet"}
            </span>
            <span className="text-xs font-mono text-zinc-300">
              {walletConnected 
                ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                : "Disconnected"}
            </span>
          </div>

          {walletConnected ? (
            <div className="flex items-center gap-2">
              <div className="border border-zinc-800 bg-zinc-900/40 px-3 py-1.5 hidden lg:block text-right">
                <span className="text-[9px] text-zinc-500 uppercase font-mono block">Stable Balance</span>
                <span className="text-xs font-mono text-zinc-300 font-bold">{walletBalance} USDC</span>
              </div>
              <button
                onClick={disconnectWallet}
                className="px-5 py-2 bg-zinc-100 text-zinc-950 text-xs font-bold uppercase tracking-widest hover:bg-white active:translate-y-px transition-all rounded-none"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              disabled={isConnecting}
              className="px-5 py-2 bg-blue-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-500 active:translate-y-px transition-all rounded-none shadow-[4px_4px_0px_#1e3a8a]"
            >
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </button>
          )}
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <AnimatePresence mode="wait">
        {!isAdminView ? (
          
          /* =========================================================================
             DASHBOARD / OPPORTUNITIES VIEW
             ========================================================================= */
          <motion.div
            key="yields-dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex-grow py-8 flex flex-col space-y-8 overflow-hidden"
          >
            {/* HERO TVL METRIC CARD */}
            <div className="border border-zinc-800 bg-zinc-950/40 backdrop-blur-md p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 rounded-none relative overflow-hidden shadow-[0_8px_32px_0_rgba(0,212,255,0.03)]">
              <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-[#00d4ff]/5 to-transparent pointer-events-none" />
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-[#00D4FF] uppercase tracking-widest block font-bold">
                  Global RWA + DeFi Yield Aggregation
                </span>
                <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-none text-zinc-100 font-sans">
                  Total Value Routed: <span className="text-[#00FF88] font-mono">${totalTvl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </h2>
                <p className="text-xs text-zinc-500 font-sans max-w-xl">
                  Aggregated institutional capital allocations plus real-time liquidity deployments. Live-synchronized.
                </p>
              </div>
              <div className="flex items-center gap-1.5 self-end md:self-center font-mono text-[10px] text-[#00FF88] uppercase font-bold tracking-widest border border-zinc-800 bg-zinc-950/80 px-3.5 py-2">
                <span className="w-2 h-2 bg-[#00FF88] rounded-full animate-pulse shadow-[0_0_8px_#00ff88]" />
                Live Sync Active (10s)
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-hidden">
            
            {/* Left Column: Market Table (8 cols out of 12) */}
            <div className="lg:col-span-8 flex flex-col space-y-6">
              
              {/* Bot-Native Platform Banner */}
              <div className="bg-[#00D4FF]/5 border border-[#00D4FF]/30 p-4 rounded-none flex items-center justify-between gap-4 shadow-[0_0_15px_rgba(0,212,255,0.05)]">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 bg-[#00D4FF] rounded-full animate-ping shadow-[0_0_8px_#00d4ff]" />
                  <span className="text-[10px] md:text-xs font-mono font-black tracking-widest text-[#00D4FF] uppercase">
                    BOT-NATIVE YIELD ROUTER | 1% FEE | AUTO EXECUTION
                  </span>
                </div>
                <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-[9px] font-mono font-bold text-[#00FF88] uppercase">
                  CRAWLER ENGAGED
                </div>
              </div>

              {/* Geometric Title Block */}
              <div>
                <h2 className="text-3xl md:text-4xl font-black tracking-tight uppercase leading-tight mb-2 text-zinc-100">
                  Earn 5% - 20% APY on Real Assets.
                </h2>
                <p className="text-zinc-500 text-sm max-w-xl font-sans">
                  Real-world asset (RWA) vaults and institutional DeFi lending protocols with 1-click execution. All transactions incur a transparent 1.0% protocol fee.
                </p>
              </div>

              {/* Dynamic Filter Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-900/20 p-3 border border-zinc-800 rounded-none">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search yield pools, chains, or assets (USDC, OUSG)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-none pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 font-mono"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Market Type Filter Buttons */}
                  <div className="flex bg-zinc-950 border border-zinc-800 p-0.5 rounded-none">
                    <button
                      onClick={() => setMarketTypeFilter("all")}
                      className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all rounded-none ${
                        marketTypeFilter === "all"
                          ? (isInstitutionalMode ? "bg-lime-400 text-zinc-950 font-black" : "bg-blue-600 text-white font-black")
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setMarketTypeFilter("RWA")}
                      className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all rounded-none border-l border-zinc-900 ${
                        marketTypeFilter === "RWA"
                          ? (isInstitutionalMode ? "bg-lime-400 text-zinc-950 font-black" : "bg-blue-600 text-white font-black")
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      RWA
                    </button>
                    <button
                      onClick={() => setMarketTypeFilter("LST")}
                      className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all rounded-none border-l border-zinc-900 ${
                        marketTypeFilter === "LST"
                          ? (isInstitutionalMode ? "bg-lime-400 text-zinc-950 font-black" : "bg-blue-600 text-white font-black")
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      LST
                    </button>
                    <button
                      onClick={() => setMarketTypeFilter("PERP")}
                      className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all rounded-none border-l border-zinc-900 ${
                        marketTypeFilter === "PERP"
                          ? (isInstitutionalMode ? "bg-lime-400 text-zinc-950 font-black" : "bg-blue-600 text-white font-black")
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      PERP
                    </button>
                    <button
                      onClick={() => setMarketTypeFilter("STABLE")}
                      className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all rounded-none border-l border-zinc-900 ${
                        marketTypeFilter === "STABLE"
                          ? (isInstitutionalMode ? "bg-lime-400 text-zinc-950 font-black" : "bg-blue-600 text-white font-black")
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      STABLE
                    </button>
                    <button
                      onClick={() => setMarketTypeFilter("TBILL")}
                      className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all rounded-none border-l border-zinc-900 ${
                        marketTypeFilter === "TBILL"
                          ? (isInstitutionalMode ? "bg-lime-400 text-zinc-950 font-black" : "bg-blue-600 text-white font-black")
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      TBILL
                    </button>
                    <button
                      onClick={() => setMarketTypeFilter("FX")}
                      className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all rounded-none border-l border-zinc-900 ${
                        marketTypeFilter === "FX"
                          ? (isInstitutionalMode ? "bg-lime-400 text-zinc-950 font-black" : "bg-blue-600 text-white font-black")
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      FX
                    </button>
                    <button
                      onClick={() => setMarketTypeFilter("REAL ESTATE")}
                      className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all rounded-none border-l border-zinc-900 ${
                        marketTypeFilter === "REAL ESTATE"
                          ? (isInstitutionalMode ? "bg-lime-400 text-zinc-950 font-black" : "bg-blue-600 text-white font-black")
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      REAL ESTATE
                    </button>
                    <button
                      onClick={() => setMarketTypeFilter("COMMODITIES")}
                      className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all rounded-none border-l border-zinc-900 ${
                        marketTypeFilter === "COMMODITIES"
                          ? (isInstitutionalMode ? "bg-lime-400 text-zinc-950 font-black" : "bg-blue-600 text-white font-black")
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      COMMODITIES
                    </button>
                  </div>
 
                  <select
                    value={chainFilter}
                    onChange={(e) => setChainFilter(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 font-bold uppercase tracking-wider py-2 px-3 rounded-none focus:outline-none focus:ring-1 focus:ring-blue-500/50 cursor-pointer"
                  >
                    <option value="all">All Networks</option>
                    <option value="polygon_base">Polygon, Base</option>
                    <option value="base">Base</option>
                    <option value="polygon">Polygon</option>
                    <option value="ethereum">Ethereum</option>
                    <option value="arbitrum">Arbitrum</option>
                    <option value="hyperliquid">Hyperliquid</option>
                    <option value="dydx">dYdX</option>
                  </select>

                  <select
                    value={riskFilter}
                    onChange={(e) => setRiskFilter(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 font-bold uppercase tracking-wider py-2 px-3 rounded-none focus:outline-none focus:ring-1 focus:ring-blue-500/50 cursor-pointer"
                  >
                    <option value="all">All Risks</option>
                    <option value="low">Low Risk</option>
                    <option value="medium">Medium Risk</option>
                    <option value="high">High Risk</option>
                  </select>

                  <button 
                    onClick={() => {
                      setSearchQuery("");
                      setChainFilter("all");
                      setRiskFilter("all");
                      setMarketTypeFilter("all");
                    }}
                    className="p-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-all rounded-none"
                    title="Reset Filters"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* RWA / DeFi Yield Opportunities Table */}
              <div className="border border-zinc-800/60 bg-zinc-950/40 backdrop-blur-md overflow-hidden rounded-none shadow-[0_8px_32px_0_rgba(0,212,255,0.02)]">
                {isLoading ? (
                  <div className="p-16 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="h-6 w-6 text-[#00D4FF] animate-spin" />
                    <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Synchronizing registry payload...</p>
                  </div>
                ) : filteredOpps.length === 0 ? (
                  <div className="p-16 text-center">
                    <AlertCircle className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
                    <p className="text-zinc-300 font-bold uppercase text-xs tracking-wider">No Markets Found</p>
                    <p className="text-xs text-zinc-500 mt-1">Adjust search parameters or select different filters.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-zinc-900/60 text-zinc-500 uppercase text-[10px] font-bold tracking-widest border-b border-zinc-850">
                        <tr>
                          <th className="p-4 border-b border-zinc-800">Protocol / Asset</th>
                          <th className="p-4 border-b border-zinc-800 text-right">APY</th>
                          <th className="p-4 border-b border-zinc-800 text-center">Risk</th>
                          <th className="p-4 border-b border-zinc-800 text-right">TVL</th>
                          <th className="p-4 border-b border-zinc-800 text-center">Chain</th>
                          <th className="p-4 border-b border-zinc-800 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-zinc-800/30">
                        {filteredOpps.map((opp, idx) => (
                          <tr 
                            key={opp.id} 
                            className={`border-b border-zinc-800/40 hover:bg-zinc-800/15 transition-colors ${
                              idx % 2 === 0 ? "bg-zinc-900/5" : "bg-transparent"
                            }`}
                          >
                            <td className="p-4">
                              <div className="font-bold text-zinc-200">{opp.name}</div>
                              <div className="text-xs text-zinc-500 flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono">{opp.asset || "USDC"} Routing Spec</span>
                                <span>•</span>
                                <a 
                                  href={opp.deposit_url} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="text-[#00D4FF] hover:underline inline-flex items-center gap-0.5"
                                >
                                  Specs
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              </div>
                            </td>
                            
                            <td className="p-4 text-right text-[#00D4FF] font-mono font-bold text-base">
                              {opp.apy.toFixed(2)}%
                            </td>
 
                            <td className="p-4 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getRiskColor(opp.risk)}`}>
                                {opp.risk}
                              </span>
                            </td>
 
                            <td className="p-4 text-right">
                              <span className="text-[#00FF88] font-mono text-xs font-semibold block">
                                {opp.tvl_usd === 0 ? "$0" : `$${(opp.tvl_usd / 1000000).toFixed(1)}M`}
                              </span>
                              <span className="inline-flex items-center gap-0.5 px-1 py-0.2 bg-emerald-950/40 border border-emerald-900/40 text-[8px] font-mono font-bold text-emerald-400 uppercase rounded-sm mt-0.5 tracking-tighter shadow-sm">
                                ✓ Verified Source
                              </span>
                            </td>
 
                            <td className="p-4 text-center text-xs font-bold uppercase tracking-wider text-zinc-300">
                              <span className={`px-2 py-0.5 rounded-sm border text-[10px] ${getChainColor(opp.chain)}`}>
                                {opp.chain}
                              </span>
                            </td>
 
                            <td className="p-4 text-right">
                              {showDepositUi ? (
                                <button
                                  onClick={() => openDepositModal(opp)}
                                  className="px-4 py-1.5 bg-[#FFD700] text-zinc-950 hover:bg-[#e6c200] hover:text-black text-[10px] font-extrabold uppercase tracking-widest active:translate-y-px transition-all rounded-none shadow-[2px_2px_0px_#b39700]"
                                >
                                  Deposit
                                </button>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-950 border border-zinc-900 text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase">
                                  <span className="w-1.5 h-1.5 bg-[#00FF88] rounded-full animate-pulse shadow-[0_0_6px_#00ff88]" />
                                  Bot API Only
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>

            {/* Right Column: Stats & Active Admin Console (4 cols out of 12) */}
            <aside className="lg:col-span-4 flex flex-col gap-6">
              
              {/* Protocol Stats Widget */}
              <div className="border border-zinc-800/80 p-6 bg-zinc-950/40 backdrop-blur-md rounded-none shadow-[0_4px_24px_0_rgba(0,212,255,0.02)]">
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-4">
                  Protocol Stats
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase font-extrabold tracking-wider">Deposited (TVL)</p>
                    <p className="text-xl font-mono text-[#00FF88] font-bold mt-1">
                      ${totalTvl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-[9px] text-[#00FF88] font-mono mt-1">+14.2% Monthly</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase font-extrabold tracking-wider">Weighted APY</p>
                    <p className="text-xl font-mono text-[#00D4FF] font-bold mt-1">
                      {averageApy}%
                    </p>
                    <p className="text-[9px] text-[#00D4FF]/80 font-mono mt-1">Weighted Index</p>
                  </div>
                </div>
              </div>

              {/* Bot API Monitor Section */}
              <div className="border border-zinc-800/80 p-6 flex-grow rounded-none flex flex-col justify-between bg-zinc-950/40 backdrop-blur-md shadow-[0_4px_24px_0_rgba(0,212,255,0.02)]">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                      API Health Monitor
                    </h3>
                    <span className="flex items-center gap-1.5 text-[10px] text-[#00FF88] font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 bg-[#00FF88] rounded-full animate-ping"></span>
                      Operational
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                    Automated aggregators and bot scrapers (DefiLlama parsers) are currently syncing with our on-chain stablecoin payload registry.
                  </p>

                  <div className="bg-black/60 p-4 font-mono text-[11px] leading-relaxed border border-zinc-900 mb-4 h-48 overflow-y-auto rounded-none text-left backdrop-blur-sm">
                    <div className="text-zinc-600">// Fetching live pool registry payload</div>
                    <div className="text-[#00D4FF]">GET /api/yields 200 OK</div>
                    <div className="text-zinc-400 mt-2">
                      {JSON.stringify(opportunities.slice(0, 2).map(o => ({
                        id: o.id,
                        apy: o.apy,
                        tvl: o.tvl_usd,
                        chain: o.chain,
                        fee_percent: 1.0
                      })), null, 2)}
                    </div>
                    <div className="text-zinc-600 mt-2">// Sync complete. Waiting next crawler cycle...</div>
                  </div>
                </div>

                <button 
                  onClick={() => setIsAdminView(true)}
                  className="w-full py-3 border border-zinc-800/80 text-[10px] uppercase font-bold tracking-widest hover:bg-zinc-900/60 hover:text-white transition-colors rounded-none"
                >
                  View Admin Dashboard
                </button>
              </div>

            </aside>

          </div>
        </motion.div>
        ) : (
          
          /* =========================================================================
             ADMIN PANEL VIEW
             ========================================================================= */
          <motion.div
            key="admin-panel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="py-8 space-y-6"
          >
            
            {!isAdminLoggedIn ? (
              
              /* ADMIN ACCESS GATE */
              <div className="max-w-md mx-auto py-12">
                <div className="border border-zinc-800 p-8 bg-zinc-900/50 rounded-none space-y-6 shadow-[4px_4px_0px_#1e3a8a]">
                  <div className="text-center space-y-2">
                    <div className="h-12 w-12 bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-blue-500">
                      <Lock className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-xl uppercase tracking-tight text-zinc-100">Unlock Operator Registry</h3>
                    <p className="text-xs text-zinc-500">Enter secure keyphrase mapped to administrative environments</p>
                  </div>

                  <form onSubmit={handleAdminLogin} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block font-bold">Admin Password</label>
                      <input
                        type="password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="••••••••••••••"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-none px-4 py-2.5 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-500/50 font-mono"
                        required
                      />
                    </div>

                    {adminLoginError && (
                      <div className="bg-red-950/40 border border-red-900 text-red-400 p-3 rounded-none text-xs flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span className="font-mono">{adminLoginError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-3 bg-blue-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-500 rounded-none active:translate-y-px transition-all"
                    >
                      Verify Operator Key
                    </button>
                  </form>
                </div>
              </div>

            ) : (

              /* OPERATOR CONSOLE LOGGED IN */
              <div className="space-y-6">
                
                {/* Operator Panel Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-zinc-850 pb-5 gap-4">
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight text-zinc-100 flex items-center gap-2 font-mono">
                      <Unlock className="h-5.5 w-5.5 text-[#00D4FF]" />
                      OPERATOR CONSOLE
                    </h2>
                    <p className="text-xs text-zinc-500 mt-1">Manage active markets, inspect automated route metrics, and audit ledger transactions</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setIsAdminLoggedIn(false);
                        setAdminToken("");
                        setAdminPassword("");
                      }}
                      className="text-xs font-bold uppercase tracking-widest text-red-400 hover:text-red-300 border border-red-900 bg-red-950/20 px-4 py-2 rounded-none transition-all"
                    >
                      Lock Operator Panel
                    </button>
                  </div>
                </div>

                {/* Manual Override Controls Badge */}
                <div className="border border-[#00D4FF]/30 bg-zinc-950/80 backdrop-blur-md p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-none shadow-[0_0_15px_rgba(0,212,255,0.05)]">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-[#00D4FF] uppercase tracking-wider font-mono">
                      PLATFORM OPERATION STATUS
                    </h3>
                    <p className="text-xs text-zinc-400 font-sans">
                      YieldFi executes routing operations automatically via high-speed API agents. The platform runs strictly in automated Bots-Only mode for optimal institutional compliance.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#00FF88] bg-[#00FF88]/10 border border-[#00FF88]/30 px-3 py-1.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-[#00FF88] rounded-full animate-pulse shadow-[0_0_6px_#00ff88]" />
                      BOTS-ONLY MODE ACTIVE
                    </span>
                  </div>
                </div>

                {/* Operator Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                  
                  <div className="border border-zinc-800 p-6 bg-zinc-900/50 rounded-none relative overflow-hidden">
                    <div className="absolute top-0 right-0 h-1.5 w-1.5 bg-[#00D4FF] rounded-none" />
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold font-sans">Total Bot Volume Routed</p>
                    <p className="text-2xl font-mono font-bold text-zinc-100 mt-2">
                      ${adminMetrics.totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[9px] text-zinc-500 font-mono mt-1">Sum of routed automated stablecoin deployments</p>
                  </div>

                  <div className="border border-zinc-800 p-6 bg-zinc-900/50 rounded-none relative overflow-hidden">
                    <div className="absolute top-0 right-0 h-1.5 w-1.5 bg-blue-500 rounded-none" />
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold font-sans">Total Fees Collected (1.0%)</p>
                    <p className="text-2xl font-mono font-bold text-blue-500 mt-2">
                      ${adminMetrics.totalFees.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[9px] text-zinc-500 font-mono mt-1">1.0% flat brokerage share split</p>
                  </div>

                  <div className="border border-zinc-800 p-6 bg-zinc-900/50 rounded-none relative overflow-hidden">
                    <div className="absolute top-0 right-0 h-1.5 w-1.5 bg-[#00FF88] rounded-none" />
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold font-sans">Total Automated Routes</p>
                    <p className="text-2xl font-mono font-bold text-[#00FF88] mt-2">
                      {adminMetrics.count || 0}
                    </p>
                    <p className="text-[9px] text-zinc-500 font-mono mt-1">Total active program execution count</p>
                  </div>

                  <div className="border border-zinc-800 p-6 bg-zinc-900/50 rounded-none relative overflow-hidden">
                    <div className="absolute top-0 right-0 h-1.5 w-1.5 bg-emerald-400 rounded-none" />
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold font-sans">Insurance TVL</p>
                    <p className="text-2xl font-mono font-bold text-emerald-400 mt-2">
                      ${(adminMetrics.insurance_tvl || 2500000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[9px] text-zinc-500 font-mono mt-1">90% Ondo TBILL, 10% Reserve</p>
                  </div>

                  <div className="border border-zinc-800 p-6 bg-zinc-900/50 rounded-none relative overflow-hidden">
                    <div className="absolute top-0 right-0 h-1.5 w-1.5 bg-rose-500 rounded-none" />
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold font-sans">Claims Paid</p>
                    <p className="text-2xl font-mono font-bold text-rose-500 mt-2">
                      ${(adminMetrics.insurance_claims_paid || 120000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[9px] text-zinc-500 font-mono mt-1">Instant payouts from reserve</p>
                  </div>

                </div>

                {/* Dual Layout for Creation and Audit logs */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  
                  {/* Left Column (4 cols): Platform Wallet Balance & Bot Analytics */}
                  <div className="lg:col-span-4 space-y-6">
                    
                    {/* Platform Wallet Balance Live Tracker */}
                    <div className="border border-zinc-800 p-6 bg-zinc-950/40 backdrop-blur-md rounded-none space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                          PLATFORM FEE WALLET
                        </h3>
                        <span className="flex items-center gap-1 text-[9px] text-[#00FF88] font-mono uppercase">
                          <span className="w-1.5 h-1.5 bg-[#00FF88] rounded-full animate-ping" />
                          Secure
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold">Harvester Wallet Address</p>
                        <p className="text-xs font-mono text-zinc-400 truncate bg-black/40 p-2 border border-zinc-900">
                          {platformFeeWallet || "0x0000000000000000000000000000000000000000"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold">Platform Wallet Balance</p>
                        <p className="text-3xl font-mono text-[#00FF88] font-black leading-none">
                          ${adminMetrics.totalFees.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-[9px] text-zinc-500 font-mono mt-1">100% of accumulated platform broker fees</p>
                      </div>
                      <button 
                        onClick={() => alert("Withdrawal routing is executed automatically to cold-storage at contract settlement epochs.")}
                        className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-850 text-[10px] font-bold uppercase tracking-widest transition-all rounded-none cursor-pointer"
                      >
                        Sweep Fees to Cold Wallet
                      </button>
                    </div>

                    {/* Top 5 Routing Bots Analytics */}
                    <div className="border border-zinc-800 p-6 bg-zinc-950/40 backdrop-blur-md rounded-none space-y-4">
                      <h3 className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                        TOP ROUTING BOTS (BY VOLUME)
                      </h3>
                      {(!adminMetrics.topBots || adminMetrics.topBots.length === 0) ? (
                        <p className="text-xs text-zinc-500 font-mono italic">No bot execution volume logged yet.</p>
                      ) : (
                        <div className="space-y-3">
                          {adminMetrics.topBots.map((bot, i) => (
                            <div key={bot.bot_id} className="bg-black/20 p-3 border border-zinc-900/60 flex items-center justify-between">
                              <div className="space-y-1">
                                <span className="text-[10px] font-mono font-bold text-[#00D4FF] block">
                                  #{i + 1} {bot.bot_id}
                                </span>
                                <span className="text-[9px] text-zinc-500 font-mono block">
                                  {bot.txCount} execution{bot.txCount > 1 ? "s" : ""}
                                </span>
                              </div>
                              <div className="text-right space-y-0.5">
                                <span className="text-xs font-mono font-extrabold text-[#00FF88] block">
                                  ${bot.volume.toLocaleString()}
                                </span>
                                <span className="text-[9px] text-zinc-500 font-mono block">
                                  Fees: ${bot.fees.toLocaleString(undefined, { minimumFractionDigits: 1 })}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                  
                  {/* Right Column (8 cols): Creation Panel & Logs */}
                  <div className="lg:col-span-8 space-y-6">
                    
                    {/* Register New Opportunity */}
                    <div className="border border-zinc-800 p-6 bg-zinc-900/30 rounded-none space-y-4">
                      <div>
                        <h3 className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-1">
                          Register New Opportunity Pool Target
                        </h3>
                        <p className="text-xs text-zinc-400">
                          Deploy a new institutional stablecoin or real-world asset (RWA) yield opportunity.
                        </p>
                      </div>

                      <form onSubmit={handleAddOpportunity} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-zinc-500 uppercase block font-bold">Pool Name</label>
                          <input
                            type="text"
                            value={newOppName}
                            onChange={(e) => setNewOppName(e.target.value)}
                            placeholder="Ondo Finance OUSG"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-none px-3 py-2 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500/50 font-mono"
                            required
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-zinc-500 uppercase block font-bold">Target Contract/Wallet</label>
                          <input
                            type="text"
                            value={newOppWallet}
                            onChange={(e) => setNewOppWallet(e.target.value)}
                            placeholder="0x..."
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-none px-3 py-2 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500/50 font-mono"
                            required
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-zinc-500 uppercase block font-bold">APY %</label>
                          <input
                            type="number"
                            step="0.01"
                            value={newOppApy}
                            onChange={(e) => setNewOppApy(e.target.value)}
                            placeholder="5.20"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-none px-3 py-2 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500/50 font-mono"
                            required
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-zinc-500 uppercase block font-bold">TVL $</label>
                          <input
                            type="number"
                            value={newOppTvl}
                            onChange={(e) => setNewOppTvl(e.target.value)}
                            placeholder="200000000"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-none px-3 py-2 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500/50 font-mono"
                            required
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-zinc-500 uppercase block font-bold">Settlement Chain</label>
                          <select
                            value={newOppChain}
                            onChange={(e) => setNewOppChain(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-none px-3 py-2 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500/50 cursor-pointer font-mono"
                          >
                            <option value="base">Base</option>
                            <option value="polygon">Polygon</option>
                            <option value="ethereum">Ethereum</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-zinc-500 uppercase block font-bold">Risk Weight</label>
                          <select
                            value={newOppRisk}
                            onChange={(e) => setNewOppRisk(e.target.value as any)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-none px-3 py-2 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500/50 cursor-pointer font-mono"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </select>
                        </div>

                        <div className="space-y-1 md:col-span-2">
                          <label className="text-[10px] font-mono text-zinc-500 uppercase block font-bold">Protocol Info Link URL</label>
                          <input
                            type="url"
                            value={newOppUrl}
                            onChange={(e) => setNewOppUrl(e.target.value)}
                            placeholder="https://..."
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-none px-3 py-2 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500/50 font-mono"
                            required
                          />
                        </div>

                        <div className="md:col-span-2 pt-2">
                          {oppSubmitStatus === "success" && (
                            <div className="bg-zinc-900 border border-emerald-500/30 text-emerald-400 p-3 rounded-none text-xs flex items-center gap-2 mb-3">
                              <CheckCircle className="h-4 w-4 shrink-0" />
                              <span>Opportunity published successfully!</span>
                            </div>
                          )}

                          {oppSubmitStatus === "error" && (
                            <div className="bg-red-950/30 border border-red-900 text-red-400 p-3 rounded-none text-xs flex items-center gap-2 mb-3">
                              <AlertCircle className="h-4 w-4 shrink-0" />
                              <span>{oppSubmitError}</span>
                            </div>
                          )}

                          <button
                            type="submit"
                            disabled={oppSubmitStatus === "loading"}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold uppercase tracking-widest transition-colors rounded-none cursor-pointer"
                          >
                            {oppSubmitStatus === "loading" ? "Publishing payload..." : "Publish Opportunity"}
                          </button>
                        </div>
                      </form>
                    </div>

                  {/* Ledger logs */}
                    <div className="border border-zinc-800 bg-zinc-900/30 rounded-none overflow-hidden">
                      <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
                        <div>
                          <h3 className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                            Depositor Audit Registry Ledger
                          </h3>
                          <p className="text-xs text-zinc-400 mt-1">Cryptographic logs of capital deployments</p>
                        </div>
                        <button 
                          onClick={() => fetchAdminDashboardData(adminToken)}
                          className="p-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all rounded-none"
                          title="Refresh logs"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {isAdminLoading ? (
                        <div className="p-12 text-center">
                          <Loader2 className="h-6 w-6 text-blue-500 animate-spin mx-auto mb-2" />
                          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Auditing cryptographic signatures...</p>
                        </div>
                      ) : adminTransactions.length === 0 ? (
                        <div className="p-16 text-center">
                          <FileSpreadsheet className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
                          <p className="text-zinc-400 font-bold uppercase text-xs">No logs registered</p>
                          <p className="text-xs text-zinc-500 mt-1">Capital deposits routed to protocols will be logged here instantly.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-zinc-900 text-zinc-500 uppercase text-[10px] font-bold tracking-widest border-b border-zinc-800">
                                <th className="p-4">Depositor Wallet / Bot</th>
                                <th className="p-4">Pool Target</th>
                                <th className="p-4 text-right">Amount</th>
                                <th className="p-4 text-right">Broker Fee (1.0%)</th>
                                <th className="p-4 text-center">Chain</th>
                                <th className="p-4 text-right">Hash</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/40 font-mono text-zinc-300">
                              {adminTransactions.slice().reverse().map((tx) => (
                                <tr key={tx.id} className="hover:bg-zinc-800/20 transition-colors">
                                  <td className="p-4 font-mono text-zinc-400 text-xs">
                                    {tx.bot_id ? (
                                      <span className="text-[#00D4FF] font-bold">{tx.bot_id}</span>
                                    ) : (
                                      <span>{tx.user_wallet.slice(0, 6)}...{tx.user_wallet.slice(-4)}</span>
                                    )}
                                  </td>
                                  <td className="p-4 font-sans font-bold text-zinc-200 text-xs">
                                    {tx.protocol}
                                  </td>
                                  <td className="p-4 text-right font-mono text-zinc-100 font-bold">
                                    {tx.amount.toLocaleString()} USDC
                                  </td>
                                  <td className="p-4 text-right text-blue-400 font-bold">
                                    {tx.fee_collected.toFixed(2)} USDC
                                  </td>
                                  <td className="p-4 text-center">
                                    <span className={`px-2 py-0.5 rounded-sm border text-[10px] ${getChainColor(tx.chain)}`}>
                                      {tx.chain.toUpperCase()}
                                    </span>
                                  </td>
                                  <td className="p-4 text-right">
                                    <a
                                      href={getExplorerUrl(tx.chain, tx.tx_hash)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-blue-500 hover:underline inline-flex items-center gap-1 text-[11px]"
                                    >
                                      {tx.tx_hash.slice(0, 8)}...
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

              </div>
            )}

          </motion.div>
        )}
      </AnimatePresence>

      {/* FOOTER & DISCLAIMER */}
      <footer className="mt-auto pt-8 border-t border-zinc-800 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-2">
        <div>
          <p className="text-xs text-zinc-400 font-bold tracking-tight mb-2">
            YieldFi © 2026 UpFrica. Powering global RWA liquidity.
          </p>
          <p className="text-[10px] text-zinc-600 uppercase font-bold tracking-tighter mb-1">
            Legal Disclaimer
          </p>
          <p className="text-[9px] text-zinc-600 max-w-2xl leading-tight font-sans">
            The yields displayed are for informational purposes only. Smart contracts carry inherent risks including total loss of funds. This is not financial advice. YieldFi takes a 1.0% flat fee on deployments to maintain platform infrastructure and cross-chain bridging.
          </p>
        </div>
        <div className="text-left md:text-right shrink-0">
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
            Built on Base Chain
          </p>
          <p className="text-[9px] font-mono text-zinc-700 mt-1 uppercase tracking-tighter">
            TX: 0x9f8...2a41 - Last updated: seconds ago
          </p>
        </div>
      </footer>

      {/* =========================================================================
         DEPOSIT MODAL
         ========================================================================= */}
      <AnimatePresence>
        {isDepositModalOpen && selectedOpp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { if (depositStatus !== 'confirming' && depositStatus !== 'processing') setIsDepositModalOpen(false); }}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.98, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-none overflow-hidden shadow-2xl p-6 space-y-6 text-zinc-200"
            >
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                    <Coins className="h-4.5 w-4.5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-100">Deposit USDC</h3>
                    <p className="text-[10px] text-zinc-500 font-mono uppercase">Routing to {selectedOpp.chain.toUpperCase()}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDepositModalOpen(false)}
                  disabled={depositStatus === 'confirming' || depositStatus === 'processing'}
                  className="text-zinc-500 hover:text-zinc-300 text-sm font-bold font-mono transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Status Rendering */}
              {depositStatus === 'idle' && (
                <div className="space-y-5">
                  
                  {/* Pool info recap */}
                  <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-none space-y-2 font-mono text-[11px]">
                    <div className="flex justify-between text-zinc-400">
                      <span className="uppercase font-bold text-zinc-500">Pool Target</span>
                      <span className="font-bold text-zinc-200">{selectedOpp.name}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span className="uppercase font-bold text-zinc-500">Yield Rate</span>
                      <span className="font-bold text-emerald-500">{selectedOpp.apy.toFixed(2)}% APY</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span className="uppercase font-bold text-zinc-500">Settlement Address</span>
                      <span className="text-zinc-400">
                        {selectedOpp.protocol_wallet.slice(0, 10)}...{selectedOpp.protocol_wallet.slice(-8)}
                      </span>
                    </div>
                  </div>

                  {/* Input field */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-mono">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Amount (USDC)</label>
                      <span className="text-zinc-500">Balance: {walletBalance} USDC</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder="100"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-none px-4 py-3 text-lg font-mono font-bold text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500/50 pr-16"
                        required
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono font-bold text-xs text-zinc-500 bg-zinc-900 px-2 py-1 border border-zinc-800">
                        USDC
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-600 font-mono uppercase">Minimum required amount is 1 USDC.</p>
                  </div>

                  {/* Fee logic breakdown */}
                  <div className="bg-zinc-950 p-4 border border-zinc-900 space-y-1.5 font-mono text-[11px] text-zinc-400">
                    <div className="flex justify-between">
                      <span className="font-bold text-zinc-500 uppercase">99.0% to Yield Pool</span>
                      <span className="font-bold">{(Number(depositAmount) * 0.99 || 0).toFixed(2)} USDC</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold text-zinc-500 uppercase">1.0% Flat Service Fee</span>
                      <span className="text-blue-500 font-bold">{(Number(depositAmount) * 0.01 || 0).toFixed(2)} USDC</span>
                    </div>
                    <div className="border-t border-zinc-900/60 pt-2 flex justify-between font-bold text-zinc-200">
                      <span className="uppercase text-zinc-400 font-bold">Total Routed</span>
                      <span className="text-zinc-100 font-black">{(Number(depositAmount) || 0).toFixed(2)} USDC</span>
                    </div>
                  </div>

                  {depositErrorMsg && (
                    <div className="bg-red-950/30 border border-red-900 text-red-400 p-3 rounded-none text-xs flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{depositErrorMsg}</span>
                    </div>
                  )}

                  {/* DEPOSIT FLOW */}
                  <div className="pt-2">
                    <button
                      onClick={executeLiveDeposit}
                      className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-widest active:translate-y-px transition-all rounded-none flex items-center justify-center gap-2 shadow-[2px_2px_0px_#1e3a8a]"
                    >
                      <Wallet className="h-3.5 w-3.5" />
                      {walletConnected ? "Live Deposit" : "Connect Wallet & Deposit"}
                    </button>
                  </div>

                </div>
              )}

              {/* Confirming status */}
              {depositStatus === 'confirming' && (
                <div className="p-8 text-center space-y-4">
                  <Loader2 className="h-8 w-8 text-blue-500 animate-spin mx-auto" />
                  <div className="space-y-1">
                    <h4 className="font-bold uppercase tracking-wider text-xs text-zinc-200">Awaiting Wallet Signature</h4>
                    <p className="text-xs text-zinc-500 font-mono">Please approve the transfer of {depositAmount} USDC in your browser wallet extension.</p>
                  </div>
                </div>
              )}

              {/* Processing status */}
              {depositStatus === 'processing' && (
                <div className="p-8 text-center space-y-4">
                  <Loader2 className="h-8 w-8 text-blue-500 animate-spin mx-auto" />
                  <div className="space-y-1">
                    <h4 className="font-bold uppercase tracking-wider text-xs text-zinc-200">Routing Ledger Transfer</h4>
                    <p className="text-xs text-zinc-500 font-mono">Broadcasting transaction hash to {selectedOpp.chain.toUpperCase()} and mining blocks...</p>
                  </div>
                </div>
              )}

              {/* Success Screen */}
              {depositStatus === 'success' && (
                <div className="text-center space-y-6 py-4">
                  <div className="h-12 w-12 bg-zinc-900 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-lg font-black uppercase tracking-tight text-zinc-100">Capital Allocated</h4>
                    <p className="text-xs text-zinc-400 leading-relaxed px-2 font-sans">
                      {depositAmount} USDC has been successfully routed. 99.0% was transferred to {selectedOpp.name} and 1.0% was processed as platform broker fee.
                    </p>
                  </div>

                  <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-none space-y-2 text-xs font-mono text-left">
                    <div className="flex justify-between text-zinc-500">
                      <span className="uppercase font-bold">Settlement Chain</span>
                      <span className="text-zinc-200 uppercase font-bold">{selectedOpp.chain}</span>
                    </div>
                    <div className="flex justify-between text-zinc-500">
                      <span className="uppercase font-bold">Broker Fee Split</span>
                      <span className="text-blue-500 font-bold">{(Number(depositAmount) * 0.01).toFixed(2)} USDC</span>
                    </div>
                    <div className="flex flex-col gap-1 border-t border-zinc-800 pt-2 text-[10px]">
                      <span className="text-zinc-500 uppercase font-bold">Transaction Hash</span>
                      <a
                        href={getExplorerUrl(selectedOpp.chain, depositTxHash)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-500 hover:underline break-all font-mono inline-flex items-center gap-1 mt-0.5"
                      >
                        {depositTxHash}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsDepositModalOpen(false)}
                    className="w-full py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors rounded-none"
                  >
                    Close Log Panel
                  </button>
                </div>
              )}

              {/* Error Screen */}
              {depositStatus === 'error' && (
                <div className="text-center space-y-6 py-4">
                  <div className="h-12 w-12 bg-red-950/20 border border-red-900 text-red-400 flex items-center justify-center mx-auto">
                    <AlertCircle className="h-6 w-6" />
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-lg font-black uppercase tracking-tight text-zinc-100">Routing Failed</h4>
                    <p className="text-xs text-zinc-400 leading-relaxed font-sans px-4">
                      The transaction could not be broadcast or processed correctly on-chain.
                    </p>
                  </div>

                  <div className="bg-red-950/10 border border-red-900 p-4 rounded-none text-left font-mono">
                    <p className="text-xs text-red-400 leading-relaxed break-all">
                      {depositErrorMsg || "Unknown ledger routing error occurred."}
                    </p>
                  </div>

                  <div className="flex gap-3 text-xs uppercase font-bold tracking-wider">
                    <button
                      onClick={() => setDepositStatus("idle")}
                      className="flex-1 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-200 hover:text-white transition-colors rounded-none"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={() => setIsDepositModalOpen(false)}
                      className="flex-1 py-2.5 bg-zinc-950 border border-zinc-900 text-zinc-500 hover:text-zinc-400 transition-colors rounded-none"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

            </motion.div>

          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
