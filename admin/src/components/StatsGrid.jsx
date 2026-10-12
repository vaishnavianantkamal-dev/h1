import React from "react";

const StatsGrid = ({ stats, bottomRightSlot = null }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <style>{`
        @keyframes blink {
          0% { opacity: 1; }
          50% { opacity: 0.3; }
          100% { opacity: 1; }
        }
        .animate-blink {
          animation: blink 1s infinite;
        }
      `}</style>
      {stats.map((stat, index) => (
        <div
          key={index}
          onClick={() => stat.onClick && stat.onClick()}
          className={`bg-white p-4 rounded-xl border border-gray-100 shadow-sm ${
            stat.onClick
              ? "cursor-pointer hover:border-primary/30 hover:shadow-md transition-all"
              : ""
          }`}
        >
          <div className="text-sm text-gray-500 mb-1">{stat.label}</div>
          <div
            className={`text-2xl font-bold ${stat.colorClass || "text-gray-900"} ${
              stat.isBlinking ? "animate-blink" : ""
            }`}
          >
            {stat.value}
          </div>
        </div>
      ))}
      {bottomRightSlot && (
        <div className="flex items-end justify-end sm:col-span-2 lg:col-span-1 lg:col-start-4">
          {bottomRightSlot}
        </div>
      )}
    </div>
  );
};

export default StatsGrid;
