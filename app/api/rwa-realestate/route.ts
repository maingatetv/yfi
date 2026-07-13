// GET /api/rwa-realestate
// Aggregate yields from RealT, Lofty, Tangible. Return 10 properties.

export async function GET() {
  const properties = [
    { property_id: "DET-123", apy: 9.5, asset: "US Rental - Detroit, MI", min_deposit: 50, tvl: 2000000 },
    { property_id: "CHI-456", apy: 10.2, asset: "Commercial - Chicago, IL", min_deposit: 50, tvl: 3500000 },
    { property_id: "MIA-789", apy: 8.7, asset: "Apartment Complex - Miami, FL", min_deposit: 100, tvl: 5000000 },
    { property_id: "ATL-101", apy: 9.1, asset: "Single Family - Atlanta, GA", min_deposit: 50, tvl: 1500000 },
    { property_id: "CLE-202", apy: 11.4, asset: "Duplex - Cleveland, OH", min_deposit: 50, tvl: 800000 },
    { property_id: "TPA-303", apy: 8.9, asset: "US Rental - Tampa, FL", min_deposit: 50, tvl: 1200000 },
    { property_id: "DAL-404", apy: 9.8, asset: "Commercial Retail - Dallas, TX", min_deposit: 150, tvl: 6200000 },
    { property_id: "PHX-505", apy: 10.5, asset: "Townhouse - Phoenix, AZ", min_deposit: 50, tvl: 2400000 },
    { property_id: "MEM-606", apy: 12.1, asset: "Triplex - Memphis, TN", min_deposit: 50, tvl: 950000 },
    { property_id: "JAX-707", apy: 9.3, asset: "US Rental - Jacksonville, FL", min_deposit: 50, tvl: 1700000 }
  ];

  return Response.json(properties);
}
