"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { PublicKey } from "@solana/web3.js";
import { usePresaleProgram } from "@/components/data-access/presale-data-access";

interface PresaleContextType {
  presalePDA: PublicKey | null;
}

const PresaleContext = createContext<PresaleContextType | undefined>(undefined);

export const PresaleProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { program } = usePresaleProgram();
  const [presalePDA, setPresalePDA] = useState<PublicKey | null>(null);

  useEffect(() => {
    const derivePresalePDA = async () => {
      if (!program) return;

      try {
        const [presaleAddr] = await PublicKey.findProgramAddress(
          [Buffer.from("presale")],
          program.programId
        );
        setPresalePDA(presaleAddr);
      } catch (error) {
        console.error("Error deriving presale PDA:", error);
      }
    };

    derivePresalePDA();
  }, [program]);

  return (
    <PresaleContext.Provider value={{ presalePDA }}>
      {children}
    </PresaleContext.Provider>
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
