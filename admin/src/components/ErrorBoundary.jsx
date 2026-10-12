import React, { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught an error:", error, info);

    // Stale tab referencing a chunk hash that no longer exists after a new
    // deploy. Reload once to fetch the current build instead of getting stuck.
    const isStaleChunkError =
      /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(
        error?.message || "",
      );
    if (isStaleChunkError && !sessionStorage.getItem("vite-reloaded-on-preload-error")) {
      sessionStorage.setItem("vite-reloaded-on-preload-error", "1");
      window.location.reload();
    }
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-full flex items-center justify-center bg-gray-50">
          <div className="bg-white p-8 rounded-2xl shadow-md border border-gray-100 max-w-md text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              The page encountered an error. You can refresh or go back to the
              dashboard.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-blue-700 transition-colors"
              >
                Refresh
              </button>
              <a
                href="/dashboard"
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Go to Dashboard
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
