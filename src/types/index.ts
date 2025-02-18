import { BN } from "@coral-xyz/anchor";
import { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { PublicKey } from "@solana/web3.js";

export interface Stage {
  startTime: BN;
  endTime: BN;
  price: BN;
}

interface PresaleAccount {
  stages: Stage[];
  startTime: BN;
  endTime: BN;
  tokenMint: PublicKey;
  owner: PublicKey;
  tokenVaultBalance: BN;
  claimAvailableTime: BN;
}

interface userAccount {
  amountPurchased: BN;
  purchasedTimestamp: BN;
  hasClaimed: boolean;
}

export interface AdminStageCardProps {
  stage: Stage;
  index: number;
  name: string;
  startTime: number;
  endTime: number;
  price: number;
}

export interface WithdrawFormProps {
  withdrawProceeds: UseMutationResult<
    string,
    Error,
    withdrawProceedsProps,
    unknown
  >;
}

// Interface for the withdraw tokens form props
export interface WithdrawTokensProps {
  withdrawTokens: UseMutationResult<string, Error, void, unknown>;
  presaleData: UseQueryResult<PresaleAccount, Error>;
}

export interface CountdownTimerProps {
  endTime: number;
}

export interface StageProgressBarProps {
  stages: Stage[];
}
export interface PresaleStatsProps {
  totalSHTPSold: number;
  totalSolRaised: number;
  totalUsdtRaised: number;
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
}

export interface BuyTokenProps {
  paymentMethod: "USDT" | "SOL"; // Allowed payment methods
  amount: number; // Token amount
}

export interface claimTokenProps {}

export interface ClaimTokenFormProps {
  claimTokens: UseMutationResult<string, Error, void, unknown>;
  presaleData: UseQueryResult<PresaleAccount, Error>;
  userData: UseQueryResult<userAccount, Error>;
}

export interface withdrawProceedsProps {
  paymentMethod: "USDT" | "SOL"; // Allowed payment methods
}

export interface TransferToVaultProps {
  presalePDA: PublicKey;
  onSuccess: () => void; // Add the onSuccess prop type
  tokenMint: PublicKey;
}

export interface BuyFormProps {
  stages: Stage[];
  buyTokens: UseMutationResult<string, Error, BuyTokenProps, unknown>;
}

export interface PresaleProgramAccountParams {
  account: PublicKey;
  options?: {
    refetchInterval?: number;
    enabled?: boolean;
  };
}
