"use client";

import React from "react";
import { usePresale } from "../data-access/presale";
import { usePresaleProgramAccount } from "../data-access/presale-data-access";
import { AdminStageCard } from "./AdminStageCard"; // Make sure this path is correct

export const AdminStageCards: React.FC = () => {
  const { presalePDA } = usePresale();
  const { presaleAccountQuery } = usePresaleProgramAccount({
    account: presalePDA!,
  });

  // Number of stages in the presale
  const stageCount = presaleAccountQuery.data?.stages.length || 4;

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 w-full">
      {Array.from({ length: stageCount }, (_, index) => (
        <AdminStageCard key={index} stageIndex={index} />
      ))}
    </div>
  );
};
