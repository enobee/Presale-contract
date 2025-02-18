"use client";

import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";

import { PublicKey } from "@solana/web3.js";

export const VaultInitialization = ({
  onVaultInitialized,
  presalePDA,
  initializePresaleVault,
}: {
  onVaultInitialized: () => void;
  presalePDA: PublicKey;
  initializePresaleVault: any;
}) => {
  const [usdtMint, setUsdtMint] = useState("");

  const handleVaultInitialize = async () => {
    if (!usdtMint) {
      toast.error("Please enter a USDT mint address.");
      return;
    }
    localStorage.setItem("vaultInitialized", "true");

    try {
      await initializePresaleVault.mutate({ usdtMint });
      toast.success("Vault Initialized Successfully!");
      onVaultInitialized();
    } catch (error) {
      console.error("Vault initialization error:", error);
      toast.error(
        `Failed to initialize vault: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
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
      <button
        onClick={handleVaultInitialize}
        className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600"
      >
        Initialize Vault
      </button>
    </div>
  );
};
