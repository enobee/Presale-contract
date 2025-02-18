"use client";

import React, { useState } from "react";
import { WithdrawTokensProps } from "@/types";

const WithdrawTokensForm: React.FC<WithdrawTokensProps> = ({
  withdrawTokens,
  presaleData,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const vaultBalance = presaleData.data?.tokenVaultBalance?.toNumber();

  const handleWithdraw = () => {
    setIsLoading(true);
    withdrawTokens.mutateAsync();
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-md mx-auto">
      <div className="bg-green-800 px-6 py-4 rounded-t-lg">
        <h2 className="text-xl font-bold text-white">
          Remaining Tokens in Vault
        </h2>
      </div>

      <div className="p-6 space-y-4">
        <div className="text-center">
          <span className="text-3xl font-bold text-gray-800">
            {vaultBalance || 0}
          </span>
          <span className="ml-2 text-gray-600">Tokens</span>
        </div>

        <button
          onClick={handleWithdraw}
          // disabled={isLoading || vaultBalance <= 0}
          className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isLoading ? "Processing..." : "Withdraw All Tokens"}
        </button>
      </div>
    </div>
  );
};

export default WithdrawTokensForm;
