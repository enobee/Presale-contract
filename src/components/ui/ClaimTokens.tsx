"use client";

import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { usePresaleProgramAccount } from "../data-access/presale-data-access";
import { ClaimTokenFormProps } from "@/types";

export const ClaimTokensForm: React.FC<ClaimTokenFormProps> = ({
  claimTokens,
  presaleData,
  userData,
}) => {
  const [timeLeft, setTimeLeft] = useState("");
  const [canClaim, setCanClaim] = useState(false);
  const [amount, setAmount] = useState(0);

  const { publicKey } = useWallet();

  // if (!publicKey) {
  //   return <div>Please connect your wallet</div>;
  // }

  const { userAccountQuery, presaleAccountQuery, claimTokenMutation } =
    usePresaleProgramAccount({
      account: publicKey!,
    });

  const userInfo = userData.data;
  // const presaleData = presaleAccountQuery.data;

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();

      const claimAvailableTime =
        presaleData.data?.claimAvailableTime?.toNumber();
      if (claimAvailableTime !== undefined) {
        const claimDateTime = new Date(claimAvailableTime).getTime();
        const difference = claimDateTime - now; // Now `difference` is calculated inside the block

        if (difference <= 0) {
          setCanClaim(true);
          setTimeLeft("");
          clearInterval(timer);
        } else {
          const days = Math.floor(difference / (1000 * 60 * 60 * 24));
          const hours = Math.floor(
            (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
          );

          if (days > 0) {
            setTimeLeft(`${days} days left`);
          } else {
            setTimeLeft(`${hours} hours left`);
          }
          setCanClaim(false);
        }
      }
    }, 1000);

    return () => clearInterval(timer); // Cleanup on component unmount
  }, [presaleData.data?.claimAvailableTime]);

  const handleClaim = () => {
    claimTokens.mutateAsync();
  };

  return (
    <div className="w-full max-w-sm bg-white rounded-lg shadow-lg p-6">
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-3xl font-bold">
            {userInfo?.amountPurchased.toNumber()}
          </h2>
          <p className="text-gray-600">$SHTP token to claim</p>
        </div>

        <button
          onClick={handleClaim}
          disabled={!canClaim}
          className={`w-full py-2 px-4 rounded-md font-medium transition-colors duration-200
            ${
              canClaim
                ? "bg-green-500 hover:bg-green-600 text-white"
                : "bg-gray-200 text-gray-600 cursor-not-allowed"
            }`}
        >
          {canClaim ? "Claim" : timeLeft}
        </button>
      </div>
    </div>
  );
};
