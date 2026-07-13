# YieldFi Routing Protocol

YieldFi is a zero-config, highly optimized web3 stablecoin yield aggregator for both real-world assets (RWA) and institutional DeFi protocols.

## Vercel Deployment Instructions

**Deploy to Vercel with 0 env vars. It works immediately.**

You can configure these optional parameters later to secure and direct operations:

- `ADMIN_PASSWORD`: Custom keyphrase to secure the Operator Portal. Defaults to `admin`.
- `PLATFORM_FEE_WALLET`: The on-chain address that receives the 0.5% flat brokerage service fee split. Defaults to `0xFEE0000000000000000000000000000000000000`.
- `KV_REST_API_URL` & `KV_REST_API_TOKEN`: Setup Vercel KV for persistent cloud database storage. Auto-falls back to local filesystem JSON when unset.

## Features

1. **Zero Configuration Storage**: Elegant hybrid engine supporting both **Vercel KV** and automatic file-based local JSON fallback.
2. **Dynamic Live TVL**: The total assets under routing are updated on the dashboard every 10 seconds.
3. **Dual Deposit Mode**: Supports both real on-chain MetaMask transfers and high-fidelity simulated capital routing.
4. **Institutional Bot APIs**: Standardized `/api/yields` and `/api/tvl` endpoints supporting CORS for scrapers and programmatic arbitrageurs.
5. **Auto-updating TVL Crons**: Cron route `/api/cron/update-tvl` automatically pulls and updates pool data from DefiLlama APIs.
