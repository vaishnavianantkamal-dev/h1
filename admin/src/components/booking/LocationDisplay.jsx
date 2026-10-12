import React, { useState } from "react";

const LocationDisplay = ({ location }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const maxLength = 35; // Short length for table views

  if (!location || location === "N/A") {
    return <span className="text-gray-400 italic">N/A</span>;
  }

  if (location.length <= maxLength) {
    return <span>{location}</span>;
  }

  return (
    <div className="flex flex-col">
      <span className="break-words">
        {isExpanded ? location : `${location.substring(0, maxLength)}... `}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="text-blue-600 hover:text-blue-700 text-[11px] font-semibold inline-block ml-1"
        >
          {isExpanded ? "Show Less" : "Read More"}
        </button>
      </span>
    </div>
  );
};

export default LocationDisplay;
