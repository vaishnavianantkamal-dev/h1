import React, { useState } from "react";

const ServiceNameDisplay = ({ name }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const maxLength = 40;

  if (!name) return <span className="text-gray-400 italic">N/A</span>;
  if (name.length <= maxLength) return <span>{name}</span>;

  return (
    <span>
      {isExpanded ? name : `${name.substring(0, maxLength)}...`}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
        className="ml-1 text-blue-600 hover:text-blue-700 text-[11px] font-semibold"
      >
        {isExpanded ? "Show Less" : "Read More"}
      </button>
    </span>
  );
};

export default ServiceNameDisplay;
