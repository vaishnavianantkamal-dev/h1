import React from "react";
import { Copy } from "lucide-react";
import toast from "react-hot-toast";
import MaidSurveyForm from "./MaidSurveyForm";

const MaidSurvey = () => {
  const copyLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link);
    toast.success("Maid survey link copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-primary px-8 py-6 text-white flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Maid Information Form</h1>
              <p className="text-blue-100 mt-1">
                Help us improve home services in your area
              </p>
            </div>
            <button
              onClick={copyLink}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
              title="Copy Survey Link"
            >
              <Copy size={18} />
              <span className="hidden sm:inline">Share Link</span>
            </button>
          </div>

          {/* Content */}
          <div>
            <MaidSurveyForm />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaidSurvey;
