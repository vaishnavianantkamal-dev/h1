import React from "react";
import { useGetCitiesQuery } from "../api/apiSlice";

/**
 * Reusable city filter dropdown.
 *
 * Self-fetches the city list (RTK Query dedupes the request across the app, so
 * dropping several of these on a page costs only one network call). Emits the
 * selected city id as a string ("" = all cities) via onChange.
 *
 * @param {string}   value     - currently selected city id ("" for all)
 * @param {Function} onChange  - called with the new city id string
 * @param {string}   className - override the default select styling
 * @param {string}   allLabel  - label for the "no filter" option
 */
const CityFilter = ({
  value,
  onChange,
  className = "w-full sm:w-[180px] px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all",
  allLabel = "All Cities",
}) => {
  const { data: cities = [] } = useGetCitiesQuery();

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    >
      <option value="">{allLabel}</option>
      {cities.map((c) => (
        <option key={c.id} value={String(c.id)}>
          {c.name}
        </option>
      ))}
    </select>
  );
};

export default CityFilter;
