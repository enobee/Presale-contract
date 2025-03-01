"use client";

import { useState, useEffect, useRef } from "react";
import { usePresale } from "@/components/data-access/presale";
import { Header } from "@/components/ui/Header";
import { InitializationForm } from "@/components/ui/PresaleInitializationForm";
import { VaultInitialization } from "@/components/ui/VaultInitialization";
import { PresaleInterface } from "@/components/ui/PresaleInteface";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletConnectionProvider } from "@/components/data-access/solana/wallet";
import { usePresaleProgramAccount } from "@/components/data-access/presale-data-access";

export default function AdminPage() {
  const { publicKey } = useWallet();
  const { presalePDA, vaultPDA } = usePresale();
  const { presaleAccountQuery } = usePresaleProgramAccount({
    account: presalePDA!,
  });
  const { vaultAccountQuery } = usePresaleProgramAccount({
    account: vaultPDA!,
  });

  // State for tracking initialization status
  const [isLoading, setIsLoading] = useState(true);
  const [presaleInitialized, setPresaleInitialized] = useState(false);
  const [vaultInitialized, setVaultInitialized] = useState(false);

  // Avoid redundant refetches
  const checkedPresale = useRef(false);
  const checkedVault = useRef(false);

  // Check initialization status
  useEffect(() => {
    const checkStatus = async () => {
      if (!presalePDA || !vaultPDA) {
        setIsLoading(false);
        return;
      }

      try {
        // Check presale initialization (Only fetch if not already checked)
        if (!checkedPresale.current && presaleAccountQuery?.data) {
          const isPresaleInit = presaleAccountQuery.data.stages.length > 0;
          setPresaleInitialized(isPresaleInit);
          checkedPresale.current = true; // Prevent further redundant calls
          console.log({ presaleAccountQuery: presaleAccountQuery });
          console.log({ vaultAccountQuery: vaultAccountQuery.data });
        }

        // Check vault initialization (Only if presale is initialized)
        if (
          !checkedVault.current &&
          presaleInitialized &&
          vaultAccountQuery?.data
        ) {
          setVaultInitialized(!!vaultAccountQuery.data);
          checkedVault.current = true;
          console.log({ vaultInitialized: vaultInitialized });
        }
      } catch (error) {
        console.error("Error checking initialization status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
  }, [
    presalePDA,
    vaultPDA,
    presaleAccountQuery?.data,
    vaultAccountQuery?.data,
    presaleInitialized,
  ]);

  // Handlers for when initialization is completed
  const handlePresaleInitialized = () => {
    setPresaleInitialized(true);
  };

  const handleVaultInitialized = () => {
    setVaultInitialized(true);
  };

  // UI Handling
  if (!publicKey) {
    return (
      <WalletConnectionProvider>
        <div className="min-h-screen bg-gradient-to-b from-green-800 to-green-600">
          <Header />
          <div className="container mx-auto px-4 py-8">
            <div className="bg-white p-6 mb-6 rounded-lg shadow text-center">
              <h2 className="text-xl font-semibold mb-4">
                Wallet Not Connected
              </h2>
              <p className="text-gray-600 mb-4">
                Please connect your wallet to access the admin panel.
              </p>
            </div>
          </div>
        </div>
      </WalletConnectionProvider>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 bg-green-500">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-center">Loading...</h2>
        </div>
      </div>
    );
  }

  return (
    <WalletConnectionProvider>
      <div className="min-h-screen bg-gradient-to-b from-green-800 to-green-600 px-6">
        <Header />
        <div className="mt-4 container mx-auto px-4 py-8 lg:max-w-[1024px]">
          {!presaleInitialized ? (
            <InitializationForm onInitialized={handlePresaleInitialized} />
          ) : !vaultInitialized ? (
            <VaultInitialization onInitialized={handleVaultInitialized} />
          ) : (
            <PresaleInterface />
          )}
        </div>
      </div>
    </WalletConnectionProvider>
  );
}
