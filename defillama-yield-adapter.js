/**
 * DefiLlama Yield/APY Adapter for YieldFi
 * 
 * This script complies with DefiLlama's official yields SDK. 
 * Submit this file via a Pull Request to the official DefiLlama yields repository:
 * https://github.com/DefiLlama/yield-server
 */

const axios = require('axios');

// Replace this with your production hosted domain when live
const YIELDFI_API_URL = 'https://yieldfi.africa/api/opportunities';

async function apy() {
  const response = await axios.get(YIELDFI_API_URL);
  const opportunities = response.data;

  // Format pools for DefiLlama yields registry
  const pools = opportunities.map(opp => {
    // Determine pool key/id based on protocol_wallet or name
    const poolId = opp.id || `yieldfi-${opp.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    
    // Standardize USDC token address based on chain
    let usdcAddress;
    switch (opp.chain.toLowerCase()) {
      case 'ethereum':
        usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
        break;
      case 'polygon':
        usdcAddress = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
        break;
      case 'base':
        usdcAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913';
        break;
      default:
        usdcAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913';
    }

    return {
      pool: poolId,
      chain: opp.chain,
      project: 'yieldfi',
      symbol: 'USDC',
      tvlUsd: opp.tvl,
      apy: parseFloat(opp.apy),
      poolMeta: opp.category || 'Real World Assets (RWA)',
      underlyingTokens: [usdcAddress]
    };
  });

  return pools;
}

module.exports = {
  timetravel: false,
  apy: apy,
  url: 'https://yieldfi.africa' // Main website URL
};
