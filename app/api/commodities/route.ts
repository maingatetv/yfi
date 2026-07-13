export async function GET() {
  return Response.json([
    {asset: "Gold", spread_percent: 0.8},
    {asset: "Oil", spread_percent: 1.2}
  ])
}
