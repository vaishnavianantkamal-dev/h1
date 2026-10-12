import React, { useEffect, useState, useCallback } from "react";
import { X, Loader2, Upload, Image as ImageIcon } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { useDropzone } from "react-dropzone";
import { toast } from "react-hot-toast";
import apiClient from "../../../api/client";
import { getImageUrl } from "../../../utils/imageUrl";

const Hero = () => {
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [heroImagePreview, setHeroImagePreview] = useState(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      short_heading: "",
      heading: "",
      description: "",
      primary_btn_text: "",
      primary_btn_link: "",
      secondary_btn_text: "",
      secondary_btn_link: "",
      available_in: [],
      hero_image: null,
      is_active: true,
    },
  });

  const {
    fields: availableInFields,
    append: appendAvailableIn,
    remove: removeAvailableIn,
  } = useFieldArray({
    control,
    name: "available_in",
  });

  // Local state for adding new available_in items
  const [newAvailableIn, setNewAvailableIn] = useState("");

  const handleAddAvailableIn = () => {
    if (newAvailableIn.trim()) {
      appendAvailableIn({ value: newAvailableIn.trim() });
      setNewAvailableIn("");
    }
  };

  const onDrop = useCallback(
    (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) {
        setValue("hero_image", file);
        setHeroImagePreview(URL.createObjectURL(file));
      }
    },
    [setValue],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    maxFiles: 1,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.get("/api/cms/hero");
        if (response.data.success) {
          const data = response.data.data;
          if (data && Object.keys(data).length > 0) {
            setIsEditing(true);

            // Handle Available In (array of strings from DB -> array of objects for form)
            const availableIn = Array.isArray(data.available_in)
              ? data.available_in.map((item) =>
                  typeof item === "string" ? { value: item } : item,
                )
              : [];

            // Handle Image Preview
            if (data.hero_image) {
              setHeroImagePreview(getImageUrl(data.hero_image));
            }

            reset({
              ...data,
              primary_btn_text:
                data.primary_btn_text || data.button_primary_text || "",
              primary_btn_link:
                data.primary_btn_link || data.button_primary_link || "",
              secondary_btn_text:
                data.secondary_btn_text || data.button_secondary_text || "",
              secondary_btn_link:
                data.secondary_btn_link || data.button_secondary_link || "",
              is_active: Boolean(data.is_active),
              available_in: availableIn,
              hero_image: null, // Reset file input, keep preview
            });
          }
        }
      } catch (error) {
        console.error("Error fetching hero data:", error);
        if (error.response?.status !== 404) {
          toast.error("Failed to load hero configuration");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [reset]);

  const onSubmit = async (data) => {
    try {
      const formData = new FormData();
      formData.append("short_heading", data.short_heading || "");
      formData.append("heading", data.heading || "");
      formData.append("description", data.description || "");
      formData.append("primary_btn_text", data.primary_btn_text || "");
      formData.append("button_primary_text", data.primary_btn_text || "");

      formData.append("primary_btn_link", data.primary_btn_link || "");
      formData.append("button_primary_link", data.primary_btn_link || "");

      formData.append("secondary_btn_text", data.secondary_btn_text || "");
      formData.append("button_secondary_text", data.secondary_btn_text || "");

      formData.append("secondary_btn_link", data.secondary_btn_link || "");
      formData.append("button_secondary_link", data.secondary_btn_link || "");

      formData.append("is_active", data.is_active ? "1" : "0");

      // Handle Available In
      if (data.available_in && data.available_in.length > 0) {
        data.available_in.forEach((item, index) => {
          formData.append(`available_in[${index}]`, item.value);
        });
      }

      // Handle Image
      if (data.hero_image instanceof File) {
        formData.append("hero_image", data.hero_image);
      }

      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      };

      const apiCall = isEditing
        ? apiClient.post("/api/cms/hero?_method=PUT", formData, config) // Using POST with _method=PUT for safer FormData handling
        : apiClient.post("/api/cms/hero", formData, config);

      const response = await apiCall;

      if (response.data.success) {
        toast.success(
          `Hero section ${isEditing ? "updated" : "created"} successfully`,
        );
        const updatedData = response.data.data;
        if (updatedData) {
          setIsEditing(true);

          // Update preview if new image returned
          if (updatedData.hero_image) {
            setHeroImagePreview(getImageUrl(updatedData.hero_image));
          }

          const availableIn = Array.isArray(updatedData.available_in)
            ? updatedData.available_in.map((item) =>
                typeof item === "string" ? { value: item } : item,
              )
            : [];

          reset({
            ...updatedData,
            is_active: Boolean(updatedData.is_active),
            available_in: availableIn,
            hero_image: null,
          });
        }
      } else {
        toast.error(response.data.message || "Failed to save");
      }
    } catch (error) {
      console.error("Error saving hero section:", error);
      toast.error(
        error.response?.data?.message || "Failed to save hero section",
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
            Hero Section
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            Configure the main hero section of your landing page
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

        {/* Short Heading */}
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
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-shadow placeholder:text-neutral-400"
            placeholder="e.g., Welcome to Our Platform"
          />
        </div>

        {/* Heading */}
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
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-shadow placeholder:text-neutral-400"
            placeholder="Enter main heading"
          />
        </div>

        {/* Description */}
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
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-shadow placeholder:text-neutral-400 resize-none"
            placeholder="Enter hero description"
          />
        </div>

        {/* Hero Image */}
        <div className="grid gap-2">
          <label className="text-sm font-medium text-neutral-700">
            Hero Image
          </label>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
              ${
                isDragActive
                  ? "border-neutral-900 bg-neutral-50"
                  : "border-neutral-300 hover:border-neutral-400"
              }`}
          >
            <input {...getInputProps()} />
            {heroImagePreview ? (
              <div className="relative inline-block">
                <img
                  src={heroImagePreview}
                  alt="Hero Preview"
                  className="max-h-48 rounded-lg mx-auto"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setValue("hero_image", null);
                    setHeroImagePreview(null);
                  }}
                  className="absolute -top-2 -right-2 p-1 bg-white rounded-full shadow-md hover:bg-neutral-100"
                >
                  <X className="w-4 h-4 text-neutral-500" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-center">
                  <ImageIcon className="w-8 h-8 text-neutral-400" />
                </div>
                <div className="text-sm text-neutral-600">
                  <span className="font-medium text-neutral-900">
                    Click to upload
                  </span>{" "}
                  or drag and drop
                </div>
                <p className="text-xs text-neutral-500">
                  PNG, JPG, WEBP up to 10MB
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Primary Button */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <label
              htmlFor="primary_btn_text"
              className="text-sm font-medium text-neutral-700"
            >
              Primary Button Text
            </label>
            <input
              type="text"
              id="primary_btn_text"
              {...register("primary_btn_text")}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-shadow placeholder:text-neutral-400"
              placeholder="e.g., Get Started"
            />
          </div>
          <div className="grid gap-2">
            <label
              htmlFor="primary_btn_link"
              className="text-sm font-medium text-neutral-700"
            >
              Primary Button Link
            </label>
            <input
              type="text"
              id="primary_btn_link"
              {...register("primary_btn_link")}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-shadow placeholder:text-neutral-400"
              placeholder="/get-started"
            />
          </div>
        </div>

        {/* Secondary Button */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <label
              htmlFor="secondary_btn_text"
              className="text-sm font-medium text-neutral-700"
            >
              Secondary Button Text
            </label>
            <input
              type="text"
              id="secondary_btn_text"
              {...register("secondary_btn_text")}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-shadow placeholder:text-neutral-400"
              placeholder="e.g., Learn More"
            />
          </div>
          <div className="grid gap-2">
            <label
              htmlFor="secondary_btn_link"
              className="text-sm font-medium text-neutral-700"
            >
              Secondary Button Link
            </label>
            <input
              type="text"
              id="secondary_btn_link"
              {...register("secondary_btn_link")}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-shadow placeholder:text-neutral-400"
              placeholder="/learn-more"
            />
          </div>
        </div>

        {/* Available In */}
        <div className="grid gap-2">
          <label className="text-sm font-medium text-neutral-700">
            Available In
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {availableInFields.map((field, index) => (
              <span
                key={field.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-neutral-100 text-neutral-700 rounded-md border border-neutral-200"
              >
                {field.value}
                {/* Hidden input to register the value */}
                <input
                  type="hidden"
                  {...register(`available_in.${index}.value`)}
                />
                <button
                  type="button"
                  onClick={() => removeAvailableIn(index)}
                  className="hover:text-neutral-900 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newAvailableIn}
              onChange={(e) => setNewAvailableIn(e.target.value)}
              onKeyPress={(e) =>
                e.key === "Enter" &&
                (e.preventDefault(), handleAddAvailableIn())
              }
              className="flex-1 px-3.5 py-2.5 text-sm bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-shadow placeholder:text-neutral-400"
              placeholder="Add platform (e.g., Web, iOS)"
            />
            <button
              type="button"
              onClick={handleAddAvailableIn}
              className="px-4 py-2.5 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        {/* Save Button */}
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

export default Hero;
