"use client";

import React, { useState, useEffect } from "react";
import { useSolPrice } from "@/components/utils/chainlink";
import { useWallet } from "@solana/wallet-adapter-react";
import { usePresaleProgramAccount } from "../data-access/presale-data-access";
import { BuyFormProps } from "@/types";

export const BuyForm: React.FC<BuyFormProps> = ({ stages, buyTokens }) => {
  const [paymentAmount, setPaymentAmount] = useState("");
  const [SHTPAmount, setSHTPAmount] = useState("0");
  const [activeTab, setActiveTab] = useState<"SOL" | "USDT">("SOL");
  const [isBuying, setIsBuying] = useState(false);
  const { publicKey } = useWallet();
  const { price: solPrice } = useSolPrice();

  const TOKEN_DECIMALS_MULTIPLIER = 1_000_000_000; // 10^9
  const USDT_DECIMALS_MULTIPLIER = 1_000_000; // 10^6
  const LAMPORTS_PER_SOL = 1_000_000_000; // 10^9

  const now = Math.floor(Date.now() / 1000);
  const activeStage = stages.find(
    (stage) =>
      now >= stage.startTime.toNumber() && now <= stage.endTime.toNumber()
  );

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

  useEffect(() => {
    const amount = parseFloat(paymentAmount);
    if (!isNaN(amount) && amount > 0) {
      if (activeTab === "USDT") {
        const usdtAmount = amount * USDT_DECIMALS_MULTIPLIER;
        const tokens =
          (usdtAmount * TOKEN_DECIMALS_MULTIPLIER) /
          (currentStagePrice * USDT_DECIMALS_MULTIPLIER);
        setSHTPAmount(
          (
            tokens /
            (TOKEN_DECIMALS_MULTIPLIER / USDT_DECIMALS_MULTIPLIER)
          ).toFixed(2)
        );
      } else if (activeTab === "SOL" && solPrice) {
        const usdtValue = amount * solPrice * USDT_DECIMALS_MULTIPLIER;
        const tokens =
          (usdtValue * TOKEN_DECIMALS_MULTIPLIER) /
          (currentStagePrice * USDT_DECIMALS_MULTIPLIER);
        setSHTPAmount(
          (
            tokens /
            (TOKEN_DECIMALS_MULTIPLIER / USDT_DECIMALS_MULTIPLIER)
          ).toFixed(2)
        );
      }
    } else {
      setSHTPAmount("0");
    }
  }, [paymentAmount, activeTab, currentStagePrice, solPrice]);

  const handleBuy = () => {
    if (isPresaleNotStarted || isPresaleEnded) return;
    const amount = parseFloat(paymentAmount);
    if (!isNaN(amount) && amount > 0) {
      setIsBuying(true);
      let adjustedAmount: number;

      if (activeTab === "USDT") {
        adjustedAmount = amount * USDT_DECIMALS_MULTIPLIER;
      } else if (activeTab === "SOL") {
        adjustedAmount = amount * LAMPORTS_PER_SOL;
      } else {
        console.error("Unknown payment method");
        return;
      }

      buyTokens.mutateAsync({
        paymentMethod: activeTab,
        amount: adjustedAmount,
      });
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
    <div className="bg-white p-6 mb-6 rounded-lg shadow">
      <p className="mb-2 text-sm text-gray-600 font-bold">
        {isPresaleNotStarted
          ? "Presale not started"
          : isPresaleEnded
          ? "Presale has ended"
          : `Current Stage Price: ${
              currentStagePrice / USDT_DECIMALS_MULTIPLIER
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
          value={paymentAmount}
          onChange={(e) => setPaymentAmount(e.target.value)}
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

      <button
        onClick={handleBuy}
        disabled={isButtonDisabled}
        className={`w-full py-2 rounded flex items-center justify-center ${
          isButtonDisabled ? "bg-gray-400" : "bg-green-500 hover:bg-green-600"
        } text-white`}
      >
        {isBuying ? (
          <div className="spinner border-2 border-white border-t-2 border-t-transparent h-5 w-5 rounded-full" />
        ) : (
          getButtonText()
        )}
      </button>
    </div>
  );
};
