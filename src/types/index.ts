import { BN } from "@coral-xyz/anchor";
import { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { PublicKey } from "@solana/web3.js";

export interface Stage {
  startTime: BN;
  endTime: BN;
  price: BN;
}

export interface PresaleAccount {
  stages: Stage[];
  startTime: BN;
  endTime: BN;
  tokenMint: PublicKey;
  owner: PublicKey;
  tokenVaultBalance: BN;
  claimAvailableTime: BN;
  withdrawAvailableTime: BN;
  // solVaultBalance: BN;
  // usdtVaultBalance: BN;
  totalTokenSold: BN;
  totalUsdtRaised: BN;
  totalSolRaised: BN;
}

export interface vaultAccount {
  solVault: PublicKey;
  usdtVault: PublicKey;
  usdtMint: PublicKey;
  usdtBump: number;
  solBump: number;
  bump: number;
}

export interface userAccount {
  amountPurchased: BN;
  purchasedTimestamp: BN;
  hasClaimed: boolean;
}

export interface PresaleContextType {
  presalePDA: PublicKey | null;
  vaultPDA: PublicKey | null;
  userPDA: PublicKey | null;
  // presaleAccountQuery: UseQueryResult<PresaleAccount>;
  // vaultAccountQuery: UseQueryResult<vaultAccount>;
  // userAccountQuery: UseQueryResult<userAccount>;
  // buyTokenMutation: UseMutationResult<string, Error, BuyTokenProps, unknown>;
  // claimTokenMutation: UseMutationResult<
  //   string,
  //   Error,
  //   claimTokenProps,
  //   unknown
  // >;
  // withdrawProceedsMutation: UseMutationResult<
  //   string,
  //   Error,
  //   withdrawProceedsProps,
  //   unknown
  // >;
  // depositTokensMutation: UseMutationResult<
  //   string,
  //   Error,
  //   DepositTokensProps,
  //   unknown
  // >;
  // withdrawRemainingTokenMutation: UseMutationResult<
  //   string,
  //   Error,
  //   WithdrawRemainingTokensProps,
  //   unknown
  // >;
  // initializePresaleVault: UseMutationResult<
  //   string,
  //   Error,
  //   InitializePresaleVaultsProps,
  //   unknown
  // >;
}

export interface AdminStageCardProps {
  stageIndex?: number;
}

export interface WithdrawRemainingTokensProps {
  tokenMintKey: PublicKey;
  ownerTokenAccount: PublicKey;
}

export interface CountdownTimerProps {}

export interface StageProgressBarProps {
  stageNames: String[];
}

export interface InitializePresaleProps {
  stages: {
    // Define stages as an array of objects with the required properties
    startTime: BN;
    endTime: BN;
    price: BN;
  }[];
  startTime: BN;
  endTime: BN;
  tokenMint: String;
}

export interface InitializePresaleVaultsProps {
  usdtMint: String;
}

export interface DepositTokensProps {
  amount: number;
  tokenMintKey: PublicKey;
  ownerTokenAccount: PublicKey;
}

export interface BuyTokenProps {
  paymentMethod: "USDT" | "SOL"; // Allowed payment methods
  amount: number; // Token amount
  usdtMint: PublicKey;
  buyerUsdtAccount: PublicKey;
  tokenMint: PublicKey;
}

export interface claimTokenProps {
  tokenMintKey: PublicKey;
  buyerTokenAccount: PublicKey;
}

export interface withdrawProceedsProps {
  paymentMethod: "USDT" | "SOL"; // Allowed payment methods
  usdtMint: PublicKey;
  ownerUsdtAccount: PublicKey;
}

export interface LoadingButtonProps {
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}
