import React, { useState } from "react";
import { Globe, Smartphone } from "lucide-react";
import Header from "./components/Header";
import Hero from "./components/Hero";
import Our from "./components/Our";
import WhyChoose from "./components/WhyChoose";
import OurMission from "./components/OurMission";
import HowItWorks from "./components/HowItWorks";
import Working from "./components/Working";
import Testimonials from "./components/Testimonials";
import Faq from "./components/Faq";
import GetTheApp from "./components/GetTheApp";
import GetInTouch from "./components/GetInTouch";
import Banners from "../Banners";
import AppMarquee from "./components/AppMarquee";
import AppHomeCategories from "./components/AppHomeCategories";
import SubscriptionBenefits from "./components/SubscriptionBenefits";
import AppWhyChoose from "./components/AppWhyChoose";
import SubscriptionPolicies from "./components/SubscriptionPolicies";
import BookingInstructions from "./components/BookingInstructions";
import InstantHelpCard from "./components/InstantHelpCard";
import EarnBanner from "./components/EarnBanner";
import SavingsBanner from "./components/SavingsBanner";

const webTabs = [
  { id: "Header", label: "Header", component: Header },
  { id: "Hero", label: "Hero", component: Hero },
  { id: "Our", label: "Our Services", component: Our },
  { id: "WhyChoose", label: "Why Choose", component: WhyChoose },
  { id: "OurMission", label: "Our Mission", component: OurMission },
  { id: "HowItWorks", label: "How It Works", component: HowItWorks },
  { id: "Working", label: "Working", component: Working },
  { id: "Testimonials", label: "Testimonials", component: Testimonials },
  { id: "Faq", label: "FAQ", component: Faq },
  { id: "GetTheApp", label: "Get The App", component: GetTheApp },
  { id: "GetInTouch", label: "Get in Touch", component: GetInTouch },
];

const appTabs = [
  { id: "Banners", label: "Banners", component: Banners },
  { id: "Marquee", label: "Marquee", component: AppMarquee },
  {
    id: "HomeCategories",
    label: "Home Categories",
    component: AppHomeCategories,
  },
  {
    id: "InstantHelpCard",
    label: "Instant Help Card",
    component: InstantHelpCard,
  },
  { id: "EarnBanner", label: "Earn Banner", component: EarnBanner },
  { id: "SavingsBanner", label: "Savings Banner", component: SavingsBanner },
  {
    id: "SubscriptionBenefits",
    label: "Sub. Benefits",
    component: SubscriptionBenefits,
  },
  { id: "WhyChoose", label: "Why Choose", component: AppWhyChoose },
  {
    id: "SubscriptionPolicies",
    label: "Policies",
    component: SubscriptionPolicies,
  },
  {
    id: "BookingInstructions",
    label: "Booking Instructions",
    component: BookingInstructions,
  },
];

const sections = [
  {
    id: "web",
    label: "Web Content Management",
    icon: Globe,
    tabs: webTabs,
    defaultTab: "Header",
  },
  {
    id: "app",
    label: "App Content Management",
    icon: Smartphone,
    tabs: appTabs,
    defaultTab: "Banners",
  },
];

const TabNav = ({ tabs, activeTab, onTabChange }) => (
  <div className="mb-8 border-b border-neutral-200">
    <div className="overflow-x-auto scrollbar-hide -mb-px">
      <nav className="flex gap-1 min-w-max" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              relative px-5 py-3.5 text-[13px] font-medium transition-all duration-200
              whitespace-nowrap group
              ${activeTab === tab.id ? "text-neutral-900" : "text-neutral-500 hover:text-neutral-700"}
            `}
          >
            {tab.label}
            <span
              className={`
                absolute bottom-0 left-0 right-0 h-0.5 transition-all duration-300 ease-out
                ${activeTab === tab.id ? "bg-neutral-900 scale-x-100" : "bg-neutral-300 scale-x-0 group-hover:scale-x-100"}
              `}
            />
          </button>
        ))}
      </nav>
    </div>
  </div>
);

const Cms = () => {
  const [activeSection, setActiveSection] = useState("web");
  const [webActiveTab, setWebActiveTab] = useState("Header");
  const [appActiveTab, setAppActiveTab] = useState("Banners");

  const currentSection = sections.find((s) => s.id === activeSection);
  const activeTab = activeSection === "web" ? webActiveTab : appActiveTab;
  const setActiveTab =
    activeSection === "web" ? setWebActiveTab : setAppActiveTab;

  const ActiveComponent =
    currentSection.tabs.find((tab) => tab.id === activeTab)?.component ||
    currentSection.tabs[0].component;

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-350 mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-neutral-900 tracking-tight">
            Content Management
          </h1>
          <p className="text-neutral-500 mt-2 text-sm">
            Manage and edit your website and app content
          </p>
        </div>

        {/* Section Toggle */}
        <div className="flex gap-3 mb-8">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`
                  flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-medium
                  transition-all duration-200 border
                  ${
                    isActive
                      ? "bg-neutral-900 text-white border-neutral-900 shadow-md"
                      : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400 hover:text-neutral-900"
                  }
                `}
              >
                <Icon size={16} />
                {section.label}
              </button>
            );
          })}
        </div>

        {/* Sub-tabs (only shown when section has multiple tabs) */}
        {currentSection.tabs.length > 1 && (
          <TabNav
            tabs={currentSection.tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        )}

        {/* Content Area */}
        <div className="bg-white rounded-lg border border-neutral-200 shadow-sm">
          <div className="p-8">
            <div
              key={`${activeSection}-${activeTab}`}
              className="animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              <ActiveComponent />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cms;
