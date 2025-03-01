"use client";

import React from "react";
import { WalletConnectionProvider } from "../components/data-access/solana/wallet";
import { CountdownTimer } from "../components/ui/CountdownTimer";
import { StageProgressBar } from "../components/ui/StageProgressBar";
import { BuyForm } from "../components/ui/BuyForm";
import { PresaleStats } from "../components/ui/PresaleStats";
import { Header } from "../components/ui/Header";
import { ClaimTokensForm } from "@/components/ui/ClaimTokensForm";
import { usePresaleProgramAccount } from "@/components/data-access/presale-data-access";
import { BN } from "@coral-xyz/anchor";
import { usePresale } from "@/components/data-access/presale";

// Define stage names as a constant
const stageNames = ["Private Sale", "Presale 1", "Presale 2", "Presale 3"];

export default function HomePage() {
  const { userPDA } = usePresale();

  // Use the PDAs to fetch account data

  const { userAccountQuery } = usePresaleProgramAccount({ account: userPDA! });

  // Check if user has purchased any tokens
  const hasPurchased = userAccountQuery.data?.amountPurchased?.gt(new BN(0));

  return (
    <div>
      <WalletConnectionProvider>
        <div className="min-h-screen bg-gradient-to-b from-green-800 to-green-600">
          <Header />
          <div className="container mx-auto px-4 py-8 lg:max-w-[1024px]">
            <div className="bg-white p-6 mb-6 rounded-lg shadow">
              <CountdownTimer />
            </div>
            <div className="bg-white p-6 mb-6 rounded-lg shadow">
              <div className="bg-white p-6 mb-6 rounded-lg shadow">
                <StageProgressBar stageNames={stageNames} />
              </div>
            </div>
            <BuyForm />

            <div className="container mx-auto px-4 py-8">
              <PresaleStats />
              {hasPurchased && <ClaimTokensForm />}
            </div>
          </div>
        </div>
      </WalletConnectionProvider>
    </div>
  );
}
