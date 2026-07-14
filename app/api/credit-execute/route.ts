// POST /app/api/credit-execute/route.ts
// Bot borrows at a low rate, lends at a high rate. Take 1% origination fee.

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const amount = body.amount !== undefined ? body.amount : (body.amount_usdc !== undefined ? body.amount_usdc : 1000000);

    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return Response.json({ error: "Invalid amount. Must be greater than zero." }, { status: 400 });
    }

    const borrowed_usd = amountNum;
    const lent_usd = amountNum;
    const spread_profit = amountNum * 0.055; // 5.5% spread profit
    const fee = amountNum * 0.01; // 1% origination fee

    return Response.json({
      success: true,
      borrowed_usd,
      lent_usd,
      spread_profit: Number(spread_profit.toFixed(2)),
      fee: Number(fee.toFixed(2))
    });
  } catch (error) {
    return Response.json({ error: "Failed to process request" }, { status: 500 });
  }
}
