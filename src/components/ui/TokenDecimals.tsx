// hooks/useTokenDecimals.ts
import { useState, useEffect } from "react";
import { PublicKey } from "@solana/web3.js";
import { toast } from "react-toastify";
import { useAnchorProvider } from "../data-access/solana/wallet";

interface TokenDecimalResult {
  decimalMultiplier: number;
}

/**
 * Hook to fetch decimal information for an spl token mint
 */
export function useTokenDecimal(mint: PublicKey | null): TokenDecimalResult {
  const { connection } = useAnchorProvider();
  const [decimalMultiplier, setDecimalMultiplier] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchDecimalInfo = async () => {
      // Reset states
      setIsLoading(true);
      setError(null);

      // Wait until mint address is available
      if (!mint) {
        console.log("Waiting for mint address...");
        return;
      }

      try {
        const mintAccountInfo = await connection.getAccountInfo(mint);
        if (!mintAccountInfo) {
          throw new Error("Mint account not found");
        }

        // Extract decimals from the account data (offset 44)
        const tokenDecimals = mintAccountInfo.data[44];
        const tokenMultiplier = 10 ** tokenDecimals;

        setDecimalMultiplier(tokenMultiplier);

        console.log({
          mint: mint.toString(),
          decimals: tokenDecimals,
          multiplier: tokenMultiplier,
        });

        setIsLoading(false);
      } catch (error) {
        console.error("Failed to fetch mint info:", error);
        setError(error instanceof Error ? error : new Error("Unknown error"));
        toast.error("Failed to load token information");
        setIsLoading(false);
      }
    };

    fetchDecimalInfo();
  }, [connection, mint]);

  return {
    decimalMultiplier,
  };
}

/**
 * Hook to fetch decimal information for both token and USDT mints
 */
// export function useTokenDecimals(
//   tokenMint: PublicKey | null,
//   usdtMint: PublicKey | null
// ) {
//   const token = useTokenDecimal(connection, tokenMint);
//   const usdt = useTokenDecimal(connection, usdtMint);

//   return {
//     token: {
//       decimals: token.decimals,
//       multiplier: token.multiplier,
//       isLoading: token.isLoading,
//       error: token.error
//     },
//     usdt: {
//       decimals: usdt.decimals,
//       multiplier: usdt.multiplier,
//       isLoading: usdt.isLoading,
//       error: usdt.error
//     },
//     isLoading: token.isLoading || usdt.isLoading,
//     hasError: token.error !== null || usdt.error !== null
//   };
// }
