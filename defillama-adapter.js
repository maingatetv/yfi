/**
 * DefiLlama TVL Adapter for YieldFi
 * 
 * This script complies with DefiLlama's official SDK requirements for tracking 
 * Total Value Locked (TVL). Submit this file via a Pull Request to the 
 * official DefiLlama adapters repository: https://github.com/DefiLlama/defillama-adapters
 */

const sdk = require('@defillama/sdk');
const axios = require('axios');

// Replace this with your production hosted domain when live
const YIELDFI_API_URL = 'https://yieldfi.africa/api/opportunities'; 

async function fetchChainTvl(chainName) {
  // Fetch active pools directly from the YieldFi registry API
  const response = await axios.get(YIELDFI_API_URL);
  const opportunities = response.data;

  const balances = {};

  // Filter opportunities by the target chain
  const chainOpps = opportunities.filter(
    opp => opp.chain.toLowerCase() === chainName.toLowerCase()
  );

  for (const opp of chainOpps) {
    // Standardize USDC token address based on chain
    let usdcAddress;
    switch (chainName.toLowerCase()) {
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
        usdcAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913'; // Default Base USDC
    }

    // Add pool tvl to balances (multiplied by 10^6 to account for USDC's 6 decimals)
    const tvlAmountRaw = Math.floor(opp.tvl * 1000000).toString();
    sdk.util.sumSingleBalance(balances, `${chainName.toLowerCase()}:${usdcAddress}`, tvlAmountRaw);
  }

  return balances;
}

module.exports = {
  timetravel: false,
  misrepresentedTokens: false,
  methodology: 'TVL is calculated by summing up the active USDC assets deposited into listed real-world asset (RWA) vaults, commodities pools, forex markets, and insurance treasuries across Base, Polygon, and Ethereum networks.',
  base: {
    tvl: () => fetchChainTvl('base')
  },
  polygon: {
    tvl: () => fetchChainTvl('polygon')
  },
  ethereum: {
    tvl: () => fetchChainTvl('ethereum')
  }
};
