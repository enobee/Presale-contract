"use client";

import React from "react";
import { AdminStageCardProps } from "@/types";

export const AdminStageCard: React.FC<AdminStageCardProps> = ({
  name,
  startTime,
  endTime,
  price,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 hover:shadow-xl transition-shadow">
      <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-3">
        {name}
      </h2>
      <div className="space-y-2 text-sm md:text-base">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Start:</span>
          <span className="text-gray-800">
            {new Date(startTime).toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">End:</span>
          <span className="text-gray-800">
            {new Date(endTime).toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Price:</span>
          <span className="text-gray-800 font-medium">{price} USD</span>
        </div>
      </div>
    </div>
  );
};
