"use client";

import dynamic from "next/dynamic";
import React from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

const DynamicWalletButton = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then(
      (mod) => mod.WalletMultiButton
    ),
  { ssr: false }
);

export const Header: React.FC = () => {
  return (
    <header className="p-6 text-white flex justify-between items-center">
      <h1 className="text-3xl font-bold">SOLAR HASH</h1>
      <div>
        <DynamicWalletButton className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded" />
      </div>
    </header>
  );
};
