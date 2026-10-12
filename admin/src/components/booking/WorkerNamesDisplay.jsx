import React, { useState } from "react";

const WorkerNamesDisplay = ({ workers, fallbackName, fallbackId }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!workers || workers.length === 0) {
    if (!fallbackName) {
      return <span className="text-gray-400 italic">Unassigned</span>;
    }
    return (
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-[10px] font-bold">
          {fallbackName.charAt(0)}
        </div>
        <div>
          <div className="text-sm font-medium text-gray-900">
            {fallbackName}
          </div>
          <div className="text-[10px] text-gray-500 font-mono">
            {fallbackId}
          </div>
        </div>
      </div>
    );
  }

  if (workers.length === 1) {
    const w = workers[0];
    return (
      <div className="flex items-center gap-2">
        <img
          src={
            w.avatar ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              w.name,
            )}&background=random&color=fff`
          }
          alt={w.name}
          className="w-6 h-6 rounded-full object-cover"
        />
        <div>
          <div className="text-sm font-medium text-gray-900">{w.name}</div>
          <div className="text-[10px] text-gray-500 font-mono">{w.id}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        {!isExpanded && (
          <div className="relative flex -space-x-2">
            {workers.slice(0, 3).map((w) => (
              <img
                key={w.id}
                src={
                  w.avatar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    w.name,
                  )}&background=random&color=fff`
                }
                alt={w.name}
                className="w-7 h-7 rounded-full border-2 border-white object-cover shadow-sm"
                title={w.name}
              />
            ))}
            {workers.length > 3 && (
              <div className="w-7 h-7 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[9px] font-bold text-gray-600 shadow-sm">
                +{workers.length - 3}
              </div>
            )}
          </div>
        )}
        <div className="flex flex-col min-w-0">
          <div className="text-sm font-medium text-gray-900">
            {isExpanded
              ? "Assigned Workers:"
              : `${workers.length} Workers Assigned`}
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="text-blue-600 hover:text-blue-700 text-[10px] font-bold text-left uppercase tracking-tight"
          >
            {isExpanded ? "Show Less" : "View All Names"}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="bg-gray-50 p-2 rounded-lg border border-gray-100 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
          {workers.map((w) => (
            <div key={w.id} className="flex items-center gap-2">
              <img
                src={
                  w.avatar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    w.name,
                  )}&background=random&color=fff`
                }
                alt={w.name}
                className="w-5 h-5 rounded-full object-cover"
              />
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-gray-800 truncate">
                  {w.name}
                </div>
                <div className="text-[9px] text-gray-500 font-mono">{w.id}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkerNamesDisplay;
