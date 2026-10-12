import React from "react";

/**
 * Reusable multi-select checkbox grid.
 * Used for selecting subscription types and cities on the service/category forms.
 *
 * @param {Array}    items        - list of options, each with at least { id, name }
 * @param {number[]} selectedIds  - currently selected ids (numbers)
 * @param {Function} onToggle     - called with the toggled item id
 * @param {boolean}  isLoading    - show a loading message instead of the grid
 * @param {string}   loadingText  - message shown while loading
 * @param {string}   emptyText    - message shown when there are no options
 * @param {Function} getLabel     - derive the visible label from an item
 */
const CheckboxGroup = ({
  items = [],
  selectedIds = [],
  onToggle,
  isLoading = false,
  loadingText = "Loading...",
  emptyText = "No options available.",
  getLabel = (item) => item.name,
}) => {
  if (isLoading) {
    return <p className="text-sm text-gray-400">{loadingText}</p>;
  }

  if (!items || items.length === 0) {
    return <p className="text-sm text-gray-400">{emptyText}</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto p-3 border border-gray-200 rounded-lg">
      {items.map((item) => (
        <label
          key={item.id}
          className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 rounded px-1.5 py-1"
        >
          <input
            type="checkbox"
            checked={selectedIds.includes(Number(item.id))}
            onChange={() => onToggle(item.id)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20"
          />
          <span>{getLabel(item)}</span>
        </label>
      ))}
    </div>
  );
};

export default CheckboxGroup;
