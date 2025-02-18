"use client";

import React, { useState, useEffect } from "react";
import { WalletConnectionProvider } from "../../components/data-access/solana/wallet";
import { AdminStageCard } from "../../components/ui/AdminStageCard";
import { WithdrawForm } from "../../components/ui/WithdrawForm";
import { Header } from "../../components/ui/Header";
import { toast } from "react-toastify";
import { Stage } from "@/types";
import {
  usePresaleProgram,
  usePresaleProgramAccount,
} from "../../components/data-access/presale-data-access";
import { BN } from "@coral-xyz/anchor";
import { useWallet } from "@solana/wallet-adapter-react";
import { TransferToVault } from "../../components/ui/TransferToVault";
import WithdrawTokensForm from "@/components/ui/WithdrawTokensForm";
import { PublicKey } from "@solana/web3.js";
import { VaultInitialization } from "@/components/ui/VaultInitialization";
import { usePresale } from "@/components/data-access/presale";

export default function AdminPage() {
  const [presaleStart, setPresaleStart] = useState("");
  const [presaleEnd, setPresaleEnd] = useState("");
  const [stages, setStages] = useState<
    Array<{ id: number; startTime: string; endTime: string; price: string }>
  >([]);
  const [presaleInitialized, setPresaleInitialized] = useState<boolean>(() => {
    return localStorage.getItem("presaleInitialized") === "true";
  });

  const [vaultInitialized, setVaultInitialized] = useState<boolean>(() => {
    return localStorage.getItem("vaultInitialized") === "true";
  });

  const [tokenMint, setTokenMint] = useState("");
  const [transferSuccess, setTransferSuccess] = useState(false);
  const { publicKey } = useWallet();
  const { program } = usePresaleProgram();
  const { presalePDA } = usePresale();
  // const [presalePDA, setPresalePDA] = useState<PublicKey | null>(null);

  // const deriveAddress = async () => {
  //   const [presaleAddr] = await PublicKey.findProgramAddress(
  //     [Buffer.from("presale")],
  //     program.programId
  //   );
  //   setPresalePDA(presaleAddr);
  // };

  // useEffect(() => {
  //   if (program) {
  //     deriveAddress();
  //   }
  // }, [program]);

  const {
    presaleAccountQuery,
    initializePresaleVault,
    withdrawProceedsMutation,
    withdrawRemainingTokenMutation,
  } = usePresaleProgramAccount({
    account: presalePDA!,
  });
  const { initializePresale } = usePresaleProgram();

  const presaleData = presaleAccountQuery.data;

  console.log({ presaleData: presaleData });

  const handleAddStage = () => {
    if (stages.length >= 4) {
      toast.error("You can only add up to 4 stages.");
      return;
    }
    setStages([
      ...stages,
      { id: stages.length + 1, startTime: "", endTime: "", price: "" },
    ]);
  };

  const handleStageChange = (index: number, field: string, value: string) => {
    const updatedStages = [...stages];
    updatedStages[index] = { ...updatedStages[index], [field]: value };
    setStages(updatedStages);
  };

  const convertToUnix = (datetime: string | number | Date) =>
    Math.floor(new Date(datetime).getTime() / 1000);

  const handleInitializePresale = async () => {
    if (!tokenMint) {
      toast.error("Please enter a token mint address.");
      return;
    }

    if (stages.length === 0) {
      toast.error("Please add at least one stage.");
      return;
    }

    if (!presaleStart || !presaleEnd) {
      toast.error("Please set both presale start and end times.");
      return;
    }

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      if (!stage.startTime || !stage.endTime || !stage.price) {
        toast.error(`Stage ${i + 1} has incomplete data.`);
        return;
      }

      if (isNaN(Number(stage.price)) || Number(stage.price) <= 0) {
        toast.error(`Stage ${i + 1} has an invalid price.`);
        return;
      }
    }

    try {
      const formattedStages = stages.map((stage) => {
        const stageStartUnix = convertToUnix(stage.startTime);
        const stageEndUnix = convertToUnix(stage.endTime);

        if (isNaN(stageStartUnix) || isNaN(stageEndUnix)) {
          throw new Error("Invalid date format in stages");
        }

        return {
          startTime: new BN(stageStartUnix),
          endTime: new BN(stageEndUnix),
          price: new BN(Math.floor(Number(stage.price) * 1000000)),
        };
      });

      await initializePresale.mutateAsync({
        stages: formattedStages,
        startTime: new BN(convertToUnix(presaleStart)),
        endTime: new BN(convertToUnix(presaleEnd)),
        tokenMint,
      });

      toast.success("Presale Initialized Successfully!");
      setPresaleInitialized(true);
      localStorage.setItem("presaleInitialized", "true");
    } catch (error) {
      console.error("Initialization error:", error);
      toast.error(
        `Failed to initialize presale: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const stageNames = ["Private Sale", "Presale 1", "Presale 2", "Presale 3"];

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

  return (
    <WalletConnectionProvider>
      <div className="min-h-screen bg-gradient-to-b from-green-800 to-green-600">
        <Header />
        <div className="container mx-auto px-4 py-8">
          {!presaleInitialized ? (
            <div className="bg-white p-6 mb-6 rounded-lg shadow">
              <div className="mb-4">
                <label className="text-sm text-gray-600">
                  Token Mint Address:
                </label>
                <input
                  type="text"
                  value={tokenMint}
                  onChange={(e) => setTokenMint(e.target.value)}
                  className="w-full p-2 border rounded mt-1"
                  placeholder="Enter token mint address"
                />
              </div>

              <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-md text-gray-900">
                  <h2 className="text-2xl font-semibold mb-4">
                    Presale Time Settings
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium">
                        Presale Start Time
                      </label>
                      <input
                        type="datetime-local"
                        value={presaleStart}
                        onChange={(e) => setPresaleStart(e.target.value)}
                        className="mt-1 w-full p-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">
                        Presale End Time
                      </label>
                      <input
                        type="datetime-local"
                        value={presaleEnd}
                        onChange={(e) => setPresaleEnd(e.target.value)}
                        className="mt-1 w-full p-2 border rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">Stages</h3>
                  {stages.map((stage, index) => (
                    <div key={index} className="mb-4 p-4 border rounded">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm text-gray-600">
                            Start Time
                          </label>
                          <input
                            type="datetime-local"
                            value={stage.startTime}
                            onChange={(e) =>
                              handleStageChange(
                                index,
                                "startTime",
                                e.target.value
                              )
                            }
                            className="w-full p-2 border rounded mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-gray-600">
                            End Time
                          </label>
                          <input
                            type="datetime-local"
                            value={stage.endTime}
                            onChange={(e) =>
                              handleStageChange(
                                index,
                                "endTime",
                                e.target.value
                              )
                            }
                            className="w-full p-2 border rounded mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-gray-600">
                            Price (USD)
                          </label>
                          <input
                            type="number"
                            value={stage.price}
                            onChange={(e) =>
                              handleStageChange(index, "price", e.target.value)
                            }
                            className="w-full p-2 border rounded mt-1"
                            placeholder="Enter price"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {stages.length < 4 && (
                    <button
                      className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600 flex items-center justify-center"
                      onClick={handleAddStage}
                    >
                      Add Stage ({stages.length}/4)
                    </button>
                  )}

                  {stages.length == 4 && (
                    <button
                      onClick={handleInitializePresale}
                      className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600 flex items-center justify-center"
                    >
                      Initialize Presale
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {!vaultInitialized ? (
                <VaultInitialization
                  onVaultInitialized={() => {
                    setVaultInitialized(true);
                  }}
                  presalePDA={presalePDA!}
                  initializePresaleVault={initializePresaleVault}
                />
              ) : !transferSuccess ? (
                <TransferToVault
                  presalePDA={presalePDA!}
                  tokenMint={presaleData?.tokenMint!}
                  onSuccess={() => setTransferSuccess(true)}
                />
              ) : (
                <>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {presaleData?.stages.map((stage: Stage, index: number) => (
                      <AdminStageCard
                        key={index}
                        stage={stage}
                        index={index}
                        name={stageNames[index]}
                        startTime={stage.startTime.toNumber()}
                        endTime={stage.endTime.toNumber()}
                        price={stage.price.toNumber()}
                      />
                    ))}
                  </div>
                  <WithdrawForm withdrawProceeds={withdrawProceedsMutation} />
                  <WithdrawTokensForm
                    withdrawTokens={withdrawRemainingTokenMutation}
                    presaleData={presaleAccountQuery}
                  />
                </>
              )}
            </>
          )}
        </div>
      </div>
    </WalletConnectionProvider>
  );
}
