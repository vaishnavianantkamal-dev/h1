import React from "react";
import Skeleton from "./Skeleton";

const ListSkeleton = ({ count = 5 }) => {
  return (
    <div className="flex flex-col">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="p-4 border-b border-gray-100 last:border-0 flex items-center gap-3"
        >
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default ListSkeleton;
