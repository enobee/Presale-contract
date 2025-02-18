"use client";

import dynamic from "next/dynamic";
import React, { createContext, useContext, ReactNode, useMemo } from "react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  useConnection,
  useWallet,
  AnchorWallet,
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { clusterApiUrl, PublicKey } from "@solana/web3.js";

// Import styles for the wallet modal
import "@solana/wallet-adapter-react-ui/styles.css";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";

interface WalletConnectionProviderProps {
  children: ReactNode;
}

export const WalletButton = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  {
    ssr: false,
  }
);

const ClusterContext = createContext<{ network: WalletAdapterNetwork }>({
  network: WalletAdapterNetwork.Devnet,
});

export function useCluster() {
  return useContext(ClusterContext);
}

export function WalletConnectionProvider({
  children,
}: WalletConnectionProviderProps) {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter({ network })],
    [network]
  );

  return (
    <ClusterContext.Provider value={{ network }}>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>{children}</WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </ClusterContext.Provider>
  );
}

// export function useAnchorProvider() {
//   const { connection } = useConnection();
//   const wallet = useWallet();
//   return new AnchorProvider(connection, wallet as AnchorWallet, {
//     commitment: "confirmed",
//   });
// }

export function useAnchorProvider() {
  const { connection } = useConnection();
  const wallet = useWallet();

  // UseMemo to avoid unnecessary provider recreation on each render
  return useMemo(() => {
    const provider = new AnchorProvider(connection, wallet as AnchorWallet, {
      commitment: "confirmed",
    });
    return provider;
  }, [connection, wallet]);
}

export const getProviderReadonly = () => {
  const { connection } = useConnection();

  const wallet = {
    publicKey: PublicKey.default,
    signTransaction: async () => {
      throw new Error("Read-only provider cannot sign transactions.");
    },
    signAllTransaction: async () => {
      throw new Error("Read-only provider cannot sign transactions.");
    },
  };

  return useMemo(() => {
    const provider = new AnchorProvider(
      connection,
      wallet as unknown as Wallet,
      {
        commitment: "confirmed",
      }
    );
    return provider;
  }, [connection, wallet]);
};
