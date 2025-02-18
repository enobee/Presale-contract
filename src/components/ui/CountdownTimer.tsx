"use client";

import React, { useEffect, useState } from "react";

interface Stage {
  startTime: number;
  endTime: number;
}

interface CountdownTimerProps {
  stages: Stage[];
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ stages }) => {
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
    const sortedStages = [...stages].sort((a, b) => a.startTime - b.startTime);

    let countdownTarget: number | null = null;

    if (now < sortedStages[0].startTime) {
      // Presale has not started yet
      countdownTarget = sortedStages[0].startTime;
      setCountdownLabel("Starting in...");
    } else {
      // Find the active stage
      const activeStage = sortedStages.find(
        (stage) => now >= stage.startTime && now <= stage.endTime
      );

      if (activeStage) {
        countdownTarget = activeStage.endTime;
        setCountdownLabel(
          `Stage ${sortedStages.indexOf(activeStage) + 1} ending in...`
        );
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
      <p className="text-sm text-gray-600 mb-2">{countdownLabel}</p>
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
