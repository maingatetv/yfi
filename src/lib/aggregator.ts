export interface RouteInput {
  fromToken: string;
  toToken: string;
  amount: number;
  chain: string; // e.g. "ethereum", "polygon", "base", "arbitrum"
  assetType: "crypto" | "fx" | "yield" | "commodities";
}

export interface RouteOption {
  protocol: string;
  price: number; // rate of 1 fromToken in toToken
  slippage: number; // percentage (e.g., 0.1 for 0.1%)
  gasUsd: number;
  apy?: number; // annual percentage yield if applicable (mainly DeFi yield)
  estimatedReturn: number; // total output amount in toToken or net yield dollar value
  path: string[];
  latencyMs: number;
  status: "online" | "congested" | "offline";
}

export interface RoutingResult {
  bestRoute: RouteOption;
  allRoutes: RouteOption[];
  executionTimeMs: number;
  input: RouteInput;
  timestamp: string;
}

// Simple helper to calculate a realistic latency in milliseconds
const getRandomLatency = (min = 10, max = 80) => Math.floor(Math.random() * (max - min) + min);

/**
 * Base Abstract Protocol Adapter
 */
export abstract class ProtocolAdapter {
  abstract name: string;
  abstract supportedAssetTypes: ("crypto" | "fx" | "yield" | "commodities")[];

  abstract getRoute(input: RouteInput): Promise<RouteOption | null>;
}

/**
 * 1inch Adapter (DEX Aggregator - mainly Ethereum, Polygon, Base Crypto)
 */
export class OneInchAdapter extends ProtocolAdapter {
  name = "1inch";
  supportedAssetTypes: ("crypto" | "fx" | "yield" | "commodities")[] = ["crypto", "commodities"];

  async getRoute(input: RouteInput): Promise<RouteOption | null> {
    if (!this.supportedAssetTypes.includes(input.assetType)) return null;
    
    const start = Date.now();
    // Simulate smart contract routing calculation
    let basePrice = 1.0;
    if (input.fromToken === "ETH" && input.toToken === "USDC") basePrice = 3450.25;
    else if (input.fromToken === "USDC" && input.toToken === "ETH") basePrice = 1 / 3452.10;
    else if (input.fromToken === "BTC" && input.toToken === "USDC") basePrice = 96420.00;
    else if (input.fromToken === "PAXG" && input.toToken === "USDC") basePrice = 2380.50; // Tokenized Gold
    else if (input.fromToken === "USDC" && input.toToken === "USDT") basePrice = 0.9998;
    else basePrice = 1.0; // default pairing

    // 1inch has highly optimized routes, so slippage and gas are typically balanced
    const slippage = 0.05 + Math.random() * 0.05; // 0.05% - 0.1%
    const gasUsd = input.chain === "ethereum" ? 12.50 : 0.15; // lower on L2s
    const calculatedPrice = basePrice * (1 - slippage / 100);
    const estimatedReturn = input.amount * calculatedPrice;

    return {
      protocol: this.name,
      price: Number(calculatedPrice.toFixed(6)),
      slippage: Number(slippage.toFixed(4)),
      gasUsd,
      estimatedReturn: Number((estimatedReturn - (gasUsd / basePrice)).toFixed(6)),
      path: [input.fromToken, "WETH", input.toToken],
      latencyMs: getRandomLatency(15, 60),
      status: "online"
    };
  }
}

/**
 * 0x API Adapter (DEX Liquidity Aggregator)
 */
export class ZeroXAdapter extends ProtocolAdapter {
  name = "0x API";
  supportedAssetTypes: ("crypto" | "fx" | "yield" | "commodities")[] = ["crypto", "commodities"];

  async getRoute(input: RouteInput): Promise<RouteOption | null> {
    if (!this.supportedAssetTypes.includes(input.assetType)) return null;

    const start = Date.now();
    let basePrice = 1.0;
    if (input.fromToken === "ETH" && input.toToken === "USDC") basePrice = 3449.80;
    else if (input.fromToken === "USDC" && input.toToken === "ETH") basePrice = 1 / 3451.90;
    else if (input.fromToken === "BTC" && input.toToken === "USDC") basePrice = 96410.00;
    else if (input.fromToken === "PAXG" && input.toToken === "USDC") basePrice = 2381.10;
    else if (input.fromToken === "USDC" && input.toToken === "USDT") basePrice = 0.9999;
    else basePrice = 1.0;

    const slippage = 0.08 + Math.random() * 0.06; // 0.08% - 0.14%
    const gasUsd = input.chain === "ethereum" ? 11.20 : 0.12;
    const calculatedPrice = basePrice * (1 - slippage / 100);
    const estimatedReturn = input.amount * calculatedPrice;

    return {
      protocol: this.name,
      price: Number(calculatedPrice.toFixed(6)),
      slippage: Number(slippage.toFixed(4)),
      gasUsd,
      estimatedReturn: Number((estimatedReturn - (gasUsd / basePrice)).toFixed(6)),
      path: [input.fromToken, input.toToken], // Direct RFQ path
      latencyMs: getRandomLatency(10, 45),
      status: "online"
    };
  }
}

/**
 * Uniswap V3 Adapter (On-chain AMM DEX)
 */
export class UniswapAdapter extends ProtocolAdapter {
  name = "Uniswap V3";
  supportedAssetTypes: ("crypto" | "fx" | "yield" | "commodities")[] = ["crypto", "commodities"];

  async getRoute(input: RouteInput): Promise<RouteOption | null> {
    if (!this.supportedAssetTypes.includes(input.assetType)) return null;

    let basePrice = 1.0;
    if (input.fromToken === "ETH" && input.toToken === "USDC") basePrice = 3451.50;
    else if (input.fromToken === "USDC" && input.toToken === "ETH") basePrice = 1 / 3450.50;
    else if (input.fromToken === "BTC" && input.toToken === "USDC") basePrice = 96435.00;
    else if (input.fromToken === "PAXG" && input.toToken === "USDC") basePrice = 2379.80;
    else if (input.fromToken === "USDC" && input.toToken === "USDT") basePrice = 1.0001;
    else basePrice = 1.0;

    // Uniswap has pool fees depending on tier (0.05%, 0.3%, 1%)
    const poolFee = 0.05; // 0.05% tier
    const priceImpact = (input.amount > 100000) ? 0.25 : 0.02; // Price impact simulator
    const slippage = poolFee + priceImpact;
    const gasUsd = input.chain === "ethereum" ? 18.40 : 0.20; // AMMs cost more gas than RFQs
    const calculatedPrice = basePrice * (1 - slippage / 100);
    const estimatedReturn = input.amount * calculatedPrice;

    return {
      protocol: this.name,
      price: Number(calculatedPrice.toFixed(6)),
      slippage: Number(slippage.toFixed(4)),
      gasUsd,
      estimatedReturn: Number((estimatedReturn - (gasUsd / basePrice)).toFixed(6)),
      path: [input.fromToken, `Uniswap V3 Pool (${poolFee}%)`, input.toToken],
      latencyMs: getRandomLatency(20, 80),
      status: "online"
    };
  }
}

/**
 * Curve Finance Adapter (Stableswap/Low-slippage AMM)
 */
export class CurveAdapter extends ProtocolAdapter {
  name = "Curve Finance";
  supportedAssetTypes: ("crypto" | "fx" | "yield" | "commodities")[] = ["crypto", "commodities", "yield"];

  async getRoute(input: RouteInput): Promise<RouteOption | null> {
    // Only fetch for ultra-tight peg assets or yield-bearing tokens like stETH, crvUSD, PAXG, USDC/USDT
    const isPegged = (input.fromToken === "USDC" && input.toToken === "USDT") || 
                     (input.fromToken === "PAXG" && input.toToken === "USDC");
    const isYieldType = input.assetType === "yield";

    if (!isPegged && !isYieldType && input.fromToken !== "ETH") return null;

    let basePrice = 1.0;
    let apy = undefined;
    if (input.fromToken === "USDC" && input.toToken === "USDT") {
      basePrice = 1.0000;
      apy = 6.20; // Stableswap pool yield
    } else if (input.fromToken === "PAXG" && input.toToken === "USDC") {
      basePrice = 2380.20;
    } else if (input.fromToken === "ETH" && input.toToken === "USDC") {
      basePrice = 3448.00;
    }

    const slippage = 0.02 + (input.amount > 500000 ? 0.1 : 0.01); // extremely low slippage on pegged assets
    const gasUsd = input.chain === "ethereum" ? 22.00 : 0.25; // Curve routing contracts are complex
    const calculatedPrice = basePrice * (1 - slippage / 100);
    const estimatedReturn = input.amount * calculatedPrice;

    return {
      protocol: this.name,
      price: Number(calculatedPrice.toFixed(6)),
      slippage: Number(slippage.toFixed(4)),
      gasUsd,
      apy,
      estimatedReturn: Number((estimatedReturn - (gasUsd / basePrice)).toFixed(6)),
      path: [input.fromToken, "Curve 3pool", input.toToken],
      latencyMs: getRandomLatency(25, 90),
      status: "online"
    };
  }
}

/**
 * Aave Adapter (DeFi Lending Market APYs)
 */
export class AaveAdapter extends ProtocolAdapter {
  name = "Aave V3";
  supportedAssetTypes: ("crypto" | "fx" | "yield" | "commodities")[] = ["yield"];

  async getRoute(input: RouteInput): Promise<RouteOption | null> {
    if (input.assetType !== "yield") return null;

    // Aave lending rates
    let apy = 4.85;
    if (input.fromToken === "USDC" || input.toToken === "USDC") apy = 5.12;
    else if (input.fromToken === "USDT") apy = 5.40;
    else if (input.fromToken === "ETH") apy = 2.10;

    const gasUsd = input.chain === "ethereum" ? 15.00 : 0.10;
    // Estimated return in 1 year
    const estimatedReturn = input.amount * (1 + apy / 100);

    return {
      protocol: this.name,
      price: 1.0,
      slippage: 0.0, // Lending has zero swap slippage
      gasUsd,
      apy,
      estimatedReturn: Number(estimatedReturn.toFixed(4)),
      path: [input.fromToken, "Aave V3 Lending Pool"],
      latencyMs: getRandomLatency(12, 40),
      status: "online"
    };
  }
}

/**
 * Compound Adapter (DeFi Lending Market APYs)
 */
export class CompoundAdapter extends ProtocolAdapter {
  name = "Compound V3";
  supportedAssetTypes: ("crypto" | "fx" | "yield" | "commodities")[] = ["yield"];

  async getRoute(input: RouteInput): Promise<RouteOption | null> {
    if (input.assetType !== "yield") return null;

    let apy = 4.60;
    if (input.fromToken === "USDC" || input.toToken === "USDC") apy = 4.95;
    else if (input.fromToken === "USDT") apy = 5.15;
    else if (input.fromToken === "ETH") apy = 1.95;

    const gasUsd = input.chain === "ethereum" ? 14.50 : 0.08;
    const estimatedReturn = input.amount * (1 + apy / 100);

    return {
      protocol: this.name,
      price: 1.0,
      slippage: 0.0,
      gasUsd,
      apy,
      estimatedReturn: Number(estimatedReturn.toFixed(4)),
      path: [input.fromToken, "Compound cUSDCv3 Supply Market"],
      latencyMs: getRandomLatency(14, 45),
      status: "online"
    };
  }
}

/**
 * Binance Adapter (Centralized Exchange Order Book Rates)
 */
export class BinanceAdapter extends ProtocolAdapter {
  name = "Binance API";
  supportedAssetTypes: ("crypto" | "fx" | "yield" | "commodities")[] = ["crypto", "fx", "commodities"];

  async getRoute(input: RouteInput): Promise<RouteOption | null> {
    if (!this.supportedAssetTypes.includes(input.assetType)) return null;

    let basePrice = 1.0;
    if (input.fromToken === "ETH" && input.toToken === "USDC") basePrice = 3452.40;
    else if (input.fromToken === "USDC" && input.toToken === "ETH") basePrice = 1 / 3451.80;
    else if (input.fromToken === "BTC" && input.toToken === "USDC") basePrice = 96450.00;
    else if (input.fromToken === "PAXG" && input.toToken === "USDC") basePrice = 2382.00;
    else if (input.fromToken === "EUR" && input.toToken === "USD") basePrice = 1.0850; // FX
    else if (input.fromToken === "GBP" && input.toToken === "USD") basePrice = 1.2820; // FX
    else if (input.fromToken === "USDC" && input.toToken === "USDT") basePrice = 1.0000;
    else basePrice = 1.0;

    // CEX trading fee (typically 0.1% for spot, or VIP discounts)
    const tradingFeePercent = 0.1; 
    const slippage = tradingFeePercent + (input.amount > 1000000 ? 0.15 : 0.005); // deeper liquidity, lower slippage
    const gasUsd = 0.0; // Centralized exchanges do not require blockchain gas on-order, just withdrawal fee
    const calculatedPrice = basePrice * (1 - slippage / 100);
    const estimatedReturn = input.amount * calculatedPrice;

    return {
      protocol: this.name,
      price: Number(calculatedPrice.toFixed(6)),
      slippage: Number(slippage.toFixed(4)),
      gasUsd,
      estimatedReturn: Number(estimatedReturn.toFixed(6)),
      path: [input.fromToken, "Binance Orderbook", input.toToken],
      latencyMs: getRandomLatency(8, 25), // extremely fast API response
      status: "online"
    };
  }
}

/**
 * Bybit Adapter (CEX Orders)
 */
export class BybitAdapter extends ProtocolAdapter {
  name = "Bybit API";
  supportedAssetTypes: ("crypto" | "fx" | "yield" | "commodities")[] = ["crypto", "fx"];

  async getRoute(input: RouteInput): Promise<RouteOption | null> {
    if (!this.supportedAssetTypes.includes(input.assetType)) return null;

    let basePrice = 1.0;
    if (input.fromToken === "ETH" && input.toToken === "USDC") basePrice = 3451.90;
    else if (input.fromToken === "USDC" && input.toToken === "ETH") basePrice = 1 / 3452.20;
    else if (input.fromToken === "BTC" && input.toToken === "USDC") basePrice = 96438.00;
    else if (input.fromToken === "EUR" && input.toToken === "USD") basePrice = 1.0845;
    else if (input.fromToken === "GBP" && input.toToken === "USD") basePrice = 1.2815;
    else if (input.fromToken === "USDC" && input.toToken === "USDT") basePrice = 1.0001;
    else basePrice = 1.0;

    const tradingFeePercent = 0.1;
    const slippage = tradingFeePercent + (input.amount > 1000000 ? 0.22 : 0.008);
    const gasUsd = 0.0;
    const calculatedPrice = basePrice * (1 - slippage / 100);
    const estimatedReturn = input.amount * calculatedPrice;

    return {
      protocol: this.name,
      price: Number(calculatedPrice.toFixed(6)),
      slippage: Number(slippage.toFixed(4)),
      gasUsd,
      estimatedReturn: Number(estimatedReturn.toFixed(6)),
      path: [input.fromToken, "Bybit Orderbook", input.toToken],
      latencyMs: getRandomLatency(10, 32),
      status: "online"
    };
  }
}

/**
 * DeFiLlama Yield Data Adapter (Aggregates multiple smart pools)
 */
export class DeFiLlamaAdapter extends ProtocolAdapter {
  name = "DeFiLlama APY Tracker";
  supportedAssetTypes: ("crypto" | "fx" | "yield" | "commodities")[] = ["yield"];

  async getRoute(input: RouteInput): Promise<RouteOption | null> {
    if (input.assetType !== "yield") return null;

    // Simulate looking up DeFiLlama's high-yield pool database
    let poolName = "Lido stETH Pool";
    let apy = 5.45;
    
    if (input.fromToken === "USDC") {
      poolName = "Ethena sUSDe Pool";
      apy = 14.20; // High yield stable synthetic
    } else if (input.fromToken === "ETH") {
      poolName = "Rocket Pool rETH";
      apy = 3.65;
    } else if (input.fromToken === "BTC") {
      poolName = "Babylon BTC Staking";
      apy = 7.10;
    }

    const gasUsd = input.chain === "ethereum" ? 28.00 : 0.40;
    const estimatedReturn = input.amount * (1 + apy / 100);

    return {
      protocol: `${this.name} (${poolName})`,
      price: 1.0,
      slippage: 0.15, // deposit slippage/mint fee
      gasUsd,
      apy,
      estimatedReturn: Number(estimatedReturn.toFixed(4)),
      path: [input.fromToken, "DeFiLlama Catalog", poolName],
      latencyMs: getRandomLatency(40, 120), // querying aggregate catalog takes slightly longer
      status: "online"
    };
  }
}

/**
 * The CORE Modular Routing Engine
 */
export class AggregatorRoutingEngine {
  private adapters: ProtocolAdapter[] = [];

  constructor() {
    // Register all adapters
    this.adapters.push(new OneInchAdapter());
    this.adapters.push(new ZeroXAdapter());
    this.adapters.push(new UniswapAdapter());
    this.adapters.push(new CurveAdapter());
    this.adapters.push(new AaveAdapter());
    this.adapters.push(new CompoundAdapter());
    this.adapters.push(new BinanceAdapter());
    this.adapters.push(new BybitAdapter());
    this.adapters.push(new DeFiLlamaAdapter());
  }

  /**
   * Find the optimal route across all connected protocols
   */
  async findBestRoute(input: RouteInput): Promise<RoutingResult> {
    const startTime = Date.now();
    
    // Execute all registered adapters in parallel
    const routePromises = this.adapters.map(async (adapter) => {
      try {
        const option = await adapter.getRoute(input);
        return option;
      } catch (err) {
        console.error(`Error in adapter ${adapter.name}:`, err);
        return null;
      }
    });

    const resolvedRoutes = await Promise.all(routePromises);
    const validRoutes = resolvedRoutes.filter((r): r is RouteOption => r !== null);

    if (validRoutes.length === 0) {
      throw new Error(`No compatible routes found for pairing ${input.fromToken}/${input.toToken} on ${input.chain}`);
    }

    // Sort options to find the best return
    let bestRoute: RouteOption;
    if (input.assetType === "yield") {
      // For Yield APY, the best is highest APY (which maps directly to estimatedReturn)
      validRoutes.sort((a, b) => b.estimatedReturn - a.estimatedReturn);
      bestRoute = validRoutes[0];
    } else {
      // For Swaps (Crypto/FX/Commodities), best route is the highest net output in toToken
      validRoutes.sort((a, b) => b.estimatedReturn - a.estimatedReturn);
      bestRoute = validRoutes[0];
    }

    const executionTimeMs = Date.now() - startTime;

    return {
      bestRoute,
      allRoutes: validRoutes,
      executionTimeMs,
      input,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Return list of active protocols and their status
   */
  getProtocols() {
    return this.adapters.map(adapter => ({
      name: adapter.name,
      supportedAssetTypes: adapter.supportedAssetTypes,
      status: "online" as const,
      type: adapter.name.includes("API") || adapter.name.includes("Tracker") ? "CEX/API" : "On-chain DEX/DeFi"
    }));
  }
}
