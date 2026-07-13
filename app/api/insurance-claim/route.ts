// POST /api/insurance-claim
// Process instant claim payout from reserve. Log it.

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const payout_usd = body.payout_usd !== undefined ? body.payout_usd : (body.amount !== undefined ? body.amount : 5000);

    const payoutNum = Number(payout_usd);
    if (isNaN(payoutNum) || payoutNum <= 0) {
      return Response.json({ error: "Invalid payout_usd amount." }, { status: 400 });
    }

    // Default remaining reserve calculation (mock for NextJS mapping, actual persistent state is updated in the server)
    const reserve_remaining = Math.max(0, 10000 - payoutNum);

    return Response.json({
      success: true,
      payout_usd: payoutNum,
      reserve_remaining
    });
  } catch (error) {
    return Response.json({ error: "Failed to parse JSON request" }, { status: 400 });
  }
}
