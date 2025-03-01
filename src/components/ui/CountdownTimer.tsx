"use client";

import React, { useEffect, useState } from "react";
import { usePresaleProgramAccount } from "@/components/data-access/presale-data-access";
import { usePresale } from "@/components/data-access/presale";
import { BN } from "@coral-xyz/anchor";

// Define stage names if not imported from a shared location
const stageNames = ["Private Sale", "Presale 1", "Presale 2", "Presale 3"];

export const CountdownTimer: React.FC = () => {
  const { presalePDA } = usePresale();

  const { presaleAccountQuery } = usePresaleProgramAccount({
    account: presalePDA!,
  });

  const presaleData = presaleAccountQuery.data;

  const stages = presaleData?.stages || [];

  const [countdownLabel, setCountdownLabel] = useState("Presale Ended");
  const [timeLeft, setTimeLeft] = useState({
    days: "00",
    hours: "00",
    minutes: "00",
    seconds: "00",
  });

  useEffect(() => {
    if (!stages || stages.length === 0) return;

    const now = Math.floor(Date.now() / 1000);

    // Sort stages to ensure correct order
    const sortedStages = [...stages].sort((a, b) => {
      const startTimeA =
        a.startTime instanceof BN ? a.startTime.toNumber() : a.startTime;
      const startTimeB =
        b.startTime instanceof BN ? b.startTime.toNumber() : b.startTime;
      return startTimeA - startTimeB;
    });

    let countdownTarget: number | null = null;

    // Convert BN to number if needed
    const firstStageStart =
      sortedStages[0].startTime instanceof BN
        ? sortedStages[0].startTime.toNumber()
        : sortedStages[0].startTime;

    if (now < firstStageStart) {
      // Presale has not started yet
      countdownTarget = firstStageStart;
      setCountdownLabel("Starting in...");
    } else {
      // Find the active stage
      const activeStage = sortedStages.find((stage) => {
        const stageStart =
          stage.startTime instanceof BN
            ? stage.startTime.toNumber()
            : stage.startTime;
        const stageEnd =
          stage.endTime instanceof BN
            ? stage.endTime.toNumber()
            : stage.endTime;
        return now >= stageStart && now <= stageEnd;
      });

      if (activeStage) {
        const activeStageEnd =
          activeStage.endTime instanceof BN
            ? activeStage.endTime.toNumber()
            : activeStage.endTime;

        countdownTarget = activeStageEnd;

        // Get the active stage index
        const activeIndex = sortedStages.indexOf(activeStage);
        // Use the stage name if available
        const stageName = stageNames[activeIndex] || `Stage ${activeIndex + 1}`;

        setCountdownLabel(`${stageName} ending in...`);
      }
    }

    if (!countdownTarget) {
      setCountdownLabel("Presale Ended");
      return;
    }

    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const difference = countdownTarget! - now;

      if (difference <= 0) {
        setCountdownLabel("Presale Ended");
        setTimeLeft({
          days: "00",
          hours: "00",
          minutes: "00",
          seconds: "00",
        });
        clearInterval(timer);
        return;
      }

      setTimeLeft({
        days: String(Math.floor(difference / (60 * 60 * 24))).padStart(2, "0"),
        hours: String(
          Math.floor((difference % (60 * 60 * 24)) / (60 * 60))
        ).padStart(2, "0"),
        minutes: String(Math.floor((difference % (60 * 60)) / 60)).padStart(
          2,
          "0"
        ),
        seconds: String(difference % 60).padStart(2, "0"),
      });
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, [stages]); // Keep `stages` to detect changes

  return (
    <div className="text-center">
      <p className="text-sm text-gray-600 mb-2 font-bold">{countdownLabel}</p>
      <div className="flex justify-center gap-4">
        {Object.entries(timeLeft).map(([unit, value]) => (
          <div key={unit} className="text-center">
            <div className="bg-gray-100 rounded p-2 min-w-[60px]">
              <span className="text-2xl font-bold">{value}</span>
            </div>
            <div className="text-sm text-gray-500 mt-1">{unit}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
