import React, { useState, useEffect } from "react";
import { useAssociatedTokenAccount } from "../data-access/AssociatedTokenAccount";
import { toast } from "react-toastify";
import { LoadingButton } from "./LoadingButton";
import { usePresaleProgramAccount } from "../data-access/presale-data-access";
import { usePresale } from "@/components/data-access/presale";

export const ClaimTokensForm: React.FC = () => {
  const { presalePDA, userPDA } = usePresale();

  const { presaleAccountQuery, claimTokenMutation } = usePresaleProgramAccount({
    account: presalePDA!,
  });
  const { userAccountQuery } = usePresaleProgramAccount({
    account: userPDA!,
  });
  const presaleData = presaleAccountQuery.data!;
  const userData = userAccountQuery.data!;
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState("Calculating...");
  const [canClaim, setCanClaim] = useState(false);
  const { fetchATA } = useAssociatedTokenAccount(presaleData.tokenMint!);

  useEffect(() => {
    if (!presaleData?.endTime) return;

    const updateClaimTime = () => {
      const now = Date.now();
      const claimTime = presaleData.endTime.toNumber() + (24 * 60 * 60) / 1000;
      const difference = claimTime - now;

      if (difference <= 0) {
        setCanClaim(true);
        setTimeLeft("");
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

      setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      setCanClaim(false);
    };

    updateClaimTime();
    const interval = setInterval(updateClaimTime, 1000);
    return () => clearInterval(interval);
  }, [presaleData?.endTime]);

  const handleClaim = async () => {
    if (!canClaim) return;

    setIsLoading(true);
    try {
      const ata = await fetchATA();

      if (!ata) {
        toast.error("Failed to create or retrieve the Token account.");
        return;
      }

      await claimTokenMutation.mutateAsync({
        tokenMintKey: presaleData.tokenMint!,
        buyerTokenAccount: ata,
      });
    } catch (error) {
      toast.error("Failed to claim tokens. Please try again.");
      console.log({ TokenClaimError: error });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Token Claim</h2>
          <p className="text-gray-600 mt-2">
            Claim will be available 24 hours after presale ends
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-6 mb-6 text-center">
          <div className="text-3xl font-bold text-gray-800">
            {userData.amountPurchased?.toNumber() || 0}
          </div>
          <p className="text-gray-600">SHTP tokens to claim</p>

          {!canClaim ? (
            <div className="text-center text-gray-600 mt-4">
              <p>Time until claim:</p>
              <p className="text-xl font-bold text-green-600">{timeLeft}</p>
            </div>
          ) : (
            <p className="text-green-600 font-medium mt-4">
              Tokens are ready to be claimed!
            </p>
          )}
        </div>

        <LoadingButton
          onClick={handleClaim}
          disabled={!canClaim}
          className="w-full py-3 rounded-lg transition-colors duration-200 bg-green-500 hover:bg-green-600 text-white"
          loading={isLoading}
        >
          {canClaim ? "Claim Tokens" : "Claim Available Soon"}
        </LoadingButton>
      </div>
    </div>
  );
};
