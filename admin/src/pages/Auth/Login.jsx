import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Phone } from "lucide-react";
import toast from "react-hot-toast";
import { useLoginMutation, useLazyGetRoleQuery } from "../../api/apiSlice";
import Logo from "../../assets/hobitLogoNew.jpg";

// Mapping from API slugs to Frontend Paths
const SLUG_TO_PATH = {
  dashboard: "/dashboard",
  user_roles: "/user-types-roles",
  workers: "/workers",
  customers: "/customers",
  service_categories: "/service-categories",
  orders: "/orders-booking",
  withdrawal: "/withdrawal",
  transactions: "/transactions",
  referrals: "/referrals",
  location_zone: "/location-zone-setup",
  commission: "/commission-settings",
  settings: "/settings",
};

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({
    login: "",
    password: "",
  });
  const navigate = useNavigate();
  const location = useLocation();
  const [login, { isLoading: loading }] = useLoginMutation();
  const [triggerGetRole] = useLazyGetRoleQuery();

  // Load saved credentials on component mount
  React.useEffect(() => {
    const savedCredentials = localStorage.getItem("rememberedCredentials");
    if (savedCredentials) {
      try {
        const credentials = JSON.parse(savedCredentials);
        setFormData({
          login: credentials.login || "",
          password: credentials.password || "",
        });
        setRememberMe(true);
      } catch (error) {
        console.error("Error loading saved credentials:", error);
        localStorage.removeItem("rememberedCredentials");
      }
    }
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    // Prepare payload
    const payload = {
      login: formData.login,
      password: formData.password,
    };

    try {
      const response = await login(payload).unwrap();
      console.log("Login API Response:", response);

      // Check for token existence as success indicator since status field might be missing
      // Some APIs return 200 OK with just data, no explicit status:true
      const hasToken =
        response.token ||
        response.data?.token ||
        response.access_token ||
        response.authorisation?.token;

      if (response.status || hasToken) {
        // Save credentials if "Remember me" is checked
        if (rememberMe) {
          try {
            localStorage.setItem(
              "rememberedCredentials",
              JSON.stringify({
                login: formData.login,
                password: formData.password,
              }),
            );
          } catch (error) {
            console.error("Error saving credentials:", error);
          }
        } else {
          // Remove saved credentials if "Remember me" is unchecked
          localStorage.removeItem("rememberedCredentials");
        }

        toast.success(response.message || "Login successful!");

        // Store token - Handle different possible response structures
        const token = hasToken;

        if (token) {
          localStorage.setItem("token", token);
        } else {
          console.warn("Login successful but no token found in response");
          toast.error("Authentication Error: No token received");
          return;
        }

        let finalPermissions = [];

        // Store user info
        if (response.user) {
          // Normalize user role to string (name) if it's an object, to match frontend RBAC expectations
          const roleName = response.user.role?.name || response.user.role;

          // Extract permissions
          let permissions =
            response.user.role?.permissions?.map((p) => p.slug) || [];

          // If permissions are empty but we have a role ID, try to fetch them
          if (permissions.length === 0 && response.user.role?.id) {
            try {
              const roleData = await triggerGetRole(
                response.user.role.id,
              ).unwrap();
              if (roleData && roleData.permissions) {
                permissions = roleData.permissions.map((p) => p.slug);
              }
            } catch (err) {
              console.error("Failed to fetch role permissions:", err);
            }
          }

          finalPermissions = permissions;

          // Destructure role out of response.user to avoid conflict when spreading
          // eslint-disable-next-line no-unused-vars
          const { role, ...userRest } = response.user;

          const userToStore = {
            ...userRest,
            role: roleName,
            // Store permissions (slugs) directly in user object
            permissions: finalPermissions,
            // Keep the full role object for future reference if needed
            _role_details:
              typeof response.user.role === "object"
                ? response.user.role
                : null,
          };

          localStorage.setItem("user", JSON.stringify(userToStore));
        }

        // Determine redirect path based on permissions
        let targetPath = "/dashboard";

        if (
          finalPermissions.length > 0 &&
          !finalPermissions.includes("dashboard")
        ) {
          const firstAllowed = finalPermissions.find(
            (slug) => SLUG_TO_PATH[slug],
          );
          if (firstAllowed) {
            targetPath = SLUG_TO_PATH[firstAllowed];
          }
        }

        let redirectPath = location.state?.from?.pathname || targetPath;

        // Verify if the user is allowed to go to the 'from' location
        if (finalPermissions.length > 0) {
          // Find if the redirect path corresponds to a permission slug
          const requiredSlug = Object.keys(SLUG_TO_PATH).find(
            (slug) => SLUG_TO_PATH[slug] === redirectPath,
          );

          // If the path requires a permission and the user doesn't have it, fallback to targetPath
          if (requiredSlug && !finalPermissions.includes(requiredSlug)) {
            redirectPath = targetPath;
          } else if (
            redirectPath === "/dashboard" &&
            !finalPermissions.includes("dashboard")
          ) {
            // Explicit check for dashboard since it's the default
            redirectPath = targetPath;
          }
        }

        navigate(redirectPath, { replace: true });
      } else {
        toast.error(response.message || "Login failed");
      }
    } catch (err) {
      console.error("Login failed:", err);
      const message =
        err.data?.message || "Login failed. Please check your credentials.";
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-gray-100">
        <div className="text-center">
          <div className="mx-auto h-24 w-24 bg-white shadow-xl rounded-2xl flex items-center justify-center mb-6 overflow-hidden">
            <img
              src={Logo}
              alt="Logo"
              className="max-h-full max-w-full object-contain"
            />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your account to continue
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="login"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Phone or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="login"
                  name="login"
                  type="text"
                  autoComplete="username"
                  required
                  value={formData.login}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary sm:text-sm transition-colors outline-none"
                  placeholder="Enter phone or email"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary sm:text-sm transition-colors outline-none"
                  placeholder="••••••••"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-500 focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label
                htmlFor="remember-me"
                className="ml-2 block text-sm text-gray-900"
              >
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <Link
                to="/forgot-password"
                className="font-medium text-primary hover:text-blue-700"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign in"}
              <span className="absolute right-0 inset-y-0 flex items-center pr-3">
                {!loading && (
                  <ArrowRight className="h-5 w-5 text-blue-300 group-hover:text-white transition-colors" />
                )}
              </span>
            </button>
          </div>
        </form>

        {/* <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="font-medium text-primary hover:text-blue-700"
            >
              Sign up
            </Link>
          </p>
        </div> */}
      </div>
    </div>
  );
};

export default Login;
