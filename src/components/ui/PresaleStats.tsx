"use client";

import React from "react";
import { PresaleStatsProps } from "@/types";

export const PresaleStats: React.FC<PresaleStatsProps> = ({
  totalSHTPSold,
  totalSolRaised,
  totalUsdtRaised,
}) => {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="text-center">
          <div className="text-xl font-bold">{totalSHTPSold}</div>
          <div className="text-sm text-gray-500">Total SHTP Sold</div>
        </div>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="text-center">
          <div className="text-xl font-bold">{totalSolRaised} SOL</div>
          <div className="text-sm text-gray-500">Total SOL Raised</div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <div className="text-center">
          <div className="text-xl font-bold">{totalUsdtRaised} USDT</div>
          <div className="text-sm text-gray-500">Total USDT Raised</div>
        </div>
      </div>
    </div>
  );
};
