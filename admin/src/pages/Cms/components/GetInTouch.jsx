import React, { useEffect, useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "react-hot-toast";
import apiClient from "../../../api/client";

const GetInTouch = () => {
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      short_heading: "",
      heading: "",
      description: "",
      btn_name: "",
      email_title: "",
      email_subtitle: "",
      emails: [{ value: "" }],
      visit_title: "",
      visit_location: "",
      visit_address: "",
      call_title: "",
      call_timing: "",
      phone_numbers: [{ value: "" }],
      whatsapp_title: "",
      whatsapp_numbers: [{ value: "" }],
      is_active: true,
    },
  });

  const {
    fields: emailFields,
    append: appendEmail,
    remove: removeEmail,
  } = useFieldArray({
    control,
    name: "emails",
  });

  const {
    fields: phoneFields,
    append: appendPhone,
    remove: removePhone,
  } = useFieldArray({
    control,
    name: "phone_numbers",
  });

  const {
    fields: whatsappFields,
    append: appendWhatsapp,
    remove: removeWhatsapp,
  } = useFieldArray({
    control,
    name: "whatsapp_numbers",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.get("/api/cms/contact");
        if (response.data.success) {
          const responseData = response.data.data;
          let data = responseData;

          // Handle array response if API returns [ { ... } ]
          if (Array.isArray(responseData) && responseData.length > 0) {
            data = responseData[0];
          }

          if (data && Object.keys(data).length > 0) {
            setIsEditing(true);

            // Helper to map flat array ["a", "b"] to form array [{value: "a"}, {value: "b"}]
            const toFormArray = (arr) => {
              if (Array.isArray(arr) && arr.length > 0) {
                return arr.map((item) => ({ value: item }));
              }
              return [{ value: "" }];
            };

            reset({
              short_heading: data.short_heading || "",
              heading: data.heading || "",
              description: data.description || "",
              btn_name: data.btn_name || "",
              email_title: data.email_title || "",
              email_subtitle: data.email_subtitle || "",
              visit_title: data.visit_title || "",
              visit_location: data.visit_location || "",
              visit_address: data.visit_address || "",
              call_title: data.call_title || "",
              call_timing: data.call_timing || "",
              whatsapp_title: data.whatsapp_title || "",
              is_active: Boolean(data.is_active),
              emails: toFormArray(data.emails),
              phone_numbers: toFormArray(data.phone_numbers || data.phones), // Handle both keys if API varies
              whatsapp_numbers: toFormArray(data.whatsapp_numbers),
            });
          }
        }
      } catch (error) {
        console.error("Error fetching contact data:", error);
        if (error.response?.status !== 404) {
          toast.error("Failed to load contact configuration");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [reset]);

  const onSubmit = async (data) => {
    try {
      // Transform form data back to API structure
      const payload = {
        ...data,
        is_active: data.is_active,
        emails: data.emails.map((e) => e.value).filter(Boolean),
        phone_numbers: data.phone_numbers.map((p) => p.value).filter(Boolean),
        whatsapp_numbers: data.whatsapp_numbers
          .map((w) => w.value)
          .filter(Boolean),
      };

      // Remove form-specific array fields to avoid sending them if not needed
      // (though usually harmless, it's cleaner to send only what API expects)
      // but ...data spreads them, so they are there. The API likely ignores extra fields
      // or we can explicitly construct the object.
      // Let's rely on the explicit overwrites above for the arrays.

      // Map to API:
      // - POST /api/cms/contact for create
      // - PUT  /api/cms/contact for update
      const url = "/api/cms/contact";
      const method = isEditing ? "put" : "post";
      const apiCall = apiClient[method](url, payload);

      const response = await apiCall;
      if (response.data.success) {
        toast.success(
          `Contact section ${isEditing ? "updated" : "created"} successfully`,
        );

        const updatedData = response.data.data;
        let newData = updatedData;
        if (Array.isArray(updatedData) && updatedData.length > 0) {
          newData = updatedData[0];
        }

        if (newData) {
          setIsEditing(true);

          const toFormArray = (arr) => {
            if (Array.isArray(arr) && arr.length > 0) {
              return arr.map((item) => ({ value: item }));
            }
            return [{ value: "" }];
          };

          reset({
            short_heading: newData.short_heading || "",
            heading: newData.heading || "",
            description: newData.description || "",
            btn_name: newData.btn_name || "",
            email_title: newData.email_title || "",
            email_subtitle: newData.email_subtitle || "",
            visit_title: newData.visit_title || "",
            visit_location: newData.visit_location || "",
            visit_address: newData.visit_address || "",
            call_title: newData.call_title || "",
            call_timing: newData.call_timing || "",
            whatsapp_title: newData.whatsapp_title || "",
            is_active: Boolean(newData.is_active),
            emails: toFormArray(newData.emails),
            phone_numbers: toFormArray(newData.phone_numbers || newData.phones),
            whatsapp_numbers: toFormArray(newData.whatsapp_numbers),
          });
        }
      } else {
        toast.error(response.data.message || "Failed to update");
      }
    } catch (error) {
      console.error("Error updating contact section:", error);
      toast.error(
        error.response?.data?.message || "Failed to update contact section",
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-900" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">
            Get in Touch
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            Configure contact information
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-neutral-700">
              Section Status
            </label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                {...register("is_active")}
                className="w-4 h-4 text-neutral-900 border-gray-300 rounded focus:ring-neutral-900"
              />
              <label htmlFor="is_active" className="text-sm text-neutral-600">
                Active
              </label>
            </div>
          </div>
        </div>

        <div className="grid gap-2">
          <label
            htmlFor="short_heading"
            className="text-sm font-medium text-neutral-700"
          >
            Short Heading
          </label>
          <input
            type="text"
            id="short_heading"
            {...register("short_heading")}
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-neutral-300 rounded-lg 
                     focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                     transition-shadow placeholder:text-neutral-400"
            placeholder="e.g., Contact Us"
          />
        </div>

        <div className="grid gap-2">
          <label
            htmlFor="heading"
            className="text-sm font-medium text-neutral-700"
          >
            Heading
          </label>
          <input
            type="text"
            id="heading"
            {...register("heading")}
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-neutral-300 rounded-lg 
                     focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                     transition-shadow placeholder:text-neutral-400"
            placeholder="Enter main heading"
          />
        </div>

        <div className="grid gap-2">
          <label
            htmlFor="description"
            className="text-sm font-medium text-neutral-700"
          >
            Description
          </label>
          <textarea
            id="description"
            rows="4"
            {...register("description")}
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-neutral-300 rounded-lg 
                     focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                     transition-shadow placeholder:text-neutral-400 resize-none"
            placeholder="Enter contact section description"
          />
        </div>

        <div className="grid gap-2">
          <label
            htmlFor="btn_name"
            className="text-sm font-medium text-neutral-700"
          >
            Button Name
          </label>
          <input
            type="text"
            id="btn_name"
            {...register("btn_name")}
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-neutral-300 rounded-lg 
                     focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                     transition-shadow placeholder:text-neutral-400"
            placeholder="e.g., Send Message"
          />
        </div>

        {/* Email Section */}
        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
          <h3 className="text-sm font-medium text-neutral-900 mb-4">Email</h3>

          <div className="space-y-3 mb-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-xs font-medium text-neutral-600">
                  Title
                </label>
                <input
                  type="text"
                  {...register("email_title")}
                  className="w-full px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg 
                           focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                           transition-shadow placeholder:text-neutral-400"
                  placeholder="e.g., Email Us"
                />
              </div>

              <div className="grid gap-2">
                <label className="text-xs font-medium text-neutral-600">
                  Subtitle
                </label>
                <input
                  type="text"
                  {...register("email_subtitle")}
                  className="w-full px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg 
                           focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                           transition-shadow placeholder:text-neutral-400"
                  placeholder="e.g., We'll respond within 24 hours"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-neutral-600">
                Email Addresses
              </label>
              <button
                type="button"
                onClick={() => appendEmail({ value: "" })}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium 
                         text-neutral-700 bg-white border border-neutral-300 rounded 
                         hover:bg-neutral-50 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>

            {emailFields.map((field, index) => (
              <div key={field.id} className="flex gap-2">
                <input
                  type="email"
                  {...register(`emails.${index}.value`)}
                  className="flex-1 px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg 
                           focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                           transition-shadow placeholder:text-neutral-400"
                  placeholder="email@example.com"
                />
                {emailFields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeEmail(index)}
                    className="p-2 text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Visit Us Section */}
        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
          <h3 className="text-sm font-medium text-neutral-900 mb-4">
            Visit Us
          </h3>

          <div className="space-y-3">
            <div className="grid gap-2">
              <label className="text-xs font-medium text-neutral-600">
                Title
              </label>
              <input
                type="text"
                {...register("visit_title")}
                className="w-full px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg 
                         focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                         transition-shadow placeholder:text-neutral-400"
                placeholder="e.g., Our Office"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-medium text-neutral-600">
                Location
              </label>
              <input
                type="text"
                {...register("visit_location")}
                className="w-full px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg 
                         focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                         transition-shadow placeholder:text-neutral-400"
                placeholder="e.g., New York, USA"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-medium text-neutral-600">
                Address
              </label>
              <textarea
                rows="3"
                {...register("visit_address")}
                className="w-full px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg 
                         focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                         transition-shadow placeholder:text-neutral-400 resize-none"
                placeholder="Enter full address"
              />
            </div>
          </div>
        </div>

        {/* Call Us Section */}
        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
          <h3 className="text-sm font-medium text-neutral-900 mb-4">Call Us</h3>

          <div className="space-y-3 mb-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-xs font-medium text-neutral-600">
                  Title
                </label>
                <input
                  type="text"
                  {...register("call_title")}
                  className="w-full px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg 
                           focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                           transition-shadow placeholder:text-neutral-400"
                  placeholder="e.g., Phone Support"
                />
              </div>

              <div className="grid gap-2">
                <label className="text-xs font-medium text-neutral-600">
                  Timing
                </label>
                <input
                  type="text"
                  {...register("call_timing")}
                  className="w-full px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg 
                           focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                           transition-shadow placeholder:text-neutral-400"
                  placeholder="e.g., Mon-Fri, 9AM-6PM"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-neutral-600">
                Phone Numbers
              </label>
              <button
                type="button"
                onClick={() => appendPhone({ value: "" })}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium 
                         text-neutral-700 bg-white border border-neutral-300 rounded 
                         hover:bg-neutral-50 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>

            {phoneFields.map((field, index) => (
              <div key={field.id} className="flex gap-2">
                <input
                  type="tel"
                  {...register(`phone_numbers.${index}.value`)}
                  className="flex-1 px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg 
                           focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                           transition-shadow placeholder:text-neutral-400"
                  placeholder="+1 (555) 000-0000"
                />
                {phoneFields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePhone(index)}
                    className="p-2 text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* WhatsApp Section */}
        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
          <h3 className="text-sm font-medium text-neutral-900 mb-4">
            WhatsApp
          </h3>

          <div className="space-y-2">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-medium text-neutral-600">
                Title
              </label>
            </div>

            <input
              type="text"
              {...register("whatsapp_title")}
              className="w-full px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg 
                       focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                       transition-shadow placeholder:text-neutral-400 mb-3"
              placeholder="e.g., WhatsApp Support"
            />

            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-neutral-600">
                WhatsApp Numbers
              </label>
              <button
                type="button"
                onClick={() => appendWhatsapp({ value: "" })}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium 
                         text-neutral-700 bg-white border border-neutral-300 rounded 
                         hover:bg-neutral-50 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>

            {whatsappFields.map((field, index) => (
              <div key={field.id} className="flex gap-2">
                <input
                  type="tel"
                  {...register(`whatsapp_numbers.${index}.value`)}
                  className="flex-1 px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg 
                           focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                           transition-shadow placeholder:text-neutral-400"
                  placeholder="+1 (555) 000-0000"
                />
                {whatsappFields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeWhatsapp(index)}
                    className="p-2 text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-neutral-200">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 text-sm font-medium text-white bg-neutral-900 rounded-lg 
                     hover:bg-neutral-800 transition-colors focus:outline-none focus:ring-2 
                     focus:ring-neutral-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};

export default GetInTouch;
