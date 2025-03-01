"use client";

import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "react-toastify";
import { useAssociatedTokenAccount } from "../data-access/AssociatedTokenAccount";
import { LoadingButton } from "./LoadingButton";
import { usePresale } from "../data-access/presale";
import { usePresaleProgramAccount } from "../data-access/presale-data-access";

export const TransferToVault: React.FC = () => {
  const [amount, setAmount] = useState<number | "">("");
  const [isTransferring, setIsTransferring] = useState<boolean>(false);

  const { vaultPDA, presalePDA } = usePresale();

  const { depositTokensMutation: deposit, presaleAccountQuery } =
    usePresaleProgramAccount({
      account: presalePDA!,
    });
  const tokenMint = presaleAccountQuery.data?.tokenMint!;

  const { fetchATA } = useAssociatedTokenAccount(tokenMint);

  const { publicKey } = useWallet();

  const handleTransfer = async () => {
    setIsTransferring(true);
    if (!publicKey!) {
      alert("Please connect your wallet.");
      return;
    }

    if (!deposit) {
      alert("Deposit function is not available.");
      return;
    }

    if (!amount || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    const tokenMintKey = tokenMint;

    try {
      // Ensure the ATA exists or create it
      const ata = await fetchATA();

      if (!ata) {
        toast.error("Failed to create or retrieve the token account.");
        setIsTransferring(false);
        return;
      }
      await deposit.mutateAsync({
        amount,
        tokenMintKey,
        ownerTokenAccount: ata,
      });
    } catch (error) {
      toast.error("Error depositing tokens.");
      console.error(error);
      setIsTransferring(false);
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div className="bg-white mt-4 rounded-lg border-2 border-green-600 mb-6">
      <div className="bg-green-800 px-6 py-4 rounded-t-lg">
        <h3 className="text-xl font-semibold text-white">
          Transfer Tokens to Presale Vault
        </h3>
      </div>

      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Amount to Transfer
          </label>

          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) =>
              setAmount(e.target.value ? Number(e.target.value) : "")
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
            placeholder="Enter amount of tokens"
          />
        </div>

        <LoadingButton
          onClick={handleTransfer}
          className="w-full"
          loading={isTransferring}
          disabled={!amount || amount <= 0}
        >
          Transfer to Vault
        </LoadingButton>
      </div>
    </div>
  );
};
