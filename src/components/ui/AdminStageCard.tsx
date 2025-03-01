"use client";

import React, { useEffect, useState, useRef } from "react";
import { AdminStageCardProps } from "@/types";
import { usePresale } from "../data-access/presale";
import { usePresaleProgramAccount } from "../data-access/presale-data-access";

export const AdminStageCard: React.FC<AdminStageCardProps> = ({
  stageIndex = 0,
}) => {
  const { presalePDA } = usePresale();

  const { presaleAccountQuery } = usePresaleProgramAccount({
    account: presalePDA!,
  });

  const stageNames = ["Private Sale", "Presale 1", "Presale 2", "Presale 3"];

  // Store stage data in refs to avoid re-renders and state updates
  const stageDataRef = useRef({
    startTime: 0,
    endTime: 0,
    price: 0,
    stageName: "",
  });

  // UI state that needs to trigger re-renders
  const [stageStatus, setStageStatus] = useState("upcoming");
  const [timeLeft, setTimeLeft] = useState("");
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const USDT_DECIMALS_MULTIPLIER = 1_000_000; // 10^6

  // Load data only once when it becomes available
  useEffect(() => {
    if (presaleAccountQuery.data && !isDataLoaded) {
      const presaleData = presaleAccountQuery.data;
      // Make sure stageIndex is within the array bounds
      if (stageIndex < presaleData.stages.length) {
        const stage = presaleData.stages[stageIndex];

        if (stage) {
          stageDataRef.current = {
            startTime: stage.startTime.toNumber() * 1000,
            endTime: stage.endTime.toNumber() * 1000,
            price: stage.price.toNumber(),
            stageName: stageNames[stageIndex],
          };
          setIsDataLoaded(true);
        }
      } else {
        // Handle the case when stageIndex is out of bounds
        // Use default values or fallback data
        stageDataRef.current = {
          startTime: 0,
          endTime: 0,
          price: 0,
          stageName: stageNames[stageIndex] || `Stage ${stageIndex + 1}`,
        };
        setIsDataLoaded(true);
      }
    }
  }, [presaleAccountQuery.data, stageIndex, isDataLoaded]);

  // Update time left with a single interval
  useEffect(() => {
    if (!isDataLoaded) return;

    const updateStatus = () => {
      const now = Date.now();
      const { startTime, endTime } = stageDataRef.current;

      if (now < startTime) {
        setStageStatus("upcoming");
      } else if (now >= startTime && now <= endTime) {
        setStageStatus("active");
      } else {
        setStageStatus("completed");
      }

      // Calculate time left or time until start
      let targetTime = now < startTime ? startTime : endTime;
      if (now > endTime) {
        setTimeLeft("Completed");
        return;
      }

      const diff = targetTime - now;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };

    updateStatus();
    const interval = setInterval(updateStatus, 1000);
    return () => clearInterval(interval);
  }, [isDataLoaded]);

  const getStatusColor = () => {
    switch (stageStatus) {
      case "active":
        return "bg-green-100 text-green-500 border-green-500";
      case "completed":
        return "bg-green-200 text-green-800 border-green-800";
      default:
        return "bg-gray-100 text-gray-800 border-gray-500";
    }
  };

  if (!isDataLoaded) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        Loading stage data...
      </div>
    );
  }

  const { startTime, endTime, price, stageName } = stageDataRef.current;

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className={`px-6 py-4 border-l-4 ${getStatusColor()}`}>
        <h3 className="text-lg font-semibold">{stageName}</h3>
        <span className="text-sm capitalize">{stageStatus}</span>
      </div>

      <div className="p-6 flex flex-col space-y-2">
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>
              Time {stageStatus === "upcoming" ? "until start" : "remaining"}:
            </span>
            <span className="font-medium text-gray-800">{timeLeft}</span>
          </div>

          <div className="flex justify-between text-sm text-gray-600">
            <span>Price:</span>
            <span className="font-medium text-gray-800">
              ${(price / USDT_DECIMALS_MULTIPLIER).toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between text-sm text-gray-600">
            <span>Start:</span>
            <span className="font-medium text-gray-800">
              {new Date(startTime).toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between text-sm text-gray-600">
            <span>End:</span>
            <span className="font-medium text-gray-800">
              {new Date(endTime).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
