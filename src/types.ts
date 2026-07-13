export interface Opportunity {
  id: string;
  name: string;
  apy: number;
  tvl_usd: number;
  chain: string;
  risk: 'low' | 'medium' | 'high';
  deposit_url: string;
  contract_address: string;
  asset: string;
  protocol_wallet: string;
  min_deposit?: number;
  max_deposit?: number;
  last_updated?: string;
  category?: string;
  market_type?: string;
  protocol?: string;
  risk_score?: number;
}

export interface Transaction {
  id: string;
  user_wallet: string;
  amount: number;
  protocol: string;
  tx_hash: string;
  fee_collected: number;
  chain: string;
  timestamp: string;
}
