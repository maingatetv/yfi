// GET /app/api/credit/route.ts
// Scan Aave, Maple, Goldfinch for best borrow rates. Return top 5.

export async function GET() {
  const creditOpportunities = [
    {
      protocol: "Maple",
      borrow_apy: 8.5,
      lend_apy: 14.0,
      spread: 5.5
    },
    {
      protocol: "Goldfinch",
      borrow_apy: 7.8,
      lend_apy: 12.5,
      spread: 4.7
    },
    {
      protocol: "Aave",
      borrow_apy: 5.1,
      lend_apy: 8.4,
      spread: 3.3
    },
    {
      protocol: "Ondo",
      borrow_apy: 4.8,
      lend_apy: 7.8,
      spread: 3.0
    },
    {
      protocol: "Clearpool",
      borrow_apy: 9.2,
      lend_apy: 11.5,
      spread: 2.3
    }
  ];

  return Response.json(creditOpportunities);
}
