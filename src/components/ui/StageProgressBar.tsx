import React, { useEffect, useState } from "react";
import { StageProgressBarProps, Stage } from "@/types";
import { BN } from "@coral-xyz/anchor";

export const StageProgressBar: React.FC<StageProgressBarProps> = ({
  stages,
}) => {
  const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000));

  useEffect(() => {
    // Update currentTime every second to ensure real-time progress updates
    const interval = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const USDT_DECIMALS = 1_000_000;

  const formatDate = (timestamp: number) =>
    new Date(timestamp * 1000).toLocaleString();

  const formatPrice = (price: BN | number) => {
    const priceNumber = price instanceof BN ? price.toNumber() : price;
    const usdtPrice = (priceNumber / USDT_DECIMALS).toFixed(2);
    return `1 SHTP = ${usdtPrice} USDT`;
  };

  const getStageStatus = (startTime: number, endTime: number) => {
    if (currentTime < startTime) return "upcoming";
    if (currentTime >= endTime) return "completed";
    return "active";
  };

  return (
    <div className="flex gap-2">
      {stages.map((stage: Stage, index) => {
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
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 invisible group-hover:visible bg-white text-black p-4 rounded shadow-lg text-sm whitespace-nowrap z-10 border border-gray-200">
              <div className="text-center font-medium mb-3">
                Stage {index + 1}
                <span className="ml-2">
                  {status === "upcoming" && "(Not Started)"}
                  {status === "active" && "(In Progress)"}
                  {status === "completed" && "(Completed)"}
                </span>
              </div>
              <div className="mb-2 font-bold">{formatPrice(price)}</div>
              <div className="mb-2">Start: {formatDate(startTimeNumber)}</div>
              <div className="mb-2">End: {formatDate(endTimeNumber)}</div>
              {/* Arrow */}
              <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full">
                <div className="border-8 border-transparent border-t-white"></div>
              </div>
            </div>

            {/* Progress bar wrapper with hover effect */}
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
  );
};

export default StageProgressBar;
