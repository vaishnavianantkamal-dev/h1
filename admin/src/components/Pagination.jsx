import React from "react";
import { getPageNumbers } from "../utils/pagination";

/**
 * Reusable results footer: "Showing X to Y of Z", windowed page buttons,
 * and an optional rows-per-page selector.
 */
const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  fromItem,
  toItem,
  totalItems,
  perPage,
  onPerPageChange,
  perPageOptions = [10, 20, 50, 100],
  showPerPage = true,
  selectId = "rows-per-page",
}) => {
  return (
    <div className="bg-white px-6 py-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
      <p className="text-xs text-gray-500 text-center sm:text-left">
        Showing <span className="font-medium">{fromItem}</span> to{" "}
        <span className="font-medium">{toItem}</span> of{" "}
        <span className="font-medium">{totalItems}</span> results
      </p>
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          {/* Page Numbers */}
          {getPageNumbers(totalPages, currentPage).map((page, idx) =>
            page === "ellipsis" ? (
              <span
                key={`ellipsis-${idx}`}
                aria-hidden="true"
                className="px-2 py-1 text-xs font-medium text-gray-400"
              >
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                aria-current={currentPage === page ? "page" : undefined}
                className={`px-3 py-1 text-xs font-medium rounded-md shadow-sm transition-colors ${
                  currentPage === page
                    ? "text-white bg-primary"
                    : "text-gray-500 bg-gray-50 hover:bg-gray-100"
                }`}
              >
                {page}
              </button>
            ),
          )}
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>

        {/* Rows per page */}
        {showPerPage && (
          <div className="flex items-center gap-2 shrink-0">
            <label
              htmlFor={selectId}
              className="text-xs font-medium text-gray-500 whitespace-nowrap"
            >
              Rows per page
            </label>
            <select
              id={selectId}
              value={perPage}
              onChange={(e) => onPerPageChange(Number(e.target.value))}
              className="px-2 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-md outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              {perPageOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
};

export default Pagination;
