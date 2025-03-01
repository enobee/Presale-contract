"use client";

import { useCallback } from "react";
import { useAnchorProvider } from "../data-access/solana/wallet";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey, Transaction } from "@solana/web3.js";
import { toast } from "react-toastify";

export const useAssociatedTokenAccount = (mintAddress?: PublicKey) => {
  const provider = useAnchorProvider();
  const { connection, wallet } = provider;

  const fetchATA = useCallback(async () => {
    if (!wallet.publicKey || !mintAddress) {
      return null;
    }

    try {
      // Get mint account info
      const mintAccountInfo = await connection.getAccountInfo(mintAddress);
      if (!mintAccountInfo) {
        throw new Error("Mint account not found");
      }

      // Determine token program
      const detectedTokenProgram = mintAccountInfo.owner.equals(
        TOKEN_2022_PROGRAM_ID
      )
        ? TOKEN_2022_PROGRAM_ID
        : TOKEN_PROGRAM_ID;

      // Get ATA
      const ata = await getAssociatedTokenAddress(
        mintAddress,
        wallet.publicKey,
        false,
        detectedTokenProgram
      );

      // Check if account exists
      const accountInfo = await connection.getAccountInfo(ata, "confirmed");
      if (accountInfo) {
        return ata;
      }

      // Create ATA if it doesn't exist
      const createAccountIx = createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        ata,
        wallet.publicKey,
        mintAddress,
        detectedTokenProgram,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const transaction = new Transaction().add(createAccountIx);
      const { blockhash } = await connection.getRecentBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = wallet.publicKey;

      const signedTransaction = await wallet.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(
        signedTransaction.serialize(),
        { skipPreflight: false, preflightCommitment: "confirmed" }
      );

      await connection.confirmTransaction(signature, "confirmed");
      return ata;
    } catch (error) {
      console.error("Error in fetchATA:", error);
      toast.error("Failed to process associated token account");
      return null;
    }
  }, [wallet.publicKey, mintAddress, connection]);

  return { fetchATA };
};
