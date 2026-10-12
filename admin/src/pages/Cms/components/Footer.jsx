       
       import React, { useEffect, useState, useCallback } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { Plus, X, Upload } from "lucide-react";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import apiClient from "../../../api/client";
import { getImageUrl } from "../../../utils/imageUrl";

const ImageUpload = ({ control, name, label, className }) => {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value } }) => {
        const [preview, setPreview] = useState("");

        useEffect(() => {
          if (value instanceof File) {
            setPreview(URL.createObjectURL(value));
          } else if (typeof value === "string" && value) {
            setPreview(getImageUrl(value));
          } else {
            setPreview("");
          }
        }, [value]);

        const onDrop = useCallback(
          (acceptedFiles) => {
            if (acceptedFiles?.length > 0) {
              onChange(acceptedFiles[0]);
            }
          },
          [onChange],
        );

        const { getRootProps, getInputProps, isDragActive } = useDropzone({
          onDrop,
          accept: { "image/*": [] },
          multiple: false,
        });

        const removeImage = (e) => {
          e.stopPropagation();
          onChange(null);
          setPreview("");
        };

        return (
          <div className={`space-y-2 ${className}`}>
            <label className="text-xs font-medium text-neutral-600">
              {label}
            </label>
            <div
              {...getRootProps()}
              className={`relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors h-32 flex flex-col items-center justify-center
                ${
                  isDragActive
                    ? "border-neutral-900 bg-neutral-50"
                    : "border-neutral-300 hover:border-neutral-400"
                }`}
            >
              <input {...getInputProps()} />
              {preview ? (
                <div className="relative w-full h-full">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-full object-contain rounded"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 p-1 bg-white rounded-full shadow-md hover:bg-neutral-100"
                  >
                    <X className="w-4 h-4 text-neutral-500" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-neutral-400 mb-2" />
                  <p className="text-xs text-neutral-500">
                    {isDragActive ? "Drop image here" : "Click or drop image"}
                  </p>
                </>
              )}
            </div>
          </div>
        );
      }}
    />
  );
};

const Footer = () => {
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
      company_logo: "",
      newsletter_heading: "",
      newsletter_description: "",
      company_name: "",
      company_description: "",
      company_registration_number: "",
      registered_address_title: "",
      registered_address: "",
      support_email: "",
      contact_email: "",
      contact_location: "",
      instagram_url: "",
      facebook_url: "",
      linkedin_url: "",
      twitter_url: "",
      copyright_text: "",
      copyright_year: new Date().getFullYear(),
      company_links: [],
      service_links: [],
      footer_links: [],
      is_active: true,
    },
  });

  const {
    fields: companyLinksFields,
    append: appendCompanyLink,
    remove: removeCompanyLink,
  } = useFieldArray({
    control,
    name: "company_links",
  });

  const {
    fields: serviceLinksFields,
    append: appendServiceLink,
    remove: removeServiceLink,
  } = useFieldArray({
    control,
    name: "service_links",
  });

  const {
    fields: footerLinksFields,
    append: appendFooterLink,
    remove: removeFooterLink,
  } = useFieldArray({
    control,
    name: "footer_links",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.get("/api/cms/footer");
        if (response.data.success) {
          const responseData = response.data.data;
          let data = responseData;

          // Handle array response if API returns [ { ... } ]
          if (Array.isArray(responseData) && responseData.length > 0) {
            data = responseData[0];
          }

          if (data && Object.keys(data).length > 0) {
            setIsEditing(true);
            reset({
              ...data,
              is_active: Boolean(data.is_active),
              // Ensure arrays are at least empty arrays if null
              company_links: data.company_links || [],
              service_links: data.service_links || [],
              footer_links: data.footer_links || [],
            });
          }
        }
      } catch (error) {
        console.error("Error fetching footer data:", error);
        toast.error("Failed to load footer configuration");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [reset]);

  const onSubmit = async (data) => {
    try {
      const formData = new FormData();

      const simpleFields = [
        "newsletter_heading",
        "newsletter_description",
        "company_name",
        "company_description",
        "company_registration_number",
        "registered_address_title",
        "registered_address",
        "support_email",
        "contact_email",
        "contact_location",
        "instagram_url",
        "facebook_url",
        "linkedin_url",
        "twitter_url",
        "copyright_text",
        "copyright_year",
      ];

      simpleFields.forEach((field) => {
        formData.append(field, data[field] || "");
      });

      formData.append("is_active", data.is_active ? "1" : "0");

      if (data.company_logo instanceof File) {
        formData.append("company_logo", data.company_logo);
      }

      // Handle arrays
      ["company_links", "service_links", "footer_links"].forEach(
        (arrayName) => {
          if (data[arrayName] && Array.isArray(data[arrayName])) {
            data[arrayName].forEach((item, index) => {
              formData.append(
                `${arrayName}[${index}][label]`,
                item.label || "",
              );
              formData.append(`${arrayName}[${index}][url]`, item.url || "");
            });
          }
        },
      );

      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      };

      const apiCall = apiClient.post("/api/cms/footer", formData, config);

      const response = await apiCall;
      if (response.data.success) {
        toast.success(
          `Footer configuration ${isEditing ? "updated" : "created"} successfully`,
        );
        const updatedData = response.data.data;
        let newData = updatedData;
        if (Array.isArray(updatedData) && updatedData.length > 0) {
          newData = updatedData[0];
        }

        if (newData) {
          setIsEditing(true);
          reset({
            ...newData,
            is_active: Boolean(newData.is_active),
            company_links: newData.company_links || [],
            service_links: newData.service_links || [],
            footer_links: newData.footer_links || [],
          });
        }
      } else {
        toast.error(response.data.message || "Failed to update");
      }
    } catch (error) {
      console.error("Error updating footer:", error);
      toast.error(
        error.response?.data?.message ||
          "Failed to update footer configuration",
      );
    }
  };

  const renderLinkSection = (title, fields, append, remove, fieldName) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-neutral-700">{title}</label>
        <button
          type="button"
          onClick={() => append({ label: "", url: "" })}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium 
                   text-neutral-700 bg-white border border-neutral-300 rounded-lg 
                   hover:bg-neutral-50 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Link
        </button>
      </div>
      <div className="space-y-4">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg"
          >
            <div className="flex items-start justify-between mb-4">
              <span className="text-xs font-medium text-neutral-500">
                Link {index + 1}
              </span>
              <button
                type="button"
                onClick={() => remove(index)}
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-xs font-medium text-neutral-600">
                  Label
                </label>
                <input
                  type="text"
                  {...register(`${fieldName}.${index}.label`)}
                  className="w-full px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg 
                           focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                           transition-shadow placeholder:text-neutral-400"
                  placeholder="Link label"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-medium text-neutral-600">
                  URL
                </label>
                <input
                  type="text"
                  {...register(`${fieldName}.${index}.url`)}
                  className="w-full px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg 
                           focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                           transition-shadow placeholder:text-neutral-400"
                  placeholder="Link URL"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-neutral-900"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl">
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-neutral-900">
          Footer Configuration
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          Manage footer content, links, and company information
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Newsletter Section */}
        <div className="space-y-4 border-b border-neutral-200 pb-8">
          <h3 className="text-lg font-medium text-neutral-900">Newsletter</h3>
          <div className="grid grid-cols-1 gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-neutral-700">
                Heading
              </label>
              <input
                type="text"
                {...register("newsletter_heading")}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-neutral-300 rounded-lg 
                         focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                         transition-shadow placeholder:text-neutral-400"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-neutral-700">
                Description
              </label>
              <textarea
                {...register("newsletter_description")}
                rows="2"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-neutral-300 rounded-lg 
                         focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                         transition-shadow placeholder:text-neutral-400 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Company Info */}
        <div className="space-y-4 border-b border-neutral-200 pb-8">
          <h3 className="text-lg font-medium text-neutral-900">
            Company Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <ImageUpload
                control={control}
                name="company_logo"
                label="Company Logo"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-neutral-700">
                Company Name
              </label>
              <input
                type="text"
                {...register("company_name")}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-neutral-300 rounded-lg 
                         focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                         transition-shadow placeholder:text-neutral-400"
              />
            </div>
            <div className="md:col-span-2 grid gap-2">
              <label className="text-sm font-medium text-neutral-700">
                Description
              </label>
              <textarea
                {...register("company_description")}
                rows="3"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-neutral-300 rounded-lg 
                         focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                         transition-shadow placeholder:text-neutral-400 resize-none"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-neutral-700">
                Registration Number
              </label>
              <input
                type="text"
                {...register("company_registration_number")}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-neutral-300 rounded-lg 
                         focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                         transition-shadow placeholder:text-neutral-400"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-neutral-700">
                Address Title
              </label>
              <input
                type="text"
                {...register("registered_address_title")}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-neutral-300 rounded-lg 
                         focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                         transition-shadow placeholder:text-neutral-400"
              />
            </div>
            <div className="md:col-span-2 grid gap-2">
              <label className="text-sm font-medium text-neutral-700">
                Registered Address
              </label>
              <textarea
                {...register("registered_address")}
                rows="3"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-neutral-300 rounded-lg 
                         focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                         transition-shadow placeholder:text-neutral-400 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-4 border-b border-neutral-200 pb-8">
          <h3 className="text-lg font-medium text-neutral-900">
            Contact Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-neutral-700">
                Support Email
              </label>
              <input
                type="email"
                {...register("support_email")}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-neutral-300 rounded-lg 
                         focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                         transition-shadow placeholder:text-neutral-400"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-neutral-700">
                Contact Email
              </label>
              <input
                type="email"
                {...register("contact_email")}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-neutral-300 rounded-lg 
                         focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                         transition-shadow placeholder:text-neutral-400"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-neutral-700">
                Location
              </label>
              <input
                type="text"
                {...register("contact_location")}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-neutral-300 rounded-lg 
                         focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                         transition-shadow placeholder:text-neutral-400"
              />
            </div>
          </div>
        </div>

        {/* Social Media */}
        <div className="space-y-4 border-b border-neutral-200 pb-8">
          <h3 className="text-lg font-medium text-neutral-900">Social Media</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-neutral-700">
                Instagram URL
              </label>
              <input
                type="text"
                {...register("instagram_url")}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-neutral-300 rounded-lg 
                         focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                         transition-shadow placeholder:text-neutral-400"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-neutral-700">
                Facebook URL
              </label>
              <input
                type="text"
                {...register("facebook_url")}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-neutral-300 rounded-lg 
                         focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                         transition-shadow placeholder:text-neutral-400"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-neutral-700">
                LinkedIn URL
              </label>
              <input
                type="text"
                {...register("linkedin_url")}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-neutral-300 rounded-lg 
                         focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                         transition-shadow placeholder:text-neutral-400"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-neutral-700">
                Twitter URL
              </label>
              <input
                type="text"
                {...register("twitter_url")}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-neutral-300 rounded-lg 
                         focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                         transition-shadow placeholder:text-neutral-400"
              />
            </div>
          </div>
        </div>

        {/* Links Sections */}
        <div className="space-y-8 border-b border-neutral-200 pb-8">
          <h3 className="text-lg font-medium text-neutral-900">
            Links Management
          </h3>
          {renderLinkSection(
            "Company Links",
            companyLinksFields,
            appendCompanyLink,
            removeCompanyLink,
            "company_links",
          )}
          {renderLinkSection(
            "Service Links",
            serviceLinksFields,
            appendServiceLink,
            removeServiceLink,
            "service_links",
          )}
          {renderLinkSection(
            "Footer Links (Legal)",
            footerLinksFields,
            appendFooterLink,
            removeFooterLink,
            "footer_links",
          )}
        </div>

        {/* Copyright & Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-neutral-900">
            Copyright & Settings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 grid gap-2">
              <label className="text-sm font-medium text-neutral-700">
                Copyright Text
              </label>
              <input
                type="text"
                {...register("copyright_text")}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-neutral-300 rounded-lg 
                         focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                         transition-shadow placeholder:text-neutral-400"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-neutral-700">
                Copyright Year
              </label>
              <input
                type="number"
                {...register("copyright_year")}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-neutral-300 rounded-lg 
                         focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                         transition-shadow placeholder:text-neutral-400"
              />
            </div>
          </div>

          <div className="flex items-center mt-4">
            <input
              id="is_active"
              type="checkbox"
              {...register("is_active")}
              className="h-4 w-4 text-neutral-900 focus:ring-neutral-900 border-gray-300 rounded"
            />
            <label
              htmlFor="is_active"
              className="ml-2 block text-sm font-medium text-neutral-700"
            >
              Footer Active
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-neutral-200">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 text-sm font-medium text-white bg-neutral-900 rounded-lg 
                     hover:bg-neutral-800 transition-colors focus:outline-none focus:ring-2 
                     focus:ring-neutral-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Footer;
