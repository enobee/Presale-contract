"use client";

import React, { useState, useEffect } from "react";
import { WalletConnectionProvider } from "../components/data-access/solana/wallet";
import { CountdownTimer } from "../components/ui/CountdownTimer";
import { StageProgressBar } from "../components/ui/StageProgressBar";
import { BuyForm } from "../components/ui/BuyForm";
import { PresaleStats } from "../components/ui/PresaleStats";
import { Header } from "../components/ui/Header";
import { ClaimTokensForm } from "@/components/ui/ClaimTokens";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  usePresaleProgramAccount,
  usePresaleProgram,
} from "@/components/data-access/presale-data-access";
import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { usePresale } from "@/components/data-access/presale";

export default function HomePage() {
  const { program } = usePresaleProgram();
  const [userPDA, setUserPDA] = useState<PublicKey | null>(null);
  const { publicKey } = useWallet();
  const { presalePDA } = usePresale();
  // Effect to derive PDAs when component mounts
  // useEffect(() => {
  //   const deriveAddresses = async () => {
  //     if (!program) return;

  //     try {
  //       // Derive Presale PDA
  //       const [presaleAddr] = await PublicKey.findProgramAddress(
  //         [Buffer.from("presale")],
  //         program.programId
  //       );
  //       setPresalePDA(presaleAddr);
  //       console.log({ presaleAddr: presaleAddr });

  //       const [userAddr] = await PublicKey.findProgramAddress(
  //         [
  //           Buffer.from("user_info"),
  //           presalePDA!.toBuffer(),
  //           publicKey!.toBuffer(),
  //         ],
  //         program.programId
  //       );
  //       setUserPDA(userAddr);
  //     } catch (error) {
  //       console.error("Error deriving PDAs:", error);
  //     }
  //   };

  //   deriveAddresses();
  // }, [program]);

  // Use the PDAs to fetch account data
  const { presaleAccountQuery, buyTokenMutation, claimTokenMutation } =
    usePresaleProgramAccount({
      account: presalePDA!,
    });

  console.log({ presaleAccountQuery: presaleAccountQuery });

  // const { currentStage, loading: stageLoading } = usePresaleStage(presalePDA);

  const { userAccountQuery } = usePresaleProgramAccount({ account: userPDA! });
  console.log({ userAccountQuery: userAccountQuery });
  const presaleData = presaleAccountQuery.data;

  // Check if user has purchased any tokens
  const hasPurchased = userAccountQuery.data?.amountPurchased?.gt(new BN(0));

  // Get current stage data with proper type safety
  // const currentStageIndex = presaleData?.currentStageIndex?.toNumber() ?? 0;
  // const currentStage = presaleData?.stages?.[currentStageIndex];

  // Safely handle BN conversions with fallbacks
  // const currentStagePrice =
  //   currentStage?.data.  instanceof BN ? currentStage.price : new BN(0);

  // const currentStageEndTime =
  //   currentStage?.endTime instanceof BN ? currentStage.endTime.toNumber() : 0;

  // console.log({ currentStage: currentStage });
  // console.log({ currentStageEndTime: currentStage?.endTime });
  // console.log({ currentStagePrice: currentStagePrice });
  console.log({ stages: presaleData?.stages });

  return (
    <div>
      <WalletConnectionProvider>
        <div className="min-h-screen bg-gradient-to-b from-green-800 to-green-600">
          <Header />
          <div className="container mx-auto px-4 py-8 lg:max-w-[1024px]">
            <div className="bg-white p-6 mb-6 rounded-lg shadow">
              <h2 className="text-center text-gray-600 mb-4">Ended</h2>
              <CountdownTimer
                stages={
                  presaleData?.stages?.map((stage) => ({
                    startTime: stage.startTime.toNumber(), // Convert BN to number
                    endTime: stage.endTime.toNumber(), // Convert BN to number
                    price: stage.price.toNumber(), // Convert BN to number (if needed)
                  })) || []
                }
              />
            </div>
            <div className="bg-white p-6 mb-6 rounded-lg shadow">
              <div className="flex justify-between mb-2">
                {presaleData?.stages?.map((stage, index) => (
                  <span key={index} className="text-sm font-medium">
                    Stage {index + 1}
                  </span>
                ))}
              </div>
              {presaleData?.stages && presaleData.stages.length > 0 && (
                <StageProgressBar stages={presaleData.stages} />
              )}
            </div>
            <BuyForm
              stages={
                presaleData?.stages?.map((stage) => ({
                  startTime: stage.startTime,
                  endTime: stage.endTime,
                  price: stage.price,
                })) || []
              }
              buyTokens={buyTokenMutation}
            />
            <PresaleStats
              totalSHTPSold={presaleData?.totalTokenSold?.toNumber() ?? 0}
              totalSolRaised={presaleData?.totalSolRaised?.toNumber() ?? 0}
              totalUsdtRaised={presaleData?.totalUsdtRaised?.toNumber() ?? 0}
            />
            {hasPurchased && (
              <ClaimTokensForm
                claimTokens={claimTokenMutation}
                presaleData={presaleAccountQuery}
                userData={userAccountQuery}
              />
            )}
          </div>
        </div>
      </WalletConnectionProvider>
    </div>
  );
}
