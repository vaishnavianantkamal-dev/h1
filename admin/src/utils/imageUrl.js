// Use for media that the API already returns as a fully-qualified URL.
// Absolute http(s)/blob URLs are returned untouched; relative paths still
// fall back to getImageUrl.
export const resolveMediaUrl = (path) =>
  typeof path === "string" &&
  (path.startsWith("http") || path.startsWith("blob:"))
    ? path
    : getImageUrl(path);

export const getImageUrl = (path) => {
  if (!path) return null;

  if (typeof path !== "string") return path;

  // Remove extra backticks, spaces, and normalize slashes
  const cleanPath = path
    .trim()
    .replace(/^`+|`+$/g, "")
    .replace(/\\/g, "/"); // Convert backslashes to forward slashes

  if (cleanPath.startsWith("blob:")) return cleanPath;

  if (cleanPath.startsWith("http")) {
    
    if (cleanPath.includes("storage/app/public/")) {
      const baseUrl =
        import.meta.env.VITE_API_BASE_URL || "https://hobitadmin.hobit.club";
      const cleanBaseUrl = baseUrl.replace(/\/$/, "");

      const idx = cleanPath.indexOf("storage/app/public/");
      const relative = cleanPath.slice(idx); // "storage/app/public/..."
      const finalUrl = `${cleanBaseUrl}/${relative}`;
      return finalUrl.replace(/([^:]\/)\/+/g, "$1");
    }

    // Other http(s) URLs (including generic /storage/... links, which are
    // already served correctly via Laravel's public storage symlink):
    // return as-is
    return cleanPath;
  }

  const baseUrl =
    import.meta.env.VITE_API_BASE_URL || "https://hobitadmin.hobit.club";
  const cleanBaseUrl = baseUrl.replace(/\/$/, "");

  let finalUrl = "";

  // Handle paths starting with storage/ or /storage/
  if (cleanPath.startsWith("storage/app/public/")) {
    // Map to {base}/storage/app/public/...
    finalUrl = `${cleanBaseUrl}/${cleanPath}`;
  } else if (cleanPath.startsWith("storage/")) {
    finalUrl = `${cleanBaseUrl}/public/${cleanPath}`;
  } else if (cleanPath.startsWith("/storage/")) {
    finalUrl = `${cleanBaseUrl}/public${cleanPath}`;
  } else {
    // Fallback for paths like "uploads/..." that need the storage base URL
    const normalizedPath = cleanPath.startsWith("/")
      ? cleanPath
      : `/${cleanPath}`;
    finalUrl = `${cleanBaseUrl}/public/storage${normalizedPath}`;
  }

  // Fix double slashes except after protocol (e.g. http://)
  return finalUrl.replace(/([^:]\/)\/+/g, "$1");
};
