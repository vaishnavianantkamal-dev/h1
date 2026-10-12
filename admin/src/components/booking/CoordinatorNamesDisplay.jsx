import React from "react";

const CoordinatorNamesDisplay = ({ coordinators = [] }) => {
  if (!Array.isArray(coordinators) || coordinators.length === 0) {
    return <span className="text-gray-400 italic text-xs">Not assigned</span>;
  }

  if (coordinators.length === 1) {
    const coordinator = coordinators[0];
    return (
      <div className="flex flex-col">
        <span className="text-sm font-medium text-gray-900">
          {coordinator.name}
        </span>
        <span className="text-[10px] text-gray-500 font-mono">
          {coordinator.phone || "N/A"}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {coordinators.map((coordinator) => (
        <span
          key={coordinator.id}
          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"
        >
          {coordinator.name}
        </span>
      ))}
    </div>
  );
};

export default CoordinatorNamesDisplay;
