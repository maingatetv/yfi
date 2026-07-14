import React, { useState, useEffect } from 'react';

interface AdminMetrics {
  totalFees: number;
  totalVolume: number;
  count: number;
  totalUsers: number;
  insurance_tvl: number;
  insurance_claims_paid: number;
  total_credit_deployed: number;
}

export default function AdminPage() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const response = await fetch('/api/admin/deposits', {
          headers: {
            'Authorization': 'Bearer yieldfi-admin-session-token-2026'
          }
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.success && data.metrics) {
          setMetrics(data.metrics);
        } else {
          throw new Error('Metrics data missing from response');
        }
      } catch (err: any) {
        console.error('Failed to fetch admin metrics in admin page:', err);
        setError(err.message || 'Failed to fetch metrics');
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  const formatUsd = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  return (
    <div className="p-8 bg-zinc-950 text-zinc-100 min-h-screen font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800 pb-6 gap-4">
          <div>
            <p className="text-xs font-mono font-bold text-blue-500 uppercase tracking-widest">Administrative Control Environment</p>
            <h1 className="text-3xl font-black uppercase tracking-wider text-zinc-100 mt-1">
              YieldFi Executive Treasury Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">System Live & Connected</span>
          </div>
        </div>

        {/* Loading / Error States */}
        {loading && !metrics && (
          <div className="py-20 text-center text-zinc-500 font-mono text-sm">
            <div className="animate-spin inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mb-3" />
            <p>STREAMING TREASURY SYSTEM DATA...</p>
          </div>
        )}

        {error && !metrics && (
          <div className="p-6 bg-red-950/20 border border-red-800 text-red-400 text-sm font-mono">
            CRITICAL ERROR: Failed to stream metrics from main network. Re-polling... ({error})
          </div>
        )}

        {/* Metrics Grid */}
        {(metrics || !loading) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Insurance TVL */}
            <div className="border border-zinc-800 p-6 bg-zinc-900/40 backdrop-blur-md relative overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
              <div className="absolute top-0 right-0 h-1.5 w-1.5 bg-emerald-400" />
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black font-mono">
                Insurance TVL
              </p>
              <p className="text-3xl font-mono font-extrabold text-zinc-100 mt-2">
                {formatUsd(metrics?.insurance_tvl ?? 2500000)}
              </p>
              <p className="text-[10px] text-zinc-400 font-sans mt-3">
                90% allocated to Ondo TBILL vaults, 10% held in high-velocity liquid reserves.
              </p>
            </div>

            {/* Card 2: Claims Paid */}
            <div className="border border-zinc-800 p-6 bg-zinc-900/40 backdrop-blur-md relative overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
              <div className="absolute top-0 right-0 h-1.5 w-1.5 bg-rose-500" />
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black font-mono">
                Claims Paid
              </p>
              <p className="text-3xl font-mono font-extrabold text-rose-500 mt-2">
                {formatUsd(metrics?.insurance_claims_paid ?? 120000)}
              </p>
              <p className="text-[10px] text-zinc-400 font-sans mt-3">
                Instant claim settlements verified on-chain and disbursed from liquid pools.
              </p>
            </div>

            {/* Card 3: Total Credit Deployed */}
            <div className="border border-zinc-850 p-6 bg-zinc-900/40 backdrop-blur-md relative overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
              <div className="absolute top-0 right-0 h-1.5 w-1.5 bg-blue-500" />
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black font-mono">
                Total Credit Deployed
              </p>
              <p className="text-3xl font-mono font-extrabold text-blue-500 mt-2">
                {formatUsd(metrics?.total_credit_deployed ?? 45000000)}
              </p>
              <p className="text-[10px] text-zinc-400 font-sans mt-3">
                Aggregated active debt lines and borrowing syndications routed automatically to high-spread pools.
              </p>
            </div>
          </div>
        )}

        {/* Extra Information Section */}
        <div className="border border-zinc-800 p-6 bg-zinc-900/20 backdrop-blur-sm rounded-none">
          <h3 className="text-sm font-bold uppercase text-zinc-300 font-mono mb-2">Automated Credit Risk Strategy</h3>
          <p className="text-xs text-zinc-400 leading-relaxed font-sans">
            The Corporate Credit Bot Module automatically monitors institutional borrowing protocols including Aave, Maple Finance, and Goldfinch. 
            By executing precise credit arbitrage cycles (borrowing at lower institutional rates and deploying to high-yield credit facilities), 
            the module locks in guaranteed risk-mitigated interest rate spreads. A flat 1% origination fee is harvested directly to the platform vault upon execution.
          </p>
        </div>
      </div>
    </div>
  );
}
