"use client";

import React, { useEffect, useState } from "react";
import { useAssociatedTokenAccount } from "../data-access/AssociatedTokenAccount";
import { toast } from "react-toastify";
import { LoadingButton } from "./LoadingButton";
import { usePresale } from "../data-access/presale";
import { useTokenDecimal } from "./TokenDecimals";
import { usePresaleProgramAccount } from "../data-access/presale-data-access";

export const WithdrawTokensForm: React.FC = () => {
  const { presalePDA } = usePresale();
  const {
    presaleAccountQuery,
    withdrawRemainingTokenMutation: withdrawTokens,
  } = usePresaleProgramAccount({
    account: presalePDA!,
  });
  const presaleData = presaleAccountQuery.data!;
  const tokenMint = presaleData?.tokenMint!;
  const { decimalMultiplier: tokenDecimalsMultiplier } =
    useTokenDecimal(tokenMint);

  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState("Calculating...");
  const [canWithdraw, setCanWithdraw] = useState(false);

  const vaultBalance =
    (presaleData?.tokenVaultBalance?.toNumber() ?? 0) / tokenDecimalsMultiplier;
  const tokenMintKey = presaleData?.tokenMint!;
  const { fetchATA } = useAssociatedTokenAccount(tokenMintKey);

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

  const handleWithdraw = async () => {
    if (!canWithdraw) return;
    try {
      setIsLoading(true);
      const ata = await fetchATA();
      if (!ata) {
        toast.error("Failed to create or retrieve the Token account.");
        return;
      }

      await withdrawTokens.mutateAsync({
        tokenMintKey,
        ownerTokenAccount: ata,
      });

      toast.success("Withdrawal successful!");
    } catch (error) {
      toast.error("Withdrawal failed. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">
            Token Withdrawal
          </h2>
          <p className="text-gray-600 mt-2">
            Withdraw remaining tokens from the vault
          </p>
          <p className="text-gray-600 mt-2">
            Withdrawal will be available 24 hours after presale ends
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <div className="text-center space-y-4">
            <div>
              <div className="text-3xl font-bold text-gray-800">
                {vaultBalance || 0}
              </div>
              <p className="text-gray-600">SHTP tokens in vault</p>
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
            Tokens can be withdrawn now!
          </p>
        )}

        <LoadingButton
          onClick={handleWithdraw}
          loading={isLoading}
          disabled={!canWithdraw}
          className="w-full mt-4"
        >
          {!canWithdraw ? "Withdrawal Available Soon" : `Withdraw All Tokens`}
        </LoadingButton>
      </div>
    </div>
  );
};
