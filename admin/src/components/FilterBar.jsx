import React, { useEffect, useRef } from 'react';
import { Search, Filter } from 'lucide-react';

const FilterBar = ({
  tabs = [],
  activeTab,
  onTabChange,
  searchTerm,
  onSearchChange,
  searchPlaceholder = "Search...",
  onFilterClick,
  rightSlot,
  showSearch = true,
}) => {
  const activeTabRef = useRef(null);

  useEffect(() => {
    activeTabRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });
  }, [activeTab]);

  const hasFilterRow = showSearch || Boolean(rightSlot);

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
      <div className="flex flex-col gap-3">
        {/* Tabs Section */}
        {tabs.length > 0 && (
          <div className="flex overflow-x-auto pb-1 gap-2 no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                ref={activeTab === tab.id ? activeTabRef : null}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
              >
                {tab.icon && <span>{tab.icon}</span>}
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Search & Filter Section */}
        {hasFilterRow && (
          <div
            className={`flex flex-col sm:flex-row sm:flex-wrap gap-2 ${tabs.length > 0 ? 'pt-3 border-t border-gray-100' : ''}`}
          >
            {showSearch && (
              <div className="relative flex-1 sm:max-w-xs">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none"
                />
              </div>
            )}

            {rightSlot}
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterBar;
