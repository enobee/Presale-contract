"use client";

import React, { useState } from "react";
import { toast } from "react-toastify";
import { LoadingButton } from "./LoadingButton";
import { usePresale } from "../data-access/presale";
import { usePresaleProgramAccount } from "../data-access/presale-data-access";

interface VaultInitializationProps {
  onInitialized?: () => void; // Add callback prop
}

export const VaultInitialization = ({
  onInitialized,
}: VaultInitializationProps) => {
  const { presalePDA } = usePresale();
  const { initializePresaleVault } = usePresaleProgramAccount({
    account: presalePDA!,
  });

  const [isInitializing, setIsInitializing] = useState(false);
  const [usdtMint, setUsdtMint] = useState("");

  const handleVaultInitialize = async () => {
    if (!usdtMint) {
      toast.error("Please enter a USDT mint address.");
      return;
    }
    setIsInitializing(true);
    try {
      await initializePresaleVault.mutateAsync({ usdtMint });
      toast.success("Vault initialized successfully");

      // Call the onInitialized callback
      if (onInitialized) {
        onInitialized();
      }
    } catch (error) {
      console.error("Vault initialization error:", error);
      toast.error("Failed to initialize vault");
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <div className="bg-white p-6 mb-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Initialize Vault</h2>
      <div className="mb-4">
        <label className="text-sm text-gray-600">USDT Mint Address:</label>
        <input
          type="text"
          value={usdtMint}
          onChange={(e) => setUsdtMint(e.target.value)}
          className="w-full p-2 border rounded mt-1"
          placeholder="Enter USDT mint address"
        />
      </div>
      <LoadingButton
        onClick={handleVaultInitialize}
        className="w-full"
        loading={isInitializing}
      >
        Initialize Presale Vault
      </LoadingButton>
    </div>
  );
};
