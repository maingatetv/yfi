// POST /api/insurance-vault
// Accept premium deposits, auto-route 90% to Ondo TBILL, 10% to liquid reserve. Take 0.5% fee.

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const amount = body.amount !== undefined ? body.amount : body.amount_usdc;

    if (amount === undefined) {
      return Response.json({
        error: "Missing required execution field: amount or amount_usdc"
      }, { status: 400 });
    }

    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return Response.json({ error: "Invalid amount. Must be greater than zero." }, { status: 400 });
    }

    const fee = amountNum * 0.01; // 1% fee
    const to_tbill = amountNum * 0.90; // 90% to Ondo TBILL
    const to_reserve = amountNum * 0.10; // 10% to liquid reserve

    return Response.json({
      success: true,
      deposited_usd: amountNum,
      to_tbill: Number(to_tbill.toFixed(2)),
      to_reserve: Number(to_reserve.toFixed(2)),
      fee: Number(fee.toFixed(2)),
      apy: 5.2
    });
  } catch (error) {
    return Response.json({ error: "Failed to parse JSON request" }, { status: 400 });
  }
}
