"use client";

import { useState, useEffect } from "react";
import * as anchor from "@project-serum/anchor";
import { OCR2Feed } from "@chainlink/solana-sdk";
import {
  useAnchorProvider,
  getProviderReadonly,
} from "@/components/data-access/solana/wallet";

const CHAINLINK_FEED_ADDRESS = "99B2bTijsU6f1GCT73HmdR7HCFFjGMBcPZY6jZ96ynrR"; // SOL-USD Devnet
const CHAINLINK_PROGRAM_ID = new anchor.web3.PublicKey(
  "cjg3oHmg9uuPsP8D6g29NWvhySJkdYdAo9D25PRbKXJ"
);

export function useSolPrice() {
  const [price, setPrice] = useState<number | null>(null);
  // const provider = useAnchorProvider();
  const provider = getProviderReadonly();

  useEffect(() => {
    let listener: null | number = null;
    async function fetchPrice() {
      try {
        anchor.setProvider(provider);
        const feedAddress = new anchor.web3.PublicKey(CHAINLINK_FEED_ADDRESS);
        const dataFeed = await OCR2Feed.load(CHAINLINK_PROGRAM_ID, provider);

        // Listen for price updates
        listener = dataFeed.onRound(feedAddress, (event) => {
          setPrice(event.answer.toNumber() / 1e8); // Convert from BN
        });
      } catch (error) {
        console.error("Error fetching SOL price:", error);
      }
    }

    fetchPrice();
  }, []);

  console.log({ price: price });
  return { price };
}
