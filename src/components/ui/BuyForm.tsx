"use client";

import React, { useState, useEffect } from "react";
import { useSolPrice } from "@/components/utils/chainlink";
import { useWallet } from "@solana/wallet-adapter-react";
import { usePresale } from "../data-access/presale";
import { useAssociatedTokenAccount } from "../data-access/AssociatedTokenAccount";
import { toast } from "react-toastify";
import { LoadingButton } from "./LoadingButton";
import { useAnchorProvider } from "../data-access/solana/wallet";
import { useTokenDecimal } from "./TokenDecimals";
import { usePresaleProgramAccount } from "../data-access/presale-data-access";
import { token } from "@coral-xyz/anchor/dist/cjs/utils";

export const BuyForm: React.FC = () => {
  const [paymentAmount, setPaymentAmount] = useState("0");
  const [SHTPAmount, setSHTPAmount] = useState(0);
  const [activeTab, setActiveTab] = useState<"SOL" | "USDT">("SOL");
  const [isBuying, setIsBuying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { publicKey } = useWallet();
  const { presalePDA, vaultPDA } = usePresale();

  const { presaleAccountQuery, buyTokenMutation } = usePresaleProgramAccount({
    account: presalePDA!,
  });

  const { vaultAccountQuery } = usePresaleProgramAccount({
    account: vaultPDA!,
  });
  const { price: solPrice } = useSolPrice();
  const { connection } = useAnchorProvider();

  const LAMPORTS_PER_SOL = 1_000_000_000; // 10^9

  const presaleData = presaleAccountQuery.data;
  const stages = presaleData?.stages || [];

  const now = Math.floor(Date.now() / 1000);
  const activeStage = stages.find(
    (stage) =>
      now >= stage.startTime.toNumber() && now <= stage.endTime.toNumber()
  );

  const usdtMint = vaultAccountQuery.data?.usdtMint!;
  const tokenMint = presaleAccountQuery.data?.tokenMint!;

  let { decimalMultiplier: usdtDecimalsMultiplier } = useTokenDecimal(usdtMint);
  let { decimalMultiplier: tokenDecimalsMultiplier } =
    useTokenDecimal(tokenMint);

  if (tokenDecimalsMultiplier === undefined) {
    tokenDecimalsMultiplier = 1000000000;
  }
  if (usdtDecimalsMultiplier === undefined) {
    usdtDecimalsMultiplier = 1000000;
  }

  console.log({ usdtMint: usdtMint?.toBase58()! });
  console.log({ tokenMint: tokenMint?.toBase58()! });
  const { fetchATA } = useAssociatedTokenAccount(usdtMint);

  // If no active stage, presale has ended
  const isPresaleEnded = !activeStage;

  // **New logic to determine the current price**
  const isPresaleNotStarted =
    stages.length > 0 && now < stages[0].startTime.toNumber();
  const firstStagePrice = stages.length > 0 ? stages[0].price.toNumber() : 0;
  const lastStagePrice =
    stages.length > 0 ? stages[stages.length - 1].price.toNumber() : 0;

  // **Update currentStagePrice logic**
  const currentStagePrice = isPresaleNotStarted
    ? firstStagePrice
    : isPresaleEnded
    ? lastStagePrice
    : activeStage?.price.toNumber() || 0;

  console.log({ currentStagePrice: currentStagePrice });

  useEffect(() => {
    const amount = parseFloat(paymentAmount);
    if (!isNaN(amount) && amount > 0) {
      if (activeTab === "USDT") {
        const usdtAmount = amount * usdtDecimalsMultiplier;
        const tokens = usdtAmount / usdtDecimalsMultiplier;
        const actualToken = tokens / currentStagePrice;
        const finalTokenAmount = actualToken / tokenDecimalsMultiplier;
        setSHTPAmount(Math.floor(finalTokenAmount));
      } else if (activeTab === "SOL" && solPrice) {
        const amountInLamports = amount * LAMPORTS_PER_SOL;
        const usdtValue = (amountInLamports * solPrice) / LAMPORTS_PER_SOL;
        const usdtAmount = usdtValue * usdtDecimalsMultiplier;
        const tokens = usdtAmount / usdtDecimalsMultiplier;
        const actualToken = tokens / currentStagePrice;
        const finalTokenAmount = actualToken / tokenDecimalsMultiplier;
        setSHTPAmount(Math.floor(finalTokenAmount));
      }
    } else {
      setSHTPAmount(0);
    }
  }, [paymentAmount, activeTab, currentStagePrice, solPrice]);

  const handleBuy = async () => {
    setIsLoading(true);
    if (isPresaleNotStarted || isPresaleEnded) return;
    const amount = parseFloat(paymentAmount);
    if (!isNaN(amount) && amount > 0) {
      setIsBuying(true);
      let adjustedAmount: number;

      if (activeTab === "USDT") {
        adjustedAmount = amount * usdtDecimalsMultiplier;
      } else if (activeTab === "SOL") {
        adjustedAmount = amount * LAMPORTS_PER_SOL;
      } else {
        console.error("Unknown payment method");
        return;
      }

      try {
        // First, ensure the ATA exists or create it
        const ata = await fetchATA();

        if (!ata) {
          console.log("No ATA returned");
          toast.error("Failed to create or retrieve the Token account.");
          return;
        }

        buyTokenMutation.mutateAsync({
          paymentMethod: activeTab,
          amount: adjustedAmount,
          usdtMint,
          tokenMint,
          buyerUsdtAccount: ata,
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const getButtonText = () => {
    if (!publicKey) return "Please connect your wallet to continue";
    if (isPresaleNotStarted) return "Presale not started";
    if (isPresaleEnded) return "Presale has ended";
    if (isBuying) return "";
    return "Buy";
  };

  const isButtonDisabled =
    !publicKey || isBuying || isPresaleEnded || isPresaleNotStarted;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <p className="mb-2 text-sm text-gray-600 font-bold">
        {isPresaleNotStarted
          ? "Presale not started"
          : isPresaleEnded
          ? "Presale has ended"
          : `Current Stage Price: ${
              currentStagePrice / usdtDecimalsMultiplier
            } USD`}
      </p>

      <div className="flex mb-4 border rounded">
        <button
          onClick={() => setActiveTab("SOL")}
          className={`flex-1 py-2 ${
            activeTab === "SOL"
              ? "bg-green-500 text-white"
              : "bg-white text-gray-700"
          }`}
        >
          SOL
        </button>
        <button
          onClick={() => setActiveTab("USDT")}
          className={`flex-1 py-2 ${
            activeTab === "USDT"
              ? "bg-green-500 text-white"
              : "bg-white text-gray-700"
          }`}
        >
          USDT
        </button>
      </div>

      <div className="mb-4">
        <label className="text-sm text-gray-600">
          Amount in {activeTab.toUpperCase()}:
        </label>
        <input
          type="number"
          inputMode="decimal"
          value={paymentAmount}
          onChange={(e) => setPaymentAmount(e.target.value)}
          onKeyDown={(e) => {
            // Prevent up/down arrow keys from changing the value
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
            }
          }}
          onWheel={(e) => {
            // Prevent scroll wheel from changing the value
            e.currentTarget.blur();
          }}
          className="w-full p-2 border rounded mt-1"
          placeholder={`Enter ${activeTab.toUpperCase()} amount`}
        />
      </div>

      <div className="mb-4">
        <label className="text-sm text-gray-600">
          Amount in SHTP You Receive:
        </label>
        <input
          type="text"
          value={SHTPAmount}
          readOnly
          className="w-full p-2 bg-gray-100 border rounded mt-1"
        />
      </div>

      <LoadingButton
        onClick={handleBuy}
        disabled={isButtonDisabled}
        className="w-full"
        loading={isLoading}
      >
        {getButtonText()}
      </LoadingButton>
    </div>
  );
};
