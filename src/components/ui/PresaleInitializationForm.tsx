"use client";

import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { BN } from "@coral-xyz/anchor";
import { usePresaleProgram } from "../data-access/presale-data-access";

interface Stage {
  id: number;
  startTime: string;
  endTime: string;
  price: string;
}

interface InitializationFormProps {
  onInitialized?: () => void; // Add callback prop
}

export const InitializationForm = ({
  onInitialized,
}: InitializationFormProps) => {
  const [presaleStart, setPresaleStart] = useState("");
  const [presaleEnd, setPresaleEnd] = useState("");
  const [tokenMint, setTokenMint] = useState("");
  const [stages, setStages] = useState<Stage[]>([]);
  const [isInitializing, setIsInitializing] = useState(false);
  const { initializePresale } = usePresaleProgram();

  // Update stages when presale times change
  useEffect(() => {
    if (stages.length > 0) {
      const updatedStages = [...stages];
      // Update first stage start time
      updatedStages[0] = { ...updatedStages[0], startTime: presaleStart };
      // Update last stage end time
      if (updatedStages.length === 4) {
        updatedStages[3] = { ...updatedStages[3], endTime: presaleEnd };
      }
      setStages(updatedStages);
    }
  }, [presaleStart, presaleEnd]);

  const handleAddStage = () => {
    if (stages.length >= 4) {
      toast.error("You can only add up to 4 stages.");
      return;
    }

    const newStage = {
      id: stages.length + 1,
      startTime:
        stages.length === 0 ? presaleStart : stages[stages.length - 1].endTime,
      endTime: stages.length === 3 ? presaleEnd : "",
      price: "",
    };

    setStages([...stages, newStage]);
  };

  const handleStageChange = (index: number, field: string, value: string) => {
    const updatedStages = [...stages];

    if (field === "endTime") {
      // Update the next stage's start time if it exists
      if (index < stages.length - 1) {
        updatedStages[index + 1].startTime = value;
      }
    }

    updatedStages[index] = { ...updatedStages[index], [field]: value };
    setStages(updatedStages);
  };

  const convertToUnix = (datetime: string | number | Date) => {
    if (!datetime) return 0;
    const timestamp = new Date(datetime).getTime();
    if (isNaN(timestamp)) {
      console.error("Invalid datetime:", datetime);
      return 0;
    }
    return Math.floor(timestamp / 1000);
  };

  const handleInitialize = async () => {
    setIsInitializing(true);

    if (!tokenMint) {
      toast.error("Please enter a token mint address.");
      setIsInitializing(false);
      return;
    }

    if (!presaleStart || !presaleEnd) {
      toast.error("Please set both presale start and end times.");
      setIsInitializing(false);
      return;
    }

    if (stages.length === 0) {
      toast.error("Please add at least one stage.");
      setIsInitializing(false);
      return;
    }

    // Convert presale start and end times to timestamps
    const presaleStartTime = new Date(presaleStart).getTime();
    const presaleEndTime = new Date(presaleEnd).getTime();

    if (presaleEndTime <= presaleStartTime) {
      toast.error("Presale end time must be greater than the start time.");
      setIsInitializing(false);
      return;
    }

    // Validate each stage
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const startTime = new Date(stage.startTime).getTime();
      const endTime = new Date(stage.endTime).getTime();

      if (!stage.startTime || !stage.endTime || !stage.price) {
        toast.error(`Stage ${i + 1} has incomplete data.`);
        setIsInitializing(false);
        return;
      }

      if (isNaN(Number(stage.price)) || Number(stage.price) <= 0) {
        toast.error(`Stage ${i + 1} has an invalid price.`);
        setIsInitializing(false);
        return;
      }

      if (endTime <= startTime) {
        toast.error(
          `Stage ${i + 1}: End time must be greater than start time.`
        );
        setIsInitializing(false);
        return;
      }

      // Ensure stages are continuous
      if (i > 0) {
        const prevStageEnd = new Date(stages[i - 1].endTime).getTime();
        if (startTime !== prevStageEnd) {
          toast.error(`Gap detected between stage ${i} and ${i + 1}.`);
          setIsInitializing(false);
          return;
        }
      }
    }

    try {
      const formattedStages = stages.map((stage) => ({
        startTime: new BN(convertToUnix(stage.startTime)),
        endTime: new BN(convertToUnix(stage.endTime)),
        price: new BN(Math.floor(Number(stage.price) * 1000000)),
      }));

      await initializePresale.mutateAsync({
        stages: formattedStages,
        startTime: new BN(convertToUnix(presaleStart)),
        endTime: new BN(convertToUnix(presaleEnd)),
        tokenMint,
      });

      toast.success("Presale initialized successfully");

      if (onInitialized) {
        onInitialized();
      }
    } catch (error) {
      console.error("Initialization error:", error);
      toast.error("Failed to initialize presale");
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <div className="bg-white p-6 mb-6 rounded-lg shadow">
      <div className="mb-4">
        <label className="text-sm text-gray-600">Token Mint Address:</label>
        <input
          type="text"
          value={tokenMint}
          onChange={(e) => setTokenMint(e.target.value)}
          className="w-full p-2 border rounded mt-1"
          placeholder="Enter token mint address"
        />
      </div>

      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-md text-gray-900">
          <h2 className="text-2xl font-semibold mb-4">Presale Time Settings</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">
                Presale Start Time
              </label>
              <input
                type="datetime-local"
                value={presaleStart}
                onChange={(e) => setPresaleStart(e.target.value)}
                className="mt-1 w-full p-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">
                Presale End Time
              </label>
              <input
                type="datetime-local"
                value={presaleEnd}
                onChange={(e) => setPresaleEnd(e.target.value)}
                className="mt-1 w-full p-2 border rounded-lg"
              />
            </div>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Stages</h3>
          {stages.map((stage, index) => (
            <div key={index} className="mb-4 p-4 border rounded">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Start Time</label>
                  <input
                    type="datetime-local"
                    value={stage.startTime}
                    disabled={true}
                    className="w-full p-2 border rounded mt-1 bg-gray-100"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">End Time</label>
                  <input
                    type="datetime-local"
                    value={stage.endTime}
                    onChange={(e) =>
                      handleStageChange(index, "endTime", e.target.value)
                    }
                    disabled={
                      index === stages.length - 1 && stages.length === 4
                    }
                    className="w-full p-2 border rounded mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Price (USD)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={stage.price}
                    onChange={(e) =>
                      handleStageChange(index, "price", e.target.value)
                    }
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
                    placeholder="Enter price"
                  />
                </div>
              </div>
            </div>
          ))}

          {stages.length < 4 && (
            <button
              className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600 flex items-center justify-center"
              onClick={handleAddStage}
            >
              Add Stage ({stages.length}/4)
            </button>
          )}

          {stages.length === 4 && (
            <LoadingButton
              onClick={handleInitialize}
              loading={isInitializing}
              className="w-full"
            >
              Initialize Presale
            </LoadingButton>
          )}
        </div>
      </div>
    </div>
  );
};
