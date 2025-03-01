"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { PublicKey } from "@solana/web3.js";
import {
  usePresaleProgram,
  usePresaleProgramAccount,
} from "@/components/data-access/presale-data-access";
import { useWallet } from "@solana/wallet-adapter-react";
import { PresaleContextType } from "@/types";

const PresaleContext = createContext<PresaleContextType | undefined>(undefined);

export const PresaleProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { program } = usePresaleProgram();
  const [presalePDA, setPresalePDA] = useState<PublicKey | null>(null);
  const [vaultPDA, setVaultPDA] = useState<PublicKey | null>(null);
  const [userPDA, setUserPDA] = useState<PublicKey | null>(null);
  const { publicKey } = useWallet();

  useEffect(() => {
    const derivePresalePDA = async () => {
      if (!program || !publicKey) return;

      try {
        //  Derive presale PDA
        const [presaleAddr] = await PublicKey.findProgramAddress(
          [Buffer.from("presale")],
          program.programId
        );

        //  Check if presale is initialized
        const presaleAccount = await program.account.presale.fetchNullable(
          presaleAddr
        );
        if (!presaleAccount) return; // Presale not initialized, stop execution

        setPresalePDA(presaleAddr);

        const [vaultAddr] = await PublicKey.findProgramAddress(
          [Buffer.from("presale_vault"), presaleAddr.toBuffer()],
          program.programId
        );
        setVaultPDA(vaultAddr);

        //  Derive user PDA
        const [userAddr] = await PublicKey.findProgramAddress(
          [
            Buffer.from("user_info"),
            presaleAddr.toBuffer(),
            // publicKey.toBuffer(),
          ],
          program.programId
        );
        setUserPDA(userAddr);
      } catch (error) {
        console.error("Error deriving presale PDA:", error);
      }
    };

    derivePresalePDA();
  }, [program, publicKey]);

  //  Separate effect to derive vault PDA after presalePDA is set
  // useEffect(() => {
  //   const deriveVaultPDA = async () => {
  //     if (!program || !presalePDA || !publicKey) return;

  //     try {
  //       //  Derive vault PDA
  //       const [vaultAddr] = await PublicKey.findProgramAddress(
  //         [Buffer.from("presale_vault"), presalePDA.toBuffer()],
  //         program.programId
  //       );
  //       setVaultPDA(vaultAddr);

  //       //  Derive user PDA
  //       const [userAddr] = await PublicKey.findProgramAddress(
  //         [
  //           Buffer.from("user_info"),
  //           presalePDA.toBuffer(),
  //           // publicKey.toBuffer(),
  //         ],
  //         program.programId
  //       );
  //       setUserPDA(userAddr);
  //     } catch (error) {
  //       console.error("Error deriving vault/user PDA:", error);
  //     }
  //   };

  //   deriveVaultPDA();
  // }, [program, presalePDA, publicKey]);

  // const { vaultAccountQuery } = usePresaleProgramAccount({
  //   account: vaultPDA!,
  // });
  // console.log({ vaultAccountQuery: vaultAccountQuery.data });

  // const { userAccountQuery } = usePresaleProgramAccount({
  //   account: userPDA!,
  // });
  // console.log({ userAccountQuery: userAccountQuery.data });

  // const {
  //   presaleAccountQuery,
  //   buyTokenMutation,
  //   depositTokensMutation,
  //   initializePresaleVault,
  //   claimTokenMutation,
  //   withdrawProceedsMutation,
  //   withdrawRemainingTokenMutation,
  // } = usePresaleProgramAccount({ account: presalePDA! });

  // Create value object matching the imported PresaleContextType
  const value: PresaleContextType = {
    presalePDA,
    vaultPDA,
    userPDA,
    // presaleAccountQuery,
    // buyTokenMutation,
    // initializePresaleVault,
    // depositTokensMutation,
    // claimTokenMutation,
    // withdrawProceedsMutation,
    // withdrawRemainingTokenMutation,
    // vaultAccountQuery,
    // userAccountQuery,
  };

  return (
    <PresaleContext.Provider value={value}>{children}</PresaleContext.Provider>
  );
};

// Custom Hook for easy access
export const usePresale = () => {
  const context = useContext(PresaleContext);
  if (!context) {
    throw new Error("usePresale must be used within a PresaleProvider");
  }
  return context;
};
