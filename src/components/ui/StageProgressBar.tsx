import React, { useEffect, useState } from "react";
import { Stage } from "@/types";
import { BN } from "@coral-xyz/anchor";
import { usePresale } from "@/components/data-access/presale";
import { usePresaleProgramAccount } from "../data-access/presale-data-access";
import { useQueryClient } from "@tanstack/react-query";

interface StageProgressBarProps {
  stageNames?: string[]; // Optional stage names array
}

export const StageProgressBar: React.FC<StageProgressBarProps> = ({
  stageNames = ["Private Sale", "Presale 1", "Presale 2", "Presale 3"],
}) => {
  const { presalePDA } = usePresale();
  const queryClient = useQueryClient();

  // Fetch presale data and cache it
  const { presaleAccountQuery } = usePresaleProgramAccount({
    account: presalePDA!,
  });

  // Cache the data instead of re-fetching every render
  const [presaleData, setPresaleData] = useState(presaleAccountQuery.data);
  useEffect(() => {
    if (presaleAccountQuery.data) {
      setPresaleData(presaleAccountQuery.data);
    }
  }, [presaleAccountQuery.data]);

  // Track time updates only for the UI, not data fetching
  const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000));
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);

    return () => clearInterval(timeInterval);
  }, []);

  // If no stages available, return nothing to avoid unnecessary rendering
  if (!presaleData?.stages || presaleData.stages.length === 0) {
    return null;
  }

  const USDT_DECIMALS = 1_000_000;
  const formatDate = (timestamp: number) =>
    new Date(timestamp * 1000).toLocaleString();
  const formatPrice = (price: BN | number) => {
    const priceNumber = price instanceof BN ? price.toNumber() : price;
    return `1 SHTP = ${(priceNumber / USDT_DECIMALS).toFixed(2)} USDT`;
  };
  const getStageStatus = (startTime: number, endTime: number) => {
    if (currentTime < startTime) return "upcoming";
    if (currentTime >= endTime) return "completed";
    return "active";
  };

  return (
    <div>
      <div className="flex justify-between mb-2">
        {presaleData.stages.map((_, index) => (
          <span key={index} className="text-sm font-medium">
            {stageNames[index] || `Stage ${index + 1}`}
          </span>
        ))}
      </div>

      <div className="flex gap-2">
        {presaleData.stages.map((stage: Stage, index) => {
          const { startTime, endTime, price } = stage;
          const startTimeNumber =
            startTime instanceof BN ? startTime.toNumber() : startTime;
          const endTimeNumber =
            endTime instanceof BN ? endTime.toNumber() : endTime;
          const status = getStageStatus(startTimeNumber, endTimeNumber);

          let progress = 0;
          if (status === "active") {
            progress =
              ((currentTime - startTimeNumber) /
                (endTimeNumber - startTimeNumber)) *
              100;
          } else if (status === "completed") {
            progress = 100;
          }

          return (
            <div key={index} className="group relative flex-1">
              <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 invisible group-hover:visible bg-white text-black p-4 rounded shadow-lg text-sm whitespace-nowrap z-10 border border-gray-200">
                <div className="text-center font-medium mb-3">
                  {stageNames[index] || `Stage ${index + 1}`}
                  <span className="ml-2">
                    {status === "upcoming" && "(Not Started)"}
                    {status === "active" && "(In Progress)"}
                    {status === "completed" && "(Completed)"}
                  </span>
                </div>
                <div className="mb-2 font-bold">{formatPrice(price)}</div>
                <div className="mb-2">Start: {formatDate(startTimeNumber)}</div>
                <div className="mb-2">End: {formatDate(endTimeNumber)}</div>
                <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full">
                  <div className="border-8 border-transparent border-t-white"></div>
                </div>
              </div>

              <div className="relative cursor-help transition-transform hover:scale-y-150">
                <div className="h-2 bg-gray-200 rounded relative">
                  <div
                    className={`h-full transition-all duration-500 rounded ${
                      status === "upcoming"
                        ? "bg-gray-400"
                        : status === "active"
                        ? "bg-green-500"
                        : "bg-green-700"
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StageProgressBar;
