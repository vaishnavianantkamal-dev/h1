import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, X, Check } from "lucide-react";

const MultiSelect = ({
  options = [],
  selectedValues = [],
  onChange,
  placeholder = "Select options",
  label,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getOptionValue = (option, index) =>
    typeof option === "object"
      ? option.value ?? option.id ?? option.name ?? index
      : option;

  const toggleOption = (value) => {
    const newSelected = selectedValues.includes(value)
      ? selectedValues.filter((item) => item !== value)
      : [...selectedValues, value];
    onChange(newSelected);
  };

  const isAllSelected =
    options.length > 0 && selectedValues.length === options.length;

  const handleSelectAllToggle = (e) => {
    e.stopPropagation();
    if (isAllSelected) {
      onChange([]);
    } else {
      const allValues = options.map((option, index) =>
        getOptionValue(option, index),
      );
      onChange(allValues);
    }
  };

  const removeValue = (e, value) => {
    e.stopPropagation();
    onChange(selectedValues.filter((item) => item !== value));
  };

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary bg-white cursor-pointer min-h-[42px] flex items-center justify-between"
      >
        <div className="flex flex-wrap gap-1.5">
          {selectedValues.length === 0 ? (
            <span className="text-gray-400">{placeholder}</span>
          ) : (
            selectedValues.map((value) => (
              <span
                key={value}
                className="bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1"
              >
                {value}
                <X
                  size={12}
                  className="hover:text-primary/80 cursor-pointer"
                  onClick={(e) => removeValue(e, value)}
                />
              </span>
            ))
          )}
        </div>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {options.length === 0 ? (
            <div className="p-3 text-sm text-gray-500 text-center">
              No options available
            </div>
          ) : (
            <>
              <div className="px-3 py-2 text-xs text-primary font-medium border-b border-gray-100 bg-primary/5 flex items-center justify-between sticky top-0 z-10">
                <button
                  type="button"
                  onClick={handleSelectAllToggle}
                  className="hover:underline"
                >
                  {isAllSelected ? "Clear all" : "Select all"}
                </button>
              </div>
              {options.map((option, index) => {
                const value = getOptionValue(option, index);
                return (
                  <div
                    key={value}
                    onClick={() => toggleOption(value)}
                    className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between hover:bg-gray-50 ${
                      selectedValues.includes(value)
                        ? "bg-primary/5 text-primary font-medium"
                        : "text-gray-700"
                    }`}
                  >
                    <span>{option.label || option}</span>
                    {selectedValues.includes(value) && (
                      <Check size={16} className="text-primary" />
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MultiSelect;
