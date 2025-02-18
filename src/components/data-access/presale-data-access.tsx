"use client";

import React, { useState, useEffect } from "react";
import { getPresaleProgram, getPresaleProgramId } from "@project/anchor";
import { useConnection } from "@solana/wallet-adapter-react";
import { Account, PublicKey } from "@solana/web3.js";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
import { useMemo } from "react";
// import toast from "react-hot-toast";
import { useCluster, useAnchorProvider } from "./solana/wallet";
import {
  InitializePresaleProps,
  Stage,
  InitializePresaleVaultsProps,
  DepositTokensProps,
  BuyTokenProps,
  withdrawProceedsProps,
} from "@/types";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";
import { toast } from "react-toastify";

export function usePresaleProgram() {
  const { connection } = useConnection();
  const provider = useAnchorProvider();
  const { network } = useCluster();
  const programId = useMemo(() => getPresaleProgramId(network), [network]);

  const program = useMemo(
    () => getPresaleProgram(provider!, programId),
    [provider, programId]
  );

  const presaleAccounts = useQuery({
    queryKey: ["presale", "all", { network }],
    queryFn: () => program.account.presale.all(),
  });

  const vaultAccounts = useQuery({
    queryKey: ["presale", "all", { network }],
    queryFn: () => program.account.presaleVaults.all(),
  });

  const userInfoAccounts = useQuery({
    queryKey: ["presale", "all", { network }],
    queryFn: () => program.account.userInfo.all(),
  });

  const getProgramAccount = useQuery({
    queryKey: ["get-program-account", { network }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  });

  const wallet = useWallet();

  // Helper function to determine token program
  const getTokenProgram = async (
    mintAddress: PublicKey
  ): Promise<PublicKey> => {
    try {
      const accountInfo = await connection.getAccountInfo(mintAddress);
      if (!accountInfo) throw new Error("Mint account not found");

      if (accountInfo.owner.equals(TOKEN_PROGRAM_ID)) {
        return TOKEN_PROGRAM_ID;
      } else if (accountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) {
        return TOKEN_2022_PROGRAM_ID;
      }
      throw new Error("Invalid mint account owner");
    } catch (error) {
      console.error("Error determining token program:", error);
      throw error;
    }
  };

  const initializePresale = useMutation<
    string,
    Error,
    InitializePresaleProps,
    Stage
  >({
    mutationKey: ["presale", "initialize", { network }],
    mutationFn: async ({ stages, startTime, endTime, tokenMint }) => {
      if (!wallet.publicKey) {
        throw new Error("Wallet not connected");
      }

      const mintPubkey = new PublicKey(tokenMint);
      const tokenProgramId = await getTokenProgram(mintPubkey);

      return program.methods
        .initializePresale(
          stages.map((stage) => ({
            price: new BN(stage.price),
            startTime: new BN(stage.startTime),
            endTime: new BN(stage.endTime),
          })),
          new BN(startTime),
          new BN(endTime)
        )
        .accounts({
          owner: wallet.publicKey,
          tokenMint: mintPubkey,
          tokenProgram: tokenProgramId,
        })
        .rpc();
    },
    onSuccess: (signature) => {
      toast.success("Presale initialized successfully!");
      return presaleAccounts.refetch();
    },
    onError: () => toast.error("Failed to initialize account"),
  });

  return {
    program,
    programId,
    presaleAccounts,
    vaultAccounts,
    userInfoAccounts,
    getProgramAccount,
    initializePresale,
    getTokenProgram,
  };
}

export function usePresaleProgramAccount({ account }: { account: PublicKey }) {
  const { network } = useCluster();
  const {
    program,
    presaleAccounts,
    vaultAccounts,
    userInfoAccounts,
    getTokenProgram,
  } = usePresaleProgram();

  const { connection } = useConnection();
  const provider = useAnchorProvider();

  const presaleAccountQuery = useQuery({
    queryKey: ["presale", "fetch", { network, account: account }],
    queryFn: () => program.account.presale.fetch(account),
    enabled: !!account && !!program, // Only run query when we have both account and program
  });

  const vaultAccountQuery = useQuery({
    queryKey: ["presale-vaults", "fetch", { network, account }],
    queryFn: () => program.account.presaleVaults.fetch(account),
  });

  const userAccountQuery = useQuery({
    queryKey: ["user-info", "fetch", { network, account }],
    queryFn: () => program.account.userInfo.fetch(account),
  });

  const initializePresaleVault = useMutation<
    string,
    Error,
    InitializePresaleVaultsProps
  >({
    mutationKey: ["presale", "initialize", { network }],
    mutationFn: async (usdtMint) => {
      if (!wallet.publicKey) {
        throw new Error("Wallet not connected");
      }

      const mintPubkey = new PublicKey(usdtMint);
      const tokenProgramId = await getTokenProgram(mintPubkey);
      return program.methods
        .initializeVaults()
        .accounts({
          owner: wallet.publicKey,
          usdtMint: mintPubkey,
          tokenProgram: tokenProgramId,
        })
        .rpc();
    },
    onSuccess: (signature) => {
      toast.success("Presale Vaults initialized successfully!");
      return vaultAccounts.refetch();
    },
    onError: () => toast.error("Failed to initialize Presale Vaults"),
  });

  const fetchTokenMint = async () => {
    const presaleAccount = await presaleAccountQuery.refetch();
    if (!presaleAccount.data?.tokenMint) {
      throw new Error("Token mint not found");
    }
    return new PublicKey(presaleAccount.data.tokenMint);
  };

  const fetchUsdtMint = async () => {
    const vaultAccount = await vaultAccountQuery.refetch();
    if (!vaultAccount.data?.usdtMint) {
      throw new Error("USDT mint not found");
    }
    return new PublicKey(vaultAccount.data.usdtMint);
  };

  // Chainlink program ID and feed address for SOL/USD on devnet
  const CHAINLINK_PROGRAM_ID = new PublicKey(
    "HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny"
  ); // Chainlink program ID on devnet
  const SOL_USD_FEED_ADDRESS = new PublicKey(
    "HgTtcbcmp5BeThax5AU8vg4VwK79qAvAKKFMs8txMLW6"
  ); // SOL/USD feed address on devnet
  const PaymentMethod = {
    USDT: { usdt: {} },
    SOL: { sol: {} },
  };

  const wallet = useWallet();

  const depositTokensMutation = useMutation<string, Error, DepositTokensProps>({
    mutationKey: ["presale", "deposit_presale_tokens", { network, account }],
    mutationFn: async ({ amount, tokenMintKey }) => {
      if (!wallet.publicKey) {
        throw new Error("Wallet not connected");
      }
      const tokenProgramId = await getTokenProgram(tokenMintKey);
      // await findAssociatedTokenAddress(wallet.publicKey, tokenMintKey);
      return program.methods
        .depositPresaleTokens(new BN(amount).mul(new BN(10).pow(new BN(9))))
        .accounts({
          owner: wallet.publicKey,
          tokenMint: tokenMintKey,
          tokenProgram: tokenProgramId,
        })
        .signers([])
        .rpc();
    },
    onSuccess: (tx) => {
      // transactionToast(tx);
      return presaleAccounts.refetch();
    },
  });

  const buyTokenMutation = useMutation<string, Error, BuyTokenProps>({
    mutationKey: ["presale", "buy_tokens", { network, account }],
    mutationFn: async ({ paymentMethod, amount }) => {
      if (!wallet.publicKey) {
        throw new Error("Wallet not connected");
      }
      const getUsdtMint = await fetchUsdtMint();
      const tokenProgramId = await getTokenProgram(getUsdtMint);
      let method;
      if (paymentMethod === "USDT") {
        method = PaymentMethod.USDT;
      } else if (paymentMethod === "SOL") {
        method = PaymentMethod.SOL;
      } else {
        throw new Error("Invalid payment method");
      }
      return program.methods
        .buyTokens(method, new BN(amount))
        .accounts({
          usdtMint: getUsdtMint,
          buyer: wallet.publicKey,
          chainlinkFeed: SOL_USD_FEED_ADDRESS,
          chainlinkProgram: CHAINLINK_PROGRAM_ID,
          tokenProgram: tokenProgramId,
        })
        .signers([])
        .rpc();
    },
    onSuccess: (tx) => {
      // transactionToast(tx);
      return [
        presaleAccounts.refetch(),
        vaultAccounts.refetch(),
        userInfoAccounts.refetch(),
      ];
    },
  });

  const claimTokenMutation = useMutation({
    mutationKey: ["presale", "claim_tokens", { network, account }],
    mutationFn: async () => {
      if (!wallet.publicKey) {
        throw new Error("Wallet not connected");
      }
      const getTokenMint = await fetchTokenMint();
      const tokenProgramId = await getTokenProgram(getTokenMint);
      return program.methods
        .claimTokens()
        .accounts({
          tokenMint: getTokenMint,
          buyer: wallet.publicKey,
          tokenProgram: tokenProgramId,
        })
        .signers([])
        .rpc();
    },
    onSuccess: (tx) => {
      // transactionToast(tx);
      return [
        presaleAccounts.refetch(),
        vaultAccounts.refetch(),
        userInfoAccounts.refetch(),
      ];
    },
  });

  const withdrawProceedsMutation = useMutation<
    string,
    Error,
    withdrawProceedsProps
  >({
    mutationKey: ["presale", "withdraw_proceeds", { network, account }],
    mutationFn: async ({ paymentMethod }) => {
      if (!wallet.publicKey) {
        throw new Error("Wallet not connected");
      }
      const getUsdtMint = await fetchUsdtMint();
      const tokenProgramId = await getTokenProgram(getUsdtMint);
      let method;
      if (paymentMethod === "USDT") {
        method = PaymentMethod.USDT;
      } else if (paymentMethod === "SOL") {
        method = PaymentMethod.SOL;
      } else {
        throw new Error("Invalid payment method");
      }

      if (!method) {
        throw new Error("Invalid payment method");
      }
      return program.methods
        .withdrawProceeds(method)
        .accounts({
          owner: wallet.publicKey,
          usdtMint: getUsdtMint,
          tokenProgram: tokenProgramId,
        })
        .signers([])
        .rpc();
    },
    onSuccess: (tx) => {
      return [presaleAccounts.refetch(), vaultAccounts.refetch()];
    },
  });

  const withdrawRemainingTokenMutation = useMutation({
    mutationKey: ["presale", "withdraw_tokens", { network, account }],
    mutationFn: async () => {
      if (!wallet.publicKey) {
        throw new Error("Wallet not connected");
      }
      const getTokenMint = await fetchTokenMint();
      const tokenProgramId = await getTokenProgram(getTokenMint);
      return program.methods
        .withdrawTokens()
        .accounts({
          owner: wallet.publicKey,
          tokenMint: getTokenMint,
          tokenProgram: tokenProgramId,
        })
        .signers([])
        .rpc();
    },
    onSuccess: (tx) => {
      // transactionToast(tx);
      return presaleAccounts.refetch();
    },
  });

  return {
    presaleAccountQuery,
    vaultAccountQuery,
    userAccountQuery,
    initializePresaleVault,
    depositTokensMutation,
    buyTokenMutation,
    claimTokenMutation,
    withdrawProceedsMutation,
    withdrawRemainingTokenMutation,
  };
}
