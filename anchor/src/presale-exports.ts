// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { Cluster, PublicKey } from "@solana/web3.js";
import PresaleIDL from "../target/idl/presale.json";
import type { Presale } from "../target/types/presale";

// Re-export the generated IDL and type
export { Presale, PresaleIDL };

// The programId is imported from the program IDL.
export const PRESALE_PROGRAM_ID = new PublicKey(PresaleIDL.address);

// This is a helper function to get the Presale Anchor program.
export function getPresaleProgram(
  provider: AnchorProvider,
  address?: PublicKey
) {
  return new Program(
    {
      ...PresaleIDL,
      address: address ? address.toBase58() : PresaleIDL.address,
    } as Presale,
    provider
  );
}

// This is a helper function to get the program ID for the Presale program depending on the cluster.
export function getPresaleProgramId(cluster: Cluster) {
  switch (cluster) {
    case "devnet":
    case "testnet":
      // This is the program ID for the Presale program on devnet and testnet.
      return new PublicKey("BKCejCiguGFjBSZbwJozgiHKw8stSgvLzZkEZMT2tEmn");
    case "mainnet-beta":
    default:
      return PRESALE_PROGRAM_ID;
  }
}
