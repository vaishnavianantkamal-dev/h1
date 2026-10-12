// Build a compact, windowed page list centered on the current page.
// Returns page numbers plus "ellipsis" markers, e.g. [1, "ellipsis", 4, 5, 6, 7, 8, "ellipsis", 24].
// The first and last pages are always pinned, and the current page (±2) stays visible.
export const getPageNumbers = (total, current) => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pageSet = new Set([1, total]);
  for (let p = current - 2; p <= current + 2; p++) {
    if (p > 1 && p < total) pageSet.add(p);
  }

  const sortedPages = [...pageSet].sort((a, b) => a - b);
  const result = [];
  sortedPages.forEach((page, idx) => {
    if (idx > 0 && page - sortedPages[idx - 1] > 1) {
      result.push("ellipsis");
    }
    result.push(page);
  });
  return result;
};
