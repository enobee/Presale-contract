"use client";

import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { usePresaleProgramAccount } from "../data-access/presale-data-access";
import { TransferToVaultProps } from "@/types";
import { clusterApiUrl, Transaction, Keypair } from "@solana/web3.js";
import { toast } from "react-toastify";
import {
  createAssociatedTokenAccountInstruction,
  getAccount,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError,
} from "@solana/spl-token";
import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { useAnchorProvider } from "../data-access/solana/wallet";
import { Wallet } from "@coral-xyz/anchor";

export const TransferToVault: React.FC<TransferToVaultProps> = ({
  tokenMint,
  presalePDA,
}) => {
  const [amount, setAmount] = useState<number | "">("");

  const { depositTokensMutation: deposit } = usePresaleProgramAccount({
    account: presalePDA!,
  });
  const provider = useAnchorProvider();
  const { wallet } = useWallet();
  const handleTransfer = async () => {
    const { connection } = provider;

    const wallet = provider.wallet;
    if (!wallet.publicKey!) {
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

    //   const associatedToken = await getAssociatedTokenAddress(
    //     tokenMint,
    //     wallet.publicKey,
    //     false,
    //     TOKEN_2022_PROGRAM_ID,
    //     ASSOCIATED_TOKEN_PROGRAM_ID
    // );

    // let accountInfo:
    // try {
    //   accountInfo = await getAccount(connection, associatedToken, "confirmed", TOKEN_2022_PROGRAM_ID);
    // } catch (error) {
    //   if (error instanceof TokenAccountNotFoundError || error instanceof TokenInvalidAccountOwnerError) {

    //   try {

    // } catch (error: unknown) {

    //     try {
    //       const transaction = new Transaction().add(
    //           createAssociatedTokenAccountInstruction(
    //               wallet.publicKey,
    //               associatedToken,
    //               owner,
    //               tokenMint,
    //               TOKEN_2022_PROGRAM_ID,
    //               ASSOCIATED_TOKEN_PROGRAM_ID
    //           )
    //       );

    //       await sendTransaction(connection, transaction);
    //     } catch (error: unknown) {
    //     }
    //     accountInfo = await getAccount(connection, associatedToken, commitment, programId);
    //   } else {
    //     throw error;
    //   }
    // }
    // return account;
    const ownerTokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      wallet.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID // ✅ Explicitly set the correct Token Program ID
    );

    let accountInfo;
    try {
      accountInfo = await connection.getAccountInfo(
        ownerTokenAccount,
        "confirmed"
      );

      console.log({ AssociatedTokenAccount: accountInfo });
      console.log({ ownerTokenAccount: ownerTokenAccount.toBase58() });
    } catch (error) {
      console.error("Error checking account:", error);
      toast.error("Failed to check if token account exists");
      return;
    }

    if (!accountInfo) {
      console.log("Token account does not exist. Creating now...");

      const createAccountIx = createAssociatedTokenAccountInstruction(
        wallet.publicKey, //payer public key
        ownerTokenAccount, // associated token address
        wallet.publicKey, // owner public key
        tokenMint, // token mint address
        TOKEN_2022_PROGRAM_ID, // Token program ID
        ASSOCIATED_TOKEN_PROGRAM_ID // Associated token program ID
      );

      const transaction = new Transaction().add(createAccountIx);

      // Fetch recent blockhash before signing
      const { blockhash } = await connection.getRecentBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = wallet.publicKey;

      console.log("Sending create account transaction...");
      const signedTransaction = await wallet.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(
        signedTransaction.serialize(),
        {
          skipPreflight: false,
          preflightCommitment: "confirmed",
        }
      );

      console.log("Create Account Signature:", signature);
      await connection.confirmTransaction(signature, "confirmed");

      toast.success("Token account created successfully!");
    }

    const tokenMintKey = tokenMint;

    try {
      await deposit.mutateAsync({ amount, tokenMintKey });
    } catch (error) {
      toast.error("Error depositing tokens.");
      console.error(error);
    }
  };

  return (
    <div className="bg-white mt-4 rounded-lg border-2 border-green-600">
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
            value={amount}
            onChange={(e) =>
              setAmount(e.target.value ? Number(e.target.value) : "")
            }
            className="w-full px-4 py-2 border border-green-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Enter amount of tokens"
          />
        </div>

        <button
          onClick={handleTransfer}
          className="w-full py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          disabled={!amount || amount <= 0}
        >
          Transfer to Vault
        </button>
      </div>
    </div>
  );
};
