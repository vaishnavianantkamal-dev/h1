import React, { Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import "./App.css";
import ErrorBoundary from "./components/ErrorBoundary";
import PermissionGuard from "./components/PermissionGuard";
import Cms from "./pages/Cms";

// Lazy load components
const Layout = lazy(() => import("./components/Layout"));
const ProtectedRoute = lazy(() => import("./components/ProtectedRoute"));
const Login = lazy(() => import("./pages/Auth/Login"));
const Register = lazy(() => import("./pages/Auth/Register"));
const ForgotPassword = lazy(() => import("./pages/Auth/ForgotPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const UserTypesRoles = lazy(() => import("./pages/UserTypesRoles"));
const Workers = lazy(() => import("./pages/Workers"));
const WorkersAttendance = lazy(() => import("./pages/WorkersAttendance"));
const Contractors = lazy(() => import("./pages/Contractors"));
const ContractorWorkers = lazy(
  () => import("./pages/Contractors/ContractorWorkers"),
);
const Customers = lazy(() => import("./pages/Customers"));
const ServiceCategories = lazy(() => import("./pages/ServiceCategories"));
const OrdersBooking = lazy(() => import("./pages/OrdersBooking"));
const MonthlySubscriptions = lazy(() => import("./pages/MonthlySubscriptions"));
const HobitEveryday = lazy(() => import("./pages/HobitEveryday"));
const HobitWeekday = lazy(() => import("./pages/HobitWeekday"));
const CookEnquiries = lazy(() => import("./pages/CookEnquiries"));
const ServiceRequests = lazy(() => import("./pages/ServiceRequests"));
const Withdrawal = lazy(() => import("./pages/Withdrawal"));
const Transactions = lazy(() => import("./pages/Transactions"));
const LocationZoneSetup = lazy(() => import("./pages/LocationZoneSetup"));
const CommissionSettings = lazy(() => import("./pages/CommissionSettings"));
const Settings = lazy(() => import("./pages/Settings"));
const Referrals = lazy(() => import("./pages/Referrals"));
const ResidentSurvey = lazy(() => import("./pages/ResidentSurvey"));
const MaidSurvey = lazy(() => import("./pages/ResidentSurvey/MaidSurvey"));
const SurveyList = lazy(() => import("./pages/ResidentSurvey/SurveyList"));
const AccountDeletionRequests = lazy(
  () => import("./pages/AccountDeletionRequests"),
);
const CancellationRequests = lazy(
  () => import("./pages/CancellationRequests"),
);
const Donts = lazy(() => import("./pages/Donts"));
const Coupons = lazy(() => import("./pages/Coupons"));
const Pincodes = lazy(() => import("./pages/Pincodes"));
const Events = lazy(() => import("./pages/Events"));
const SlotManagement = lazy(() => import("./pages/SlotManagement"));
const Banners = lazy(() => import("./pages/Banners"));
const EmergencyAlerts = lazy(() => import("./pages/EmergencyAlerts"));
const Notifications = lazy(() => import("./pages/Notifications"));

function App() {
  return (
    <Router>
      <Toaster position="top-right" reverseOrder={false} />
      <ErrorBoundary>
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-screen">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          }
        >
          <Routes>
            {/* Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/resident-survey" element={<ResidentSurvey />} />
            <Route path="/maid-information-form" element={<MaidSurvey />} />

            {/* Protected Routes */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      <Route
                        path="/"
                        element={<Navigate to="/dashboard" replace />}
                      />
                      <Route
                        path="/dashboard"
                        element={
                          <PermissionGuard requiredPermission="dashboard">
                            <Dashboard />
                          </PermissionGuard>
                        }
                      />
                      <Route
                        path="/user-types-roles"
                        element={
                          <PermissionGuard requiredPermission="user_roles">
                            <UserTypesRoles />
                          </PermissionGuard>
                        }
                      />
                      <Route
                        path="/workers"
                        element={
                          <PermissionGuard requiredPermission="workers">
                            <Workers />
                          </PermissionGuard>
                        }
                      />
                      <Route
                        path="/workers-attendance"
                        element={
                          <PermissionGuard requiredPermission="workers">
                            <WorkersAttendance />
                          </PermissionGuard>
                        }
                      />
                      <Route
                        path="/contractors"
                        element={
                          <PermissionGuard requiredPermission="contractors">
                            <Contractors />
                          </PermissionGuard>
                        }
                      />
                      <Route
                        path="/contractors/:id/workers"
                        element={
                          <PermissionGuard requiredPermission="contractors">
                            <ContractorWorkers />
                          </PermissionGuard>
                        }
                      />
                      <Route
                        path="/customers"
                        element={
                          <PermissionGuard requiredPermission="customers">
                            <Customers />
                          </PermissionGuard>
                        }
                      />
                      <Route
                        path="/service-categories"
                        element={
                          <PermissionGuard requiredPermission="service_categories">
                            <ServiceCategories />
                          </PermissionGuard>
                        }
                      />
                      <Route
                        path="/orders-booking"
                        element={
                          <PermissionGuard requiredPermission="orders">
                            <OrdersBooking />
                          </PermissionGuard>
                        }
                      />
                      <Route
                        path="/monthly-subscriptions"
                        element={
                          <PermissionGuard requiredPermission="orders">
                            <MonthlySubscriptions />
                          </PermissionGuard>
                        }
                      />
                      <Route
                        path="/hobit-everyday"
                        element={
                          <PermissionGuard requiredPermission="orders">
                            <HobitEveryday />
                          </PermissionGuard>
                        }
                      />
                      <Route
                        path="/hobit-weekday"
                        element={
                          <PermissionGuard requiredPermission="orders">
                            <HobitWeekday />
                          </PermissionGuard>
                        }
                      />
                      <Route
                        path="/cook-enquiries"
                        element={
                          <PermissionGuard requiredPermission="orders">
                            <CookEnquiries />
                          </PermissionGuard>
                        }
                      />
                      <Route
                        path="/service-requests"
                        element={
                          <PermissionGuard requiredPermission="orders">
                            <ServiceRequests />
                          </PermissionGuard>
                        }
                      />
                      <Route
                        path="/withdrawal"
                        element={
                          <PermissionGuard requiredPermission="withdrawal">
                            <Withdrawal />
                          </PermissionGuard>
                        }
                      />
                      <Route
                        path="/transactions"
                        element={
                          <PermissionGuard requiredPermission="transactions">
                            <Transactions />
                          </PermissionGuard>
                        }
                      />
                      <Route
                        path="/location-zone-setup"
                        element={
                          <PermissionGuard requiredPermission="location_zone">
                            <LocationZoneSetup />
                          </PermissionGuard>
                        }
                      />
                      <Route
                        path="/pincodes"
                        element={
                          <PermissionGuard requiredPermission="pincodes">
                            <Pincodes />
                          </PermissionGuard>
                        }
                      />
                      <Route
                        path="/referrals"
                        element={
                          <PermissionGuard requiredPermission="referrals">
                            <Referrals />
                          </PermissionGuard>
                        }
                      />
                      <Route
                        path="/commission-settings"
                        element={
                          <PermissionGuard requiredPermission="commission">
                            <CommissionSettings />
                          </PermissionGuard>
                        }
                      />
                      <Route
                        path="/settings"
                        element={
                          <PermissionGuard requiredPermission="settings">
                            <Settings />
                          </PermissionGuard>
                        }
                      />
                      <Route
                        path="/survey-submissions"
                        element={
                          <PermissionGuard requiredPermission="survey_details">
                            <SurveyList />
                          </PermissionGuard>
                        }
                      />
                      <Route
                        path="/account-deletion-requests"
                        element={
                          <PermissionGuard requiredPermission="account_deletion_requests">
                            <AccountDeletionRequests />
                          </PermissionGuard>
                        }
                      />
                      <Route
                        path="/cancellation-requests"
                        element={
                          <PermissionGuard requiredPermission="cancellation_requests">
                            <CancellationRequests />
                          </PermissionGuard>
                        }
                      />
                      <Route
                        path="/donts"
                        element={
                          <PermissionGuard requiredPermission="donts">
                            <Donts />
                          </PermissionGuard>
                        }
                      />
                      <Route
                        path="/coupons"
                        element={
                          <PermissionGuard requiredPermission="coupons">
                            <Coupons />
                          </PermissionGuard>
                        }
                      />
                      <Route
                        path="/cms"
                        element={
                          <PermissionGuard requiredPermission="cms">
                            <Cms />
                          </PermissionGuard>
                        }
                      />
                      <Route
                        path="/events"
                        element={
                          <PermissionGuard requiredPermission="events">
                            <Events />
                          </PermissionGuard>
                        }
                      />
                      <Route
                        path="/slot-management"
                        element={
                          <PermissionGuard requiredPermission="slot_management">
                            <SlotManagement />
                          </PermissionGuard>
                        }
                      />
                      <Route
                        path="/banners"
                        element={
                          <PermissionGuard requiredPermission="banners">
                            <Banners />
                          </PermissionGuard>
                        }
                      />
                      <Route
                        path="/emergency-alerts"
                        element={
                          <PermissionGuard requiredPermission="emergency_alerts">
                            <EmergencyAlerts />
                          </PermissionGuard>
                        }
                      />
                      <Route
                        path="/notifications"
                        element={
                          <PermissionGuard requiredPermission="notifications">
                            <Notifications />
                          </PermissionGuard>
                        }
                      />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
