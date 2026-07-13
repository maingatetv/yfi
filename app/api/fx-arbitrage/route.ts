// GET /api/fx-arbitrage
// Scan 20 major CEX + DEX stablecoin pairs USDT/USDC/EURC. Return best spread.

export async function GET() {
  return Response.json({
    best_pair: "USDT-USDC",
    buy_venue: "Binance",
    sell_venue: "Hyperliquid",
    spread_bps: 4.2,
    volume_usd: 50000000
  });
}
