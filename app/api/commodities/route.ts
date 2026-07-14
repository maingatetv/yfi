export async function GET() {
  const opportunities = [
    {
      asset: "Gold",
      buy_token: "PAXG",
      sell_venue: "CME Future",
      spread_percent: 0.8
    },
    {
      asset: "Oil",
      buy_token: "USO-Token",
      sell_venue: "ICE Brent",
      spread_percent: 1.2
    },
    {
      asset: "Silver",
      buy_token: "XAG-Token",
      sell_venue: "LBMA Spot",
      spread_percent: 0.9
    }
  ];
  return Response.json(opportunities);
}
