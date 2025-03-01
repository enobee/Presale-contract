"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { LoadingButtonProps } from "@/types";

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  onClick,
  loading = false,
  disabled = false,
  className = "",
  children,
}) => {
  const baseClassName =
    "flex items-center justify-center rounded font-medium focus:outline-none transition-colors";
  const defaultClassName =
    "bg-green-500 text-white py-2 px-4 hover:bg-green-600 disabled:bg-green-300";

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClassName} ${defaultClassName} ${className}`}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Processing...
        </>
      ) : (
        children
      )}
    </button>
  );
};
