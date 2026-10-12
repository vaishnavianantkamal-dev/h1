import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  UserCircle,
  Layers,
  Calendar,
  Wallet,
  CreditCard,
  MapPin,
  Percent,
  Settings,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Menu,
  Command,
  FileText,
  Frame,
  Trash2,
  Tag,
  Clock,
  ChefHat,
  ClipboardList,
  CalendarClock,
  ClipboardCheck,
  Siren,
  Megaphone,
  Repeat,
  CalendarDays,
  Ban,
} from "lucide-react";
import { ROLES } from "../constants/roles";
import Logo from "../assets/hobitLogoNew.jpg";

const Sidebar = ({ isMobileOpen = false, onCloseMobile = () => {} }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState("");
  const [userPermissions, setUserPermissions] = useState([]);
  const [user, setUser] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(
    localStorage.getItem("sidebarCollapsed") === "true",
  );

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", isCollapsed);
  }, [isCollapsed]);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        const role = parsedUser.role;
        const roleName = typeof role === "object" ? role.name : role;

        if (roleName) {
          setUserRole(roleName);
        }
        // Set permissions from user object
        if (parsedUser.permissions && Array.isArray(parsedUser.permissions)) {
          setUserPermissions(parsedUser.permissions);
        }
      } catch (e) {
        console.error("Error parsing user data", e);
      }
    }
  }, []);

  const handleLogout = (e) => {
    e.preventDefault();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const menuItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
      slug: "dashboard",
    },

    { name: "Workers", path: "/workers", icon: Briefcase, slug: "workers" },
    {
      name: "Workers Attendance",
      path: "/workers-attendance",
      icon: ClipboardCheck,
      slug: "workers",
    },
    {
      name: "Contractors",
      path: "/contractors",
      icon: Users,
      slug: "contractors",
    },
    { name: "Customers", path: "/customers", icon: Users, slug: "customers" },

    {
      name: "Orders / Booking",
      path: "/orders-booking",
      icon: Calendar,
      slug: "orders",
    },
    {
      name: "Transactions",
      path: "/transactions",
      icon: CreditCard,
      slug: "transactions",
    },
    {
      name: "Monthly Subscriptions",
      path: "/monthly-subscriptions",
      icon: Clock,
      slug: "orders",
    },
    {
      name: "Hobit Everyday",
      path: "/hobit-everyday",
      icon: Repeat,
      slug: "orders",
    },
    {
      name: "Hobit Weekday",
      path: "/hobit-weekday",
      icon: CalendarDays,
      slug: "orders",
    },
    {
      name: "Service Categories",
      path: "/service-categories",
      icon: Layers,
      slug: "service_categories",
    },
    {
      name: "Service Requests",
      path: "/service-requests",
      icon: ClipboardList,
      slug: "orders",
    },
    {
      name: "Deep Cleaning Enquiries",
      path: "/cook-enquiries",
      icon: ChefHat,
      slug: "orders",
    },
    {
      name: "Cancellation Requests",
      path: "/cancellation-requests",
      icon: Ban,
      slug: "cancellation_requests",
    },
    {
      name: "Emergency / SOS Alerts",
      path: "/emergency-alerts",
      icon: Siren,
      slug: "emergency_alerts",
    },
    {
      name: "Withdrawal",
      path: "/withdrawal",
      icon: Wallet,
      slug: "withdrawal",
    },
    {
      name: "Referrals",
      path: "/referrals",
      icon: Users,
      slug: "referrals",
    },
    {
      name: "Location & Zone",
      path: "/location-zone-setup",
      icon: MapPin,
      slug: "location_zone",
    },
    {
      name: "Serviceable Pincodes",
      path: "/pincodes",
      icon: MapPin,
      slug: "pincodes",
    },
    {
      name: "Commission",
      path: "/commission-settings",
      icon: Percent,
      slug: "commission",
    },
    {
      name: "User Types & Roles",
      path: "/user-types-roles",
      icon: UserCircle,
      slug: "user_roles",
    },
    {
      name: "Survey Details",
      path: "/survey-submissions",
      icon: FileText,
      slug: "survey_details",
    },
    {
      name: "Account Deletion Requests",
      path: "/account-deletion-requests",
      icon: Trash2,
      slug: "account_deletion_requests",
    },
    {
      name: "Do's and Don'ts",
      path: "/donts",
      icon: FileText,
      slug: "donts",
    },
    {
      name: "Coupon Codes",
      path: "/coupons",
      icon: Tag,
      slug: "coupons",
    },
    {
      name: "Event Management",
      path: "/events",
      icon: Calendar,
      slug: "events",
    },
    {
      name: "Notifications",
      path: "/notifications",
      icon: Megaphone,
      slug: "notifications",
    },

    { name: "Settings", path: "/settings", icon: Settings, slug: "settings" },
    { name: "CMS", path: "/cms", icon: Frame, slug: "cms" },
  ];

  const filterItems = (items) => {
    return items.filter((item) => {
      if (userRole === ROLES.SUPER_ADMIN) return true;
      return userPermissions.includes(item.slug);
    });
  };

  const filteredMenuItems = filterItems(menuItems);

  const renderMenuItem = (item) => {
    const isActive =
      item.path === "/dashboard"
        ? location.pathname === "/dashboard"
        : location.pathname === item.path ||
          location.pathname.startsWith(item.path + "/");
    const Icon = item.icon;

    return (
      <Link
        key={item.path}
        to={item.path}
        title={isCollapsed ? item.name : ""}
        className={`group relative flex items-center ${
          isCollapsed ? "justify-center px-2" : "gap-3 px-4"
        } py-3 rounded-xl text-sm font-medium transition-all duration-300 ease-in-out
          ${
            isActive
              ? "bg-primary text-white shadow-lg shadow-primary/30 translate-x-1"
              : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 hover:translate-x-1"
          }`}
      >
        <Icon
          size={20}
          className={`transition-colors duration-300 ${
            isActive ? "text-white" : "text-gray-400 group-hover:text-primary"
          }`}
          strokeWidth={isActive ? 2.5 : 2}
        />
        {!isCollapsed && <span className="flex-1 truncate">{item.name}</span>}
        {isActive && !isCollapsed && (
          <ChevronRight size={16} className="text-white/80 animate-pulse" />
        )}
      </Link>
    );
  };

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`${
          isCollapsed ? "w-20 md:w-20" : "w-72"
        } bg-white h-full border-r border-gray-100 fixed md:relative top-0 left-0 z-50 md:z-40 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-all duration-300 ease-in-out ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        {/* Collapse Toggle Button - Desktop only */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3.5 top-10 bg-gray-700 text-white rounded-full border border-gray-200 rounded-full w-7 h-7 flex items-center justify-center shadow-md text-gray-400 hover:text-primary hover:border-primary hover:scale-110 transition-all z-50 hidden md:flex"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {/* Mobile close button */}
        <button
          onClick={onCloseMobile}
          className="md:hidden absolute right-3 top-3 p-2 rounded-lg text-gray-500 hover:bg-gray-100"
          title="Close menu"
          aria-label="Close sidebar menu"
        >
          <ChevronLeft size={18} />
        </button>

        {/* Brand Logo Area */}
        <div className={`p-6 ${isCollapsed ? "px-2" : "pb-2"}`}>
          <div
            className={`flex items-center ${
              isCollapsed ? "justify-center" : "gap-3 px-2"
            }`}
          >
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 transform transition-transform hover:scale-105 overflow-hidden ring-2 ring-primary/10 flex-shrink-0">
              <img
                src={Logo}
                alt="Hobit Logo"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-gray-900 tracking-tight truncate">
                  Hobit
                </h1>
                <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase truncate">
                  Admin Panel
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div
          className={`flex-1 overflow-y-auto py-6 ${
            isCollapsed ? "px-2" : "px-4"
          } space-y-1 custom-scrollbar`}
        >
          {!isCollapsed && (
            <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
              Overview
            </p>
          )}

          {filteredMenuItems.map((item) => (
            <div key={item.path} onClick={onCloseMobile}>
              {renderMenuItem(item)}
            </div>
          ))}
        </div>

        {/* User Profile & Logout */}
        <div
          className={`${isCollapsed ? "p-2" : "p-4"} border-t border-gray-100 bg-gray-50/50`}
        >
          <div
            className={`bg-white rounded-2xl ${
              isCollapsed ? "p-2" : "p-4"
            } shadow-sm border border-gray-100 group transition-all duration-300 hover:shadow-md`}
          >
            <div
              className={`flex items-center ${
                isCollapsed ? "justify-center" : "gap-3 mb-3"
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-linear-to-br from-primary to-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md ring-2 ring-white flex-shrink-0">
                {user?.name
                  ? user.name.charAt(0).toUpperCase()
                  : userRole.charAt(0)}
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate group-hover:text-primary transition-colors">
                    {user?.name || "Admin User"}
                  </p>
                  <p className="text-xs text-gray-500 truncate capitalize">
                    {userRole.toLowerCase().replace("_", " ")}
                  </p>
                </div>
              )}
            </div>

            {!isCollapsed ? (
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 transition-colors"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            ) : (
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="mt-3 flex items-center justify-center w-10 h-10 rounded-xl text-red-600 bg-red-50 hover:bg-red-100 transition-colors mx-auto"
              >
                <LogOut size={18} />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
