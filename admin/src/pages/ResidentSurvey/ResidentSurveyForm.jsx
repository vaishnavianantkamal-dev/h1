import React, { useState } from "react";
import { Check, Send, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useCreateResidentSurveyMutation } from "../../api/apiSlice";

const ResidentSurveyForm = () => {
  const [createResidentSurvey, { isLoading }] =
    useCreateResidentSurveyMutation();
  const [formData, setFormData] = useState({
    surveyorName: "",
    buildingName: "",
    flatNumber: "",
    residentName: "",
    membersCount: "",
    maidsCount: "",
    workTypes: [],
    workDuration: "",
    reliabilityRating: 0,
    problems: [],
    timeSlots: [],
    monthlyPayment: "",
    findingMethod: [],
    appOpenness: "",
    convincingFactors: [],
    extraPayment: "",
    joinWhatsapp: "",
    whatsappNumber: "",
  });

  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleCheckboxChange = (e, field) => {
    const { value, checked } = e.target;
    let updatedList = [...formData[field]];
    if (checked) {
      updatedList.push(value);
    } else {
      updatedList = updatedList.filter((item) => item !== value);
    }
    setFormData({ ...formData, [field]: updatedList });
  };

  // Helper mappings
  const mapWorkType = (type) => {
    const mapping = {
      "Cleaning / सफाई": "cleaning",
      "Washing / कपड़े धोना": "washing",
      "Sweeping / झाड़ू लगाना, Mopping / पोछा लगाना": "sweeping_mopping",
      "Dish washing / बर्तन धोना": "dish_washing",
      "Dusting / सफाई": "dusting",
      "Ironing / कपड़े इस्त्री करना": "ironing",
      "Cooking / खाना बनाना": "cooking",
      "Elderly care / बुज़ुर्गों की देखभाल": "elderly_care",
      "Babysitting / बच्चों की देखभाल": "babysitting",
      Other: "other",
    };
    return mapping[type] || type;
  };

  const mapProblem = (problem) => {
    const mapping = {
      "Timing / टाइमिंग": "timing",
      "Absenteeism / छुट्टियाँ ज़्यादा": "absenteeism",
      "Payment confusion / पेमेंट की गड़बड़ी": "payment_confusion",
      "Finding replacement / रिप्लेसमेंट मुश्किल": "finding_replacement",
      "Communication / बातचीत की दिक्कत": "communication",
      Other: "other",
    };
    return mapping[problem] || problem;
  };

  const mapFindingMethod = (method) => {
    return method.toLowerCase().replace(/ /g, "_");
  };

  const mapConvincingFactor = (factor) => {
    const mapping = {
      "Background check / बैकग्राउंड चेक": "background_check",
      "Punctuality / समय पर आना": "punctuality",
      "Replacement guarantee / रिप्लेसमेंट गारंटी": "replacement_guarantee",
      "Customer support / मदद": "customer_support",
    };
    return mapping[factor] || factor;
  };

  const cleanPrice = (price) => {
    return price.replace(/[₹,]/g, "").replace(/–/g, "-");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      surveyor_name: formData.surveyorName,
      building_name: formData.buildingName,
      flat_number: formData.flatNumber,
      resident_name: formData.residentName,
      family_members: Number(formData.membersCount) || 0,
      maids_count: Number(formData.maidsCount) || 0,
      work_types: formData.workTypes.map(mapWorkType),
      work_duration: formData.workDuration,
      reliability_rating: Number(formData.reliabilityRating) || 0,
      problems_faced: formData.problems.map(mapProblem),
      preferred_time_slots: formData.timeSlots,
      monthly_payment_range: cleanPrice(formData.monthlyPayment),
      maid_source: formData.findingMethod.map(mapFindingMethod),
      app_openness: formData.appOpenness
        ? formData.appOpenness.toLowerCase()
        : "",
      convincing_factors: formData.convincingFactors.map(mapConvincingFactor),
      extra_payment: cleanPrice(formData.extraPayment),
      whatsapp_group_interest: formData.joinWhatsapp
        ? formData.joinWhatsapp.toLowerCase()
        : "",
      whatsapp_number: formData.whatsappNumber || "",
    };

    console.log("Submitting Survey Data:", payload);

    try {
      await createResidentSurvey(payload).unwrap();

      // Also save to local storage as backup
      const newSubmission = {
        ...formData,
        id: Date.now(),
        submittedAt: new Date().toISOString(),
      };
      const existingSubmissions = JSON.parse(
        localStorage.getItem("survey_submissions") || "[]",
      );
      localStorage.setItem(
        "survey_submissions",
        JSON.stringify([newSubmission, ...existingSubmissions]),
      );

      setIsSubmitted(true);
      toast.success("Survey submitted successfully!");
    } catch (error) {
      console.error("Failed to submit survey:", error);
      toast.error("Failed to submit survey. Please try again.");
    }
  };

  if (isSubmitted) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
        <p className="text-gray-600 mb-6">
          Your response has been recorded successfully.
        </p>
        <button
          onClick={() => {
            setIsSubmitted(false);
            setFormData({
              surveyorName: "",
              buildingName: "",
              flatNumber: "",
              residentName: "",
              membersCount: "",
              maidsCount: "",
              workTypes: [],
              workDuration: "",
              reliabilityRating: 0,
              problems: [],
              timeSlots: [],
              monthlyPayment: "",
              findingMethod: [],
              appOpenness: "",
              convincingFactors: [],
              extraPayment: "",
              joinWhatsapp: "",
              whatsappNumber: "",
            });
          }}
          className="text-primary font-medium hover:underline"
        >
          Submit another response
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-8 space-y-8">
      {/* Surveyor Info */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 border p-2 bg-yellow-100">
          Surveyor Info
        </h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Surveyor Name
          </label>
          <input
            type="text"
            name="surveyorName"
            required
            value={formData.surveyorName}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            placeholder="Enter surveyor name"
          />
        </div>
      </section>

      {/* Basic Info */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 border p-2 bg-yellow-100">
          Basic Info
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Building Name
            </label>
            <input
              type="text"
              name="buildingName"
              required
              value={formData.buildingName}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Flat Number
            </label>
            <input
              type="text"
              name="flatNumber"
              required
              value={formData.flatNumber}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Resident Name
            </label>
            <input
              type="text"
              name="residentName"
              required
              value={formData.residentName}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              How many members are present?
            </label>
            <input
              type="number"
              name="membersCount"
              value={formData.membersCount}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
        </div>
      </section>

      {/* Work Info */}
      <section className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900 border p-2 bg-yellow-100">
          Work Info
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            How many maids work for you? (आपके यहाँ कितनी कामवालियाँ हैं?)
          </label>
          <input
            type="number"
            name="maidsCount"
            value={formData.maidsCount}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What type of work do they do? (वे क्या काम करती हैं?)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              "Cleaning / सफाई",
              "Washing / कपड़े धोना",
              "Sweeping / झाड़ू लगाना, Mopping / पोछा लगाना",
              "Dish washing / बर्तन धोना",
              "Dusting / सफाई",
              "Ironing / कपड़े इस्त्री करना",
              "Cooking / खाना बनाना",
              "Elderly care / बुज़ुर्गों की देखभाल",
              "Babysitting / बच्चों की देखभाल",
              "Other",
            ].map((option) => (
              <label
                key={option}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  value={option}
                  checked={formData.workTypes.includes(option)}
                  onChange={(e) => handleCheckboxChange(e, "workTypes")}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <span className="text-sm text-gray-600">{option}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            How long have they worked with you? (वे आपके यहाँ कब से काम कर रही
            हैं?)
          </label>
          <div className="flex flex-wrap gap-4">
            {[
              "Less than 6 months",
              "6–12 months",
              "1–2 years",
              "More than 2 years",
            ].map((option) => (
              <label
                key={option}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="workDuration"
                  value={option}
                  checked={formData.workDuration === option}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                />
                <span className="text-sm text-gray-600">{option}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            How satisfied are you with their reliability? (1 = Least, 5 = Most)
          </label>
          <div className="flex gap-4">
            {[1, 2, 3, 4, 5].map((rating) => (
              <label
                key={rating}
                className="flex flex-col items-center cursor-pointer"
              >
                <input
                  type="radio"
                  name="reliabilityRating"
                  value={rating}
                  checked={Number(formData.reliabilityRating) === rating}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-primary border-gray-300 focus:ring-primary mb-1"
                />
                <span className="text-sm text-gray-600">{rating}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What problems do you face most often? (आपको कौन सी समस्याएँ आती
            हैं?)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              "Timing / टाइमिंग",
              "Absenteeism / छुट्टियाँ ज़्यादा",
              "Payment confusion / पेमेंट की गड़बड़ी",
              "Finding replacement / रिप्लेसमेंट मुश्किल",
              "Communication / बातचीत की दिक्कत",
              "Other",
            ].map((option) => (
              <label
                key={option}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  value={option}
                  checked={formData.problems.includes(option)}
                  onChange={(e) => handleCheckboxChange(e, "problems")}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <span className="text-sm text-gray-600">{option}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What are the time slots you prefer for work?
          </label>
          <div className="flex flex-wrap gap-4">
            {["7am-10am", "10am-12pm", "12pm-3pm"].map((option) => (
              <label
                key={option}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  value={option}
                  checked={formData.timeSlots.includes(option)}
                  onChange={(e) => handleCheckboxChange(e, "timeSlots")}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <span className="text-sm text-gray-600">{option}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            How much do you pay your maid(s) every month?
          </label>
          <div className="flex flex-wrap gap-4">
            {[
              "Below ₹1,000",
              "₹1,000–₹2,000",
              "₹2,000–₹3,000",
              "₹3,000–₹5,000",
              "₹5,000+",
            ].map((option) => (
              <label
                key={option}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="monthlyPayment"
                  value={option}
                  checked={formData.monthlyPayment === option}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                />
                <span className="text-sm text-gray-600">{option}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            How do you usually find new maids?
          </label>
          <div className="flex flex-wrap gap-4">
            {["Neighbors", "Security", "Word of mouth", "Online groups"].map(
              (option) => (
                <label
                  key={option}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    value={option}
                    checked={formData.findingMethod.includes(option)}
                    onChange={(e) => handleCheckboxChange(e, "findingMethod")}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <span className="text-sm text-gray-600">{option}</span>
                </label>
              ),
            )}
          </div>
        </div>
      </section>

      {/* Digital & Platform Openness */}
      <section className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900 border p-2 bg-yellow-100">
          Digital & Platform Openness
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Would you be open to using an app to manage your home help
            (attendance, payments, scheduling)?
          </label>
          <div className="flex gap-4">
            {["Yes", "No", "Maybe"].map((option) => (
              <label
                key={option}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="appOpenness"
                  value={option}
                  checked={formData.appOpenness === option}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                />
                <span className="text-sm text-gray-600">{option}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What would convince you most? (आपके लिए क्या सबसे ज़रूरी होगा?)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              "Background check / बैकग्राउंड चेक",
              "Punctuality / समय पर आना",
              "Replacement guarantee / रिप्लेसमेंट गारंटी",
              "Customer support / मदद",
            ].map((option) => (
              <label
                key={option}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  value={option}
                  checked={formData.convincingFactors.includes(option)}
                  onChange={(e) => handleCheckboxChange(e, "convincingFactors")}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <span className="text-sm text-gray-600">{option}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            How much extra would you pay monthly for reliable service?
          </label>
          <div className="flex flex-wrap gap-4">
            {["₹0–200", "₹200–500", "₹500+"].map((option) => (
              <label
                key={option}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="extraPayment"
                  value={option}
                  checked={formData.extraPayment === option}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                />
                <span className="text-sm text-gray-600">{option}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Would you be interested in joining a verified WhatsApp group for
            your building’s maids?
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="joinWhatsapp"
                value="Yes"
                checked={formData.joinWhatsapp === "Yes"}
                onChange={handleInputChange}
                className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
              />
              <span className="text-sm text-gray-600">Yes</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="joinWhatsapp"
                value="No"
                checked={formData.joinWhatsapp === "No"}
                onChange={handleInputChange}
                className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
              />
              <span className="text-sm text-gray-600">No</span>
            </label>
          </div>
          {formData.joinWhatsapp === "Yes" && (
            <input
              type="text"
              name="whatsappNumber"
              value={formData.whatsappNumber}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              placeholder="Enter WhatsApp Phone Number"
            />
          )}
        </div>
      </section>

      {/* Submit Button */}
      <div className="pt-6 border-t border-gray-100">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send size={20} />
              Submit Survey
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default ResidentSurveyForm;
