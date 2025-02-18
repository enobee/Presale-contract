"use client";

import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { usePresaleProgramAccount } from "@/components/data-access/presale-data-access";
import { WithdrawFormProps } from "@/types";

export const WithdrawForm: React.FC<WithdrawFormProps> = ({
  withdrawProceeds,
}) => {
  const { publicKey } = useWallet(); // Assuming wallet is connected

  // if (!publicKey) {
  //   return <div>Please connect your wallet</div>;
  // }

  // Pass the publicKey to the hook
  // const { presaleAccountQuery, vaultAccountQuery, userAccountQuery } = usePresale1ProgramAccount({
  //   account: publicKey,  // Pass the publicKey as the account
  // });

  const {
    presaleAccountQuery: { data: presaleData },
  } = usePresaleProgramAccount({ account: publicKey! });

  const [activeTab, setActiveTab] = useState<"SOL" | "USDT">("SOL");

  const totalSol =
    (presaleData?.totalSolRaised.toNumber() ?? 0) / 1_000_000_000;
  const totalUsdt = presaleData?.totalUsdtRaised.toNumber() ?? 0;

  const handleWithdraw = () => {
    withdrawProceeds.mutateAsync({ paymentMethod: activeTab });
  };

  return (
    <div className="bg-white p-6 mb-6 rounded-lg shadow">
      <div className="flex mb-4 border rounded">
        <button
          onClick={() => setActiveTab("SOL")}
          className={`flex-1 py-2 ${
            activeTab === "SOL"
              ? "bg-green-500 text-white"
              : "bg-white text-gray-700"
          }`}
        >
          {`Withdraw ${totalSol.toFixed(2)} SOL`}
        </button>
        <button
          onClick={() => setActiveTab("USDT")}
          className={`flex-1 py-2 ${
            activeTab === "USDT"
              ? "bg-green-500 text-white"
              : "bg-white text-gray-700"
          }`}
        >
          {`Withdraw ${totalUsdt.toFixed(2)} SOL`}
        </button>
      </div>

      <button
        onClick={handleWithdraw}
        className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600"
        disabled={withdrawProceeds.status === "pending"}
      >
        {withdrawProceeds.status === "pending" ? "Withdrawing..." : "Withdraw"}
      </button>
    </div>
  );
};
