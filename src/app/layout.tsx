"use client";

import React from "react";
import { WalletConnectionProvider } from "../components/data-access/solana/wallet";
import { ReactQueryProvider } from "./react-query-provider";
import { PresaleProvider } from "@/components/data-access/presale"; // Import your PresaleContext
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ReactQueryProvider>
          <WalletConnectionProvider>
            <PresaleProvider>
              {" "}
              {/* Wrap everything with PresaleProvider */}
              {children}
              <ToastContainer position="top-right" autoClose={3000} />
            </PresaleProvider>
          </WalletConnectionProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
