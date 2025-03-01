"use client";

import React from "react";
import { getPresaleProgram, getPresaleProgramId } from "@project/anchor";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
import { useMemo } from "react";
import { useCluster, useAnchorProvider } from "./solana/wallet";
import {
  InitializePresaleProps,
  Stage,
  InitializePresaleVaultsProps,
  DepositTokensProps,
  BuyTokenProps,
  withdrawProceedsProps,
  WithdrawRemainingTokensProps,
  claimTokenProps,
} from "@/types";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getMint,
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
    queryKey: ["presale_vault", { network }],
    queryFn: () => program.account.presaleVaults.all(),
  });

  const userAccounts = useQuery({
    queryKey: ["user_info", { network }],
    queryFn: () => program.account.presaleVaults.all(),
  });

  const getProgramAccount = useQuery({
    queryKey: ["get-program-account", { network }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  });

  const wallet = useWallet();

  const getTokenProgram = async (
    mintAddress: PublicKey
  ): Promise<PublicKey> => {
    const accountInfo = await connection.getAccountInfo(mintAddress);
    if (!accountInfo) throw new Error("Mint account not found");

    if (accountInfo.owner.equals(TOKEN_PROGRAM_ID)) {
      return TOKEN_PROGRAM_ID;
    } else if (accountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) {
      return TOKEN_2022_PROGRAM_ID;
    } else {
      throw new Error("Invalid mint account owner");
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
    onError: () => toast.error("Failed to initialize Presale account"),
  });

  return {
    program,
    programId,
    presaleAccounts,
    getProgramAccount,
    initializePresale,
    vaultAccounts,
    userAccounts,
    getTokenProgram,
  };
}

export function usePresaleProgramAccount({ account }: { account: PublicKey }) {
  const { network } = useCluster();
  const { connection } = useAnchorProvider();
  const {
    program,
    presaleAccounts,
    vaultAccounts,
    userAccounts,
    getTokenProgram,
  } = usePresaleProgram();

  const presaleAccountQuery = useQuery({
    queryKey: ["presale", "fetch", { network, account: presaleAccounts }],
    queryFn: () => program.account.presale.fetch(account),
    enabled: !!account && !!program, // Only run query when we have both account and program
  });

  const vaultAccountQuery = useQuery({
    queryKey: ["presale_vault", "fetch", { network, account: vaultAccounts }],
    queryFn: () => program.account.presaleVaults.fetch(account),
    enabled: !!account && !!program,
  });

  const userAccountQuery = useQuery({
    queryKey: ["user_info", "fetch", { network, account: userAccounts }],
    queryFn: () => program.account.userInfo.fetch(account),
    enabled: !!account && !!program,
  });

  const initializePresaleVault = useMutation<
    string,
    Error,
    InitializePresaleVaultsProps
  >({
    mutationKey: ["presale_vault", "initialize", { network }],
    mutationFn: async ({ usdtMint }) => {
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
          tokenProgram: tokenProgramId!,
        })
        .rpc();
    },
    onSuccess: (signature) => {
      toast.success("Presale Vaults initialized successfully!");
      return vaultAccounts.refetch();
    },
    onError: (error) => {
      toast.error("Failed to initialize Presale Vaults");
      console.error(error);
    },
  });

  // Chainlink program ID and feed address for SOL/USD on devnet
  const CHAINLINK_PROGRAM_ID = new PublicKey(
    "HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny"
  ); // Chainlink program ID on devnet
  const SOL_USD_FEED_ADDRESS = new PublicKey(
    "99B2bTijsU6f1GCT73HmdR7HCFFjGMBcPZY6jZ96ynrR"
  ); // SOL/USD feed address on devnet
  const PaymentMethod = {
    USDT: { usdt: {} },
    SOL: { sol: {} },
  };

  const wallet = useWallet();

  const depositTokensMutation = useMutation<string, Error, DepositTokensProps>({
    mutationKey: ["presale", "deposit_presale_tokens", { network, account }],
    mutationFn: async ({ amount, tokenMintKey, ownerTokenAccount }) => {
      if (!wallet.publicKey) {
        throw new Error("Wallet not connected");
      }

      const mintInfo = await connection.getAccountInfo(tokenMintKey);
      if (!mintInfo) {
        throw new Error("Token mint account not found");
      }
      const decimals = mintInfo.data[44];
      // Use the actual decimals from the mint
      const multiplier = new BN(10).pow(new BN(decimals));
      const tokenProgramId = await getTokenProgram(tokenMintKey);
      return program.methods
        .depositPresaleTokens(new BN(amount).mul(multiplier))
        .accounts({
          owner: wallet.publicKey,
          tokenMint: tokenMintKey,
          ownerTokenAccount,
          tokenProgram: tokenProgramId,
        } as any)
        .signers([])
        .rpc();
    },
    onSuccess: (tx) => {
      toast.success("Tokens Deposited successfully");
      return presaleAccounts.refetch();
    },
    onError: () => toast.error("Failed to Deposit Tokens"),
  });

  const buyTokenMutation = useMutation<string, Error, BuyTokenProps>({
    mutationKey: ["presale", "buy_tokens", { network, account }],
    mutationFn: async ({
      paymentMethod,
      amount,
      usdtMint,
      tokenMint,
      buyerUsdtAccount,
    }) => {
      if (!wallet.publicKey) {
        throw new Error("Wallet not connected");
      }

      const tokenProgramId = await getTokenProgram(usdtMint);
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
          usdtMint: usdtMint,
          tokenMint: tokenMint,
          buyer: wallet.publicKey,
          buyerAta: buyerUsdtAccount,
          chainlinkFeed: SOL_USD_FEED_ADDRESS,
          chainlinkProgram: CHAINLINK_PROGRAM_ID,
          tokenProgram: tokenProgramId,
        } as any)
        .signers([])
        .rpc();
    },
    onSuccess: (tx) => {
      toast.success(tx);
      toast.success("Successful Purchase of presale tokens");
      return [presaleAccounts.refetch()];
    },
    onError: (error) => {
      toast.error("Failed to purchase presale tokens");
      console.log(error);
    },
  });

  const claimTokenMutation = useMutation<string, Error, claimTokenProps>({
    mutationKey: ["presale", "claim_tokens", { network, account }],
    mutationFn: async ({ tokenMintKey, buyerTokenAccount }) => {
      if (!wallet.publicKey) {
        throw new Error("Wallet not connected");
      }
      const tokenProgramId = await getTokenProgram(tokenMintKey);
      return program.methods
        .claimTokens()
        .accounts({
          tokenMint: tokenMintKey,
          buyer: wallet.publicKey,
          buyerTokenAccount,
          tokenProgram: tokenProgramId,
        } as any)

        .signers([])
        .rpc();
    },
    onSuccess: (tx) => {
      toast.error("Tokens claimed successfully");
      return [presaleAccounts.refetch()];
    },
    onError: (error) => {
      toast.error("Failed to claim tokens");
      console.log(error);
    },
  });

  const withdrawProceedsMutation = useMutation<
    string,
    Error,
    withdrawProceedsProps
  >({
    mutationKey: ["presale", "withdraw_proceeds", { network, account }],
    mutationFn: async ({ paymentMethod, usdtMint, ownerUsdtAccount }) => {
      if (!wallet.publicKey) {
        throw new Error("Wallet not connected");
      }
      const tokenProgramId = await getTokenProgram(usdtMint);
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
          usdtMint: usdtMint,
          ownerUsdtToken: ownerUsdtAccount,
          tokenProgram: tokenProgramId,
        } as any)
        .signers([])
        .rpc();
    },
    onSuccess: (tx) => {
      toast.success(tx);
      toast.success("Successful withdrawal of presale proceeds");
      return [presaleAccounts.refetch()];
    },
    onError: (error) => {
      toast.error("Failed to withdraw presale proceeds");
      console.log(error);
    },
  });

  const withdrawRemainingTokenMutation = useMutation<
    string,
    Error,
    WithdrawRemainingTokensProps
  >({
    mutationKey: ["presale", "withdraw_tokens", { network, account }],
    mutationFn: async ({ tokenMintKey, ownerTokenAccount }) => {
      if (!wallet.publicKey) {
        throw new Error("Wallet not connected");
      }
      const tokenProgramId = await getTokenProgram(tokenMintKey);
      return program.methods
        .withdrawTokens()
        .accounts({
          owner: wallet.publicKey,
          tokenMint: tokenMintKey,
          ownerTokenAccount,
          tokenProgram: tokenProgramId,
        } as any)
        .signers([])
        .rpc();
    },
    onSuccess: (tx) => {
      toast.success(tx);
      toast.success("Remaining Tokens from Vault Withdrawn Successfully");
      return presaleAccounts.refetch();
    },
    onError: (error) => {
      toast.error("Failed to withdraw Remaining tokens from the vault");
      console.log(error);
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
