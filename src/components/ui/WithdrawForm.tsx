"use client";

import React, { useEffect, useState } from "react";
import { usePresale } from "../data-access/presale";
import { useAssociatedTokenAccount } from "../data-access/AssociatedTokenAccount";
import { toast } from "react-toastify";
import { LoadingButton } from "./LoadingButton";
import { useTokenDecimal } from "./TokenDecimals";
import { usePresaleProgramAccount } from "../data-access/presale-data-access";

export const WithdrawForm: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState("Calculating...");
  const [canWithdraw, setCanWithdraw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"SOL" | "USDT">("SOL");

  const { presalePDA, vaultPDA } = usePresale();

  const {
    presaleAccountQuery: { data: presaleData },
    withdrawProceedsMutation: withdrawProceeds,
  } = usePresaleProgramAccount({
    account: presalePDA!,
  });

  const {
    vaultAccountQuery: { data: vaultData },
  } = usePresaleProgramAccount({
    account: vaultPDA!,
  });

  console.log({ vaultData: vaultData });

  const usdtMint = vaultData?.usdtMint!;
  let { decimalMultiplier: usdtDecimalsMultiplier } = useTokenDecimal(usdtMint);

  if (usdtDecimalsMultiplier === undefined) {
    usdtDecimalsMultiplier = 1000000;
  }

  const LAMPORTS_PER_SOL = 1_000_000_000;

  useEffect(() => {
    if (!presaleData?.endTime) return;

    const updateWithdrawTime = () => {
      const now = Date.now();
      const withdrawTime =
        presaleData.endTime.toNumber() + (24 * 60 * 60) / 1000;
      const difference = withdrawTime - now;

      if (difference <= 0) {
        setCanWithdraw(true);
        setTimeLeft("");
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

      setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      setCanWithdraw(false);
    };

    updateWithdrawTime();
    const interval = setInterval(updateWithdrawTime, 1000);
    return () => clearInterval(interval);
  }, [presaleData?.endTime]);

  const totalSol =
    (presaleData?.solVaultBalance.toNumber() ?? 0) / LAMPORTS_PER_SOL;
  const totalUsdt = presaleData?.usdtVaultBalance.toNumber() ?? 0;

  const { fetchATA } = useAssociatedTokenAccount(usdtMint);

  const handleWithdraw = async () => {
    if (!canWithdraw) return;
    try {
      setIsLoading(true);
      const ata = await fetchATA();
      if (!ata) {
        toast.error("Failed to create or retrieve the Token account.");
        return;
      }
      await withdrawProceeds.mutateAsync({
        paymentMethod: activeTab,
        usdtMint,
        ownerUsdtAccount: ata,
      });
    } catch (error) {
      toast.error("Withdrawal failed. Please try again.");
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">
            Withdraw Proceeds
          </h2>
          <p className="text-gray-600 mt-2">
            Withdrawal will be available 24 hours after presale ends
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div
              className={`cursor-pointer rounded-lg p-4 text-center transition-colors duration-200 ${
                activeTab === "SOL"
                  ? "bg-green-500 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
              onClick={() => setActiveTab("SOL")}
            >
              <div className="text-2xl font-bold mb-2">{totalSol}</div>
              <div>SOL Available</div>
            </div>
            <div
              className={`cursor-pointer rounded-lg p-4 text-center transition-colors duration-200 ${
                activeTab === "USDT"
                  ? "bg-green-500 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
              onClick={() => setActiveTab("USDT")}
            >
              <div className="text-2xl font-bold mb-2">
                {totalUsdt / usdtDecimalsMultiplier}
              </div>
              <div>USDT Available</div>
            </div>
          </div>
        </div>

        {!canWithdraw ? (
          <div className="text-center text-gray-600">
            <p>Time until withdrawal:</p>
            <p className="text-xl font-bold text-green-600">{timeLeft}</p>
          </div>
        ) : (
          <p className="text-green-600 font-medium mt-4 text-center">
            Presale Proceeds can be withdrawn now!
          </p>
        )}

        <LoadingButton
          onClick={handleWithdraw}
          loading={isLoading}
          disabled={!canWithdraw}
          className="w-full"
        >
          {!canWithdraw ? "Withdrawal Available Soon" : `Withdraw ${activeTab}`}
        </LoadingButton>
      </div>
    </div>
  );
};
