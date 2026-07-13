// Admin Panel reference (actual live SPA code runs in /src/App.tsx)
// Contains the "Insurance TVL" and "Claims Paid" metrics cards.

import React from 'react';

export default function AdminPage() {
  return (
    <div className="p-8 bg-zinc-950 text-zinc-100 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-2xl font-black uppercase tracking-wider text-blue-500">
          Insurance Premium Treasury Dashboard
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Insurance TVL */}
          <div className="border border-zinc-800 p-6 bg-zinc-900/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 h-1.5 w-1.5 bg-emerald-400" />
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
              Insurance TVL
            </p>
            <p className="text-3xl font-mono font-bold text-zinc-100 mt-2">
              $2,500,000.00
            </p>
            <p className="text-[9px] text-zinc-500 font-mono mt-1">
              90% allocated to Ondo TBILL, 10% in liquid reserve
            </p>
          </div>

          {/* Card 2: Claims Paid */}
          <div className="border border-zinc-800 p-6 bg-zinc-900/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 h-1.5 w-1.5 bg-red-400" />
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
              Claims Paid
            </p>
            <p className="text-3xl font-mono font-bold text-red-500 mt-2">
              $120,000.00
            </p>
            <p className="text-[9px] text-zinc-500 font-mono mt-1">
              Instant payouts processed from liquid reserve
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
