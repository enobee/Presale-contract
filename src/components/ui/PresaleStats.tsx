"use client";

import React from "react";
import { usePresale } from "@/components/data-access/presale";
import { usePresaleProgramAccount } from "../data-access/presale-data-access";

export const PresaleStats: React.FC = () => {
  const { presalePDA } = usePresale();
  const { presaleAccountQuery } = usePresaleProgramAccount({
    account: presalePDA!,
  });

  const presaleData = presaleAccountQuery.data;

  const totalSHTPSold = presaleData?.totalTokenSold.toNumber() || 0;
  const totalSolRaised = presaleData?.totalSolRaised.toNumber() || 0;
  const totalUsdtRaised = presaleData?.totalUsdtRaised.toNumber() || 0;

  const USDT_DECIMALS_MULTIPLIER = 1_000_000; // 10^6
  const LAMPORTS_PER_SOL = 1_000_000_000; // 10^9
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="text-center">
          <div className="text-xl font-bold">{totalSHTPSold}</div>
          <div className="text-sm text-gray-500">Total SHTP Sold</div>
        </div>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="text-center">
          <div className="text-xl font-bold">
            {totalSolRaised / LAMPORTS_PER_SOL} SOL
          </div>
          <div className="text-sm text-gray-500">Total SOL Raised</div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <div className="text-center">
          <div className="text-xl font-bold">
            {totalUsdtRaised / USDT_DECIMALS_MULTIPLIER} USDT
          </div>
          <div className="text-sm text-gray-500">Total USDT Raised</div>
        </div>
      </div>
    </div>
  );
};
