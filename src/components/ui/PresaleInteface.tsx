import { Stage } from "@/types";
import { AdminStageCards } from "./AdminStageCards";
import { TransferToVault } from "./TransferToVault";
import { WithdrawForm } from "./WithdrawForm";
import { WithdrawTokensForm } from "./WithdrawTokensForm";
import React from "react";

export const PresaleInterface: React.FC = () => {
  return (
    <>
      <div>
        <AdminStageCards />
      </div>

      <TransferToVault />

      <WithdrawForm />
      <WithdrawTokensForm />
    </>
  );
};
