import React, { useState } from "react";
import { Send, Loader2, Check } from "lucide-react";
import toast from "react-hot-toast";
import { useCreateMaidSurveyMutation } from "../../api/apiSlice";

const MaidSurveyForm = () => {
  const [createMaidSurvey, { isLoading }] = useCreateMaidSurveyMutation();
  const [formData, setFormData] = useState({
    supervisor_name: "",
    maid_name: "",
    age: "",
    mobile_number: "",
    address: "",
    houses_count: "",
    buildings_count: "",
    family_members: "",
    only_earning_member: "",
    has_children: "",
    children_school: "",
    work_types: [],
    daily_work_hours: "",
    area_experience: "",
    charge_per_house: "",
    monthly_income: "",
    paid_on_time: "",
    holidays: "",
    paid_leave: "",
    has_smartphone: "",
    uses_whatsapp: "",
    uses_online_payment: "",
    salary_online: "",
    interested_extra_work_app: "",
    work_priority: [],
    feels_safe: "",
    interested_in_benefits: "",
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Convert numeric fields
    const payload = {
      ...formData,
      age: Number(formData.age) || 0,
      houses_count: Number(formData.houses_count) || 0,
      buildings_count: Number(formData.buildings_count) || 0,
      family_members: Number(formData.family_members) || 0,
      daily_work_hours: Number(formData.daily_work_hours) || 0,
      monthly_income: Number(formData.monthly_income) || 0,
    };

    console.log("Submitting Maid Survey Data:", payload);

    try {
      await createMaidSurvey(payload).unwrap();
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
              supervisor_name: "",
              maid_name: "",
              age: "",
              mobile_number: "",
              address: "",
              houses_count: "",
              buildings_count: "",
              family_members: "",
              only_earning_member: "",
              has_children: "",
              children_school: "",
              work_types: [],
              daily_work_hours: "",
              area_experience: "",
              charge_per_house: "",
              monthly_income: "",
              paid_on_time: "",
              holidays: "",
              paid_leave: "",
              has_smartphone: "",
              uses_whatsapp: "",
              uses_online_payment: "",
              salary_online: "",
              interested_extra_work_app: "",
              work_priority: [],
              feels_safe: "",
              interested_in_benefits: "",
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
      {/* Supervisor Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Supervisor Name
        </label>
        <input
          type="text"
          name="supervisor_name"
          required
          value={formData.supervisor_name}
          onChange={handleInputChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          placeholder="Enter supervisor name"
        />
      </div>

      {/* Basic Details */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 border p-2 bg-yellow-100">
          Basic Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Maid Name
            </label>
            <input
              type="text"
              name="maid_name"
              required
              value={formData.maid_name}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Age
            </label>
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mobile Number
            </label>
            <input
              type="tel"
              name="mobile_number"
              required
              value={formData.mobile_number}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Maid residential address
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              rows={1}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              How many houses do you currently work in? (आप अभी कितने घरों में
              काम करते हैं?)
            </label>
            <input
              type="number"
              name="houses_count"
              value={formData.houses_count}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              How many buildings do you currently work in? (आप अभी कितनी
              बिल्डिंग्स में काम करते हैं?)
            </label>
            <input
              type="number"
              name="buildings_count"
              value={formData.buildings_count}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              How many people are there in your family? (आपके परिवार में कितने
              सदस्य हैं?)
            </label>
            <input
              type="number"
              name="family_members"
              value={formData.family_members}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
        </div>

        {/* Yes/No Questions */}
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Are you the only earning member in your family? (क्या आपके परिवार
              में सिर्फ़ आप ही कमाने वाली हैं?)
            </label>
            <div className="flex gap-4">
              {["Yes", "No"].map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="only_earning_member"
                    value={option}
                    checked={formData.only_earning_member === option}
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
              Do you have children? (क्या आपके बच्चे हैं?)
            </label>
            <div className="flex gap-4">
              {["Yes", "No"].map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="has_children"
                    value={option}
                    checked={formData.has_children === option}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                  />
                  <span className="text-sm text-gray-600">{option}</span>
                </label>
              ))}
            </div>
          </div>

          {formData.has_children === "Yes" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Are your children going to school? (क्या आपके बच्चे स्कूल जाते
                हैं?)
              </label>
              <div className="flex gap-4">
                {[
                  { label: "Yes", value: "Yes" },
                  { label: "No", value: "No" },
                  { label: "Some do (कुछ जाते हैं)", value: "Some do" },
                ].map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="children_school"
                      value={option.value}
                      checked={formData.children_school === option.value}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                    />
                    <span className="text-sm text-gray-600">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Type of Work */}
      <section className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900 border p-2 bg-yellow-100">
          Type of Work (काम का प्रकार)
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What type of work do you do? (आप कौन-कौन सा काम करती हैं?)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { label: "Jhadu (Sweeping) / झाड़ू", value: "Sweeping" },
              { label: "Pocha (Mopping) / पोछा", value: "Mopping" },
              { label: "Bartan (Washing utensils) / बर्तन", value: "Utensils" },
              { label: "Kapde (Laundry) / कपड़े धोना", value: "Laundry" },
              { label: "Ironing / इस्त्री", value: "Ironing" },
              { label: "Cooking / खाना बनाना", value: "Cooking" },
              { label: "Dusting / सफाई", value: "Dusting" },
              { label: "Babysitting / बच्चों की देखभाल", value: "Babysitting" },
              {
                label: "8 hours / 8 घंटे (एक घर में 8 घंटे)",
                value: "8 hours",
              },
            ].map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  value={option.value}
                  checked={formData.work_types.includes(option.value)}
                  onChange={(e) => handleCheckboxChange(e, "work_types")}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <span className="text-sm text-gray-600">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              How many hours do you work everyday? (आप हर दिन कितने घंटे काम
              करते हैं?)
            </label>
            <input
              type="text"
              name="daily_work_hours"
              value={formData.daily_work_hours}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            How long have you been working in this area? (आप इस बिल्डिंग/एरिया
            में कब से काम कर रही हैं?)
          </label>
          <div className="flex flex-wrap gap-4">
            {[
              {
                label: "Less than 6 months (6 महीने से कम)",
                value: "Less than 6 months",
              },
              {
                label: "6 months – 2 years (6 महीने – 2 साल)",
                value: "6 months – 2 years",
              },
              {
                label: "More than 2 years (2 साल से ज़्यादा)",
                value: "More than 2 years",
              },
            ].map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="area_experience"
                  value={option.value}
                  checked={formData.area_experience === option.value}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                />
                <span className="text-sm text-gray-600">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* Work & Payment */}
      <section className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900 border p-2 bg-yellow-100">
          Work & Payment (काम और पेमेंट)
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            How much do you charge per house (average)? (आप हर घर से औसतन कितने
            पैसे लेती हैं?)
          </label>
          <div className="flex flex-wrap gap-4">
            {[
              { label: "₹500–1000", value: "500-1000" },
              { label: "₹1000–2000", value: "1000-2000" },
              { label: "₹2000–3000", value: "2000-3000" },
              { label: "₹3000–4000", value: "3000-4000" },
              { label: "₹4000-5000+", value: "4000-5000+" },
            ].map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="charge_per_house"
                  value={option.value}
                  checked={formData.charge_per_house === option.value}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                />
                <span className="text-sm text-gray-600">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            How much do you earn per month (आप हर महीने कितना कमाते हैं?)
          </label>
          <input
            type="text"
            name="monthly_income"
            value={formData.monthly_income}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Do you get paid on time every month? (क्या आपको हर महीने समय पर पैसे
            मिलते हैं?)
          </label>
          <div className="flex gap-4">
            {["Yes", "No", "Other"].map((option) => (
              <label
                key={option}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="paid_on_time"
                  value={option}
                  checked={formData.paid_on_time === option}
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
            Do you get any holidays? (क्या आपको छुट्टी मिलती है?)
          </label>
          <div className="flex flex-wrap gap-4">
            {[
              { label: "Yes, 1 day per month", value: "Yes, 1 day per month" },
              {
                label: "Only if I ask (सिर्फ़ जब मैं माँगती हूँ)",
                value: "Only if I ask",
              },
              { label: "Rarely (कभी-कभी ही)", value: "Rarely" },
              { label: "Festivals", value: "Festivals" },
            ].map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="holidays"
                  value={option.value}
                  checked={formData.holidays === option.value}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                />
                <span className="text-sm text-gray-600">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            If you miss work due to illness or family issue, are you paid? (अगर
            आप बीमार हों या छुट्टी लें तो क्या आपको पैसे मिलते हैं?)
          </label>
          <div className="flex gap-4">
            {["Yes", "No", "Maybe"].map((option) => (
              <label
                key={option}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="paid_leave"
                  value={option}
                  checked={formData.paid_leave === option}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                />
                <span className="text-sm text-gray-600">{option}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* Digital & Platform Openness */}
      <section className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900 border p-2 bg-yellow-100">
          Digital & Platform Openness (डिजिटल और ऐप उपयोग)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Do you have a smartphone? (क्या आपके पास स्मार्टफोन है?)
            </label>
            <div className="flex gap-4">
              {["Yes", "No"].map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="has_smartphone"
                    value={option}
                    checked={formData.has_smartphone === option}
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
              Do you use WhatsApp? (क्या आप WhatsApp इस्तेमाल करती हैं?)
            </label>
            <div className="flex gap-4">
              {["Yes", "No"].map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="uses_whatsapp"
                    value={option}
                    checked={formData.uses_whatsapp === option}
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
              Do you know how to use Google Pay / PhonePe / Paytm? (क्या आप
              जानते हैं कि Google Pay / PhonePe / Paytm का इस्तेमाल कैसे करते
              हैं?)
            </label>
            <div className="flex gap-4">
              {["Yes", "No"].map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="uses_online_payment"
                    value={option}
                    checked={formData.uses_online_payment === option}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                  />
                  <span className="text-sm text-gray-600">{option}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Would you like to get your salary online directly to your account?
            (क्या आप चाहेंगी कि आपकी सैलरी सीधे आपके बैंक अकाउंट में आए?)
          </label>
          <div className="flex flex-wrap gap-4">
            {[
              { label: "Yes, it’s easier (हाँ, आसान है)", value: "Yes" },
              { label: "No, prefer cash (नहीं, नकद पसंद है)", value: "No" },
            ].map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="salary_online"
                  value={option.value}
                  checked={formData.salary_online === option.value}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                />
                <span className="text-sm text-gray-600">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            If there was an app that helped you find extra houses to work in,
            would you be interested? (अगर एक ऐप हो जो आपको नया काम दिलाने में
            मदद करे, तो क्या आप उसमें दिलचस्पी लेंगी?)
          </label>
          <div className="flex gap-4">
            {["Yes", "No", "Maybe"].map((option) => (
              <label
                key={option}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="interested_extra_work_app"
                  value={option}
                  checked={formData.interested_extra_work_app === option}
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
            What is most important for you at work? (आपके लिए काम में सबसे
            ज़रूरी क्या है?)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { label: "Respect (सम्मान)", value: "Respect" },
              {
                label: "Regular payment (नियमित पेमेंट)",
                value: "Regular Payment",
              },
              { label: "Less stress (कम तनाव)", value: "Less Stress" },
              { label: "Safety (सुरक्षा)", value: "Safety" },
              {
                label: "Good communication (अच्छी बात-चीत)",
                value: "Good Communication",
              },
              { label: "Other", value: "Other" },
            ].map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  value={option.value}
                  checked={formData.work_priority.includes(option.value)}
                  onChange={(e) => handleCheckboxChange(e, "work_priority")}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <span className="text-sm text-gray-600">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Do you feel safe working in all the houses? Do residents treat you
            well (क्या आपको सभी घरों में काम करते हुए सुरक्षित महसूस होता है?)
          </label>
          <div className="flex gap-4">
            {["Yes", "No"].map((option) => (
              <label
                key={option}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="feels_safe"
                  value={option}
                  checked={formData.feels_safe === option}
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
            If you got access to benefits like health checkups, savings plans,
            or small loans through the app, would you be interested? (अगर आपको
            ऐप के ज़रिए स्वास्थ्य जांच, बचत योजना या छोटे लोन जैसी सुविधाएँ
            मिलें, तो क्या आप दिलचस्पी लेंगी?)
          </label>
          <div className="flex gap-4">
            {["Yes", "No", "Maybe"].map((option) => (
              <label
                key={option}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="interested_in_benefits"
                  value={option}
                  checked={formData.interested_in_benefits === option}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                />
                <span className="text-sm text-gray-600">{option}</span>
              </label>
            ))}
          </div>
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

export default MaidSurveyForm;
