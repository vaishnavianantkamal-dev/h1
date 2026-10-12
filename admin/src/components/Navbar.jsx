import React, { useState, useEffect, useRef } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import {
  ChevronRight,
  Menu,
  ChevronDown,
  LogOut,
  User,
} from "lucide-react";
import Notifications from "./Notifications";

const Navbar = ({ onMenuClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const pathnames = location.pathname.split("/").filter((x) => x);
  const [user, setUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Error parsing user data", e);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const formatBreadcrumb = (name) => {
    return name
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 w-full z-30 sticky top-0 shadow-sm transition-all duration-300">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left side: Logo & Breadcrumbs */}
          <div className="flex items-center gap-4">
            <button
              onClick={onMenuClick}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              aria-label="Open sidebar menu"
              title="Open menu"
            >
              <Menu size={24} />
            </button>

            <div className="hidden md:flex items-center h-8 px-4 rounded-full bg-gray-50/50 border border-gray-100 text-sm text-gray-500">
              <Link
                to="/"
                className="hover:text-primary transition-colors font-medium"
              >
                Home
              </Link>
              {pathnames.length > 0 && (
                <>
                  <ChevronRight size={14} className="text-gray-300 mx-2" />
                  <span className="font-semibold text-gray-900">
                    {formatBreadcrumb(pathnames[pathnames.length - 1])}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Right side: Search, Notifications, Profile */}
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="hidden md:flex relative items-center group">
              {/* <Search
                size={18}
                className="absolute left-3 text-gray-400 group-focus-within:text-primary transition-colors"
              /> */}
              {/* <input
                type="text"
                placeholder="Search anything..."
                className="pl-10 pr-4 py-2 bg-gray-50 border border-transparent rounded-full text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/20 focus:bg-white focus:w-72 transition-all w-64 outline-none placeholder:text-gray-400"
              /> */}
            </div>

            <Notifications />

            <div className="h-8 w-px bg-gray-200/80 mx-1"></div>

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-3 cursor-pointer p-1.5 pr-3 rounded-full hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all duration-200 group outline-none"
              >
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center border-2 border-white shadow-sm group-hover:scale-105 transition-transform text-primary">
                  <User size={20} />
                </div>
                <div className="hidden sm:flex flex-col items-start">
                  <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900">
                    {user?.name || "User"}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {typeof user?.role === "object"
                      ? user.role.name || "Role"
                      : user?.role || "Role"}
                  </span>
                </div>
                <ChevronDown
                  size={14}
                  className={`text-gray-400 group-hover:text-gray-600 hidden sm:block transition-transform duration-200 ${showDropdown ? "rotate-180" : ""}`}
                />
              </button>

              {/* Dropdown Menu */}
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg py-1 border border-gray-100 ring-1 ring-black ring-opacity-5 focus:outline-none transform opacity-100 scale-100 transition-all duration-200 origin-top-right z-50">
                  <div className="px-4 py-3 border-b border-gray-50">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user?.name || "User"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user?.email || ""}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
