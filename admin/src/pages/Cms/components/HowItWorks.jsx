import React, { useEffect, useState, useCallback } from "react";
import { Plus, X, Upload, Loader2, Image as ImageIcon } from "lucide-react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { useDropzone } from "react-dropzone";
import { toast } from "react-hot-toast";
import apiClient from "../../../api/client";
import { getImageUrl } from "../../../utils/imageUrl";

// Helper component for individual card image upload
const CardImageUpload = ({ control, index, getImageUrl }) => {
  return (
    <Controller
      control={control}
      name={`cards.${index}.image`}
      render={({ field: { onChange, value } }) => {
        const [preview, setPreview] = useState(null);

        useEffect(() => {
          if (value instanceof File) {
            setPreview(URL.createObjectURL(value));
          } else if (typeof value === "string" && value) {
            setPreview(getImageUrl(value));
          } else {
            setPreview(null);
          }
        }, [value]);

        const onDrop = useCallback(
          (acceptedFiles) => {
            if (acceptedFiles?.[0]) {
              onChange(acceptedFiles[0]);
            }
          },
          [onChange],
        );

        const { getRootProps, getInputProps, isDragActive } = useDropzone({
          onDrop,
          accept: { "image/*": [".jpeg", ".jpg", ".png", ".webp"] },
          maxFiles: 1,
        });

        const removeImage = (e) => {
          e.stopPropagation();
          onChange(null);
        };

        return (
          <div className="grid gap-2">
            <label className="text-xs font-medium text-neutral-600">
              Step Image
            </label>
            <div
              {...getRootProps()}
              className={`relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
                ${
                  isDragActive
                    ? "border-neutral-900 bg-neutral-50"
                    : "border-neutral-300 hover:border-neutral-400"
                } ${preview ? "border-solid" : ""}`}
            >
              <input {...getInputProps()} />
              {preview ? (
                <div className="relative inline-block">
                  <img
                    src={preview}
                    alt={`Step ${index + 1}`}
                    className="h-24 w-auto rounded-md object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 p-1 bg-white rounded-full shadow-md hover:bg-neutral-100"
                  >
                    <X className="w-3 h-3 text-neutral-500" />
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <ImageIcon className="w-6 h-6 mx-auto text-neutral-400" />
                  <div className="text-xs text-neutral-500">
                    <span className="font-medium text-neutral-900">Upload</span>{" "}
                    or drag
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      }}
    />
  );
};

const HowItWorks = () => {
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [howWorksId, setHowWorksId] = useState(null);
  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      short_heading: "",
      heading: "",
      description: "",
      cards: [],
      is_active: true,
    },
  });

  const {
    fields: cardFields,
    append: appendCard,
    remove: removeCard,
  } = useFieldArray({
    control,
    name: "cards",
  });

  // Helper to format API response data
  const formatHowItWorksData = useCallback((data) => {
    if (Array.isArray(data)) {
      if (data.length > 0) {
        const firstItem = data[0];

        const cards = data.map((item) => ({
          id: item.id,
          step: item.step ?? "",
          title: item.title || "",
          subtitle: item.subtitle || "",
          image: getImageUrl(item.image) || "",
        }));

        return {
          short_heading: firstItem.short_heading || "",
          heading: firstItem.heading || "",
          description: firstItem.description || "",
          is_active: Boolean(firstItem.is_active),
          cards,
        };
      }
      return {
        short_heading: "",
        heading: "",
        description: "",
        cards: [],
        is_active: true,
      };
    }

    return {
      ...data,
      is_active: Boolean(data.is_active),
      cards: (data.cards || []).map((card) => ({
        ...card,
        image: getImageUrl(card.image) || "",
      })),
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.get("/api/cms/how-works");
        if (response.data.success) {
          const data = response.data.data;
          if (data) {
            if (Array.isArray(data) && data.length > 0) {
              const firstItem = data[0];
              setIsEditing(true);
              setHowWorksId(firstItem.id || null);
              reset(formatHowItWorksData(data));
            } else if (!Array.isArray(data) && Object.keys(data).length > 0) {
              setIsEditing(true);
              setHowWorksId(data.id || null);
              reset(formatHowItWorksData(data));
            }
          }
        }
      } catch (error) {
        console.error("Error fetching how it works data:", error);
        if (error.response?.status !== 404) {
          toast.error("Failed to load how it works configuration");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [reset, formatHowItWorksData]);

  const onSubmit = async (data) => {
    try {
      const formData = new FormData();
      formData.append("short_heading", data.short_heading || "");
      formData.append("heading", data.heading || "");
      formData.append("description", data.description || "");
      formData.append("is_active", data.is_active ? "1" : "0");

      if (data.cards && data.cards.length > 0) {
        data.cards.forEach((card, index) => {
          if (card.id) {
            formData.append(`cards[${index}][id]`, card.id);
          }
          const stepNum = parseInt(card.step, 10);
          const step = Number.isNaN(stepNum) ? index + 1 : stepNum;
          formData.append(`cards[${index}][step]`, step);
          formData.append(`cards[${index}][title]`, card.title || "");
          formData.append(`cards[${index}][subtitle]`, card.subtitle || "");

          if (card.image instanceof File) {
            formData.append(`cards[${index}][image]`, card.image);
          }
        });
      }

      const config = { headers: { "Content-Type": "multipart/form-data" } };

      let response;
      if (isEditing) {
        // Update: POST /api/cms/how-works-bulk (section + cards; existing cards send id)
        response = await apiClient.post(
          "/api/cms/how-works-bulk",
          formData,
          config,
        );
      } else {
        // Create: POST /api/cms/how-works (section + cards, no card id)
        response = await apiClient.post("/api/cms/how-works", formData, config);
      }

      if (response.data.success) {
        toast.success(
          `How it works section ${isEditing ? "updated" : "created"} successfully`,
        );
        const updatedData = response.data.data;
        if (updatedData) {
          setIsEditing(true);
          if (Array.isArray(updatedData) && updatedData.length > 0) {
            const firstItem = updatedData[0];
            setHowWorksId(firstItem.id || null);
          } else if (!Array.isArray(updatedData) && updatedData.id) {
            setHowWorksId(updatedData.id);
          }
          reset(formatHowItWorksData(updatedData));
        }
      } else {
        toast.error(response.data.message || "Failed to save");
      }
    } catch (error) {
      console.error("Error saving how it works:", error);
      toast.error(
        error.response?.data?.message || "Failed to save how it works section",
      );
    }
  };

  const handleDeleteCard = async (index) => {
    const values = getValues();
    const cards = values.cards || [];
    const card = cards[index];
    const cardId = card?.id;

    if (!cardId) {
      removeCard(index);
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this step?",
    );
    if (!confirmed) return;

    try {
      await apiClient.delete(`/api/cms/how-works/${cardId}`);
      toast.success("Step deleted successfully");
      removeCard(index);
    } catch (error) {
      console.error("Error deleting step:", error);
      toast.error(error.response?.data?.message || "Failed to delete step");
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
            How It Works
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            Explain your process step by step
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
            placeholder="e.g., The Process"
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
            placeholder="Enter process description"
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-neutral-700">
              Steps
            </label>
            <button
              type="button"
              onClick={() =>
                appendCard({ step: "", title: "", subtitle: "", image: "" })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium 
                       text-neutral-700 bg-white border border-neutral-300 rounded-lg 
                       hover:bg-neutral-50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Step
            </button>
          </div>

          <div className="space-y-4">
            {cardFields.map((field, index) => (
              <div
                key={field.id}
                className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg"
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="text-xs font-medium text-neutral-500">
                    Step {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteCard(index)}
                    className="text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="grid gap-2">
                    <label className="text-xs font-medium text-neutral-600">
                      Step Number
                    </label>
                    <input
                      type="text"
                      {...register(`cards.${index}.step`)}
                      className="w-full px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg 
                               focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                               transition-shadow placeholder:text-neutral-400"
                      placeholder="e.g., 01"
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-xs font-medium text-neutral-600">
                      Title
                    </label>
                    <input
                      type="text"
                      {...register(`cards.${index}.title`)}
                      className="w-full px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg 
                               focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                               transition-shadow placeholder:text-neutral-400"
                      placeholder="Enter step title"
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-xs font-medium text-neutral-600">
                      Subtitle
                    </label>
                    <input
                      type="text"
                      {...register(`cards.${index}.subtitle`)}
                      className="w-full px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg 
                               focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                               transition-shadow placeholder:text-neutral-400"
                      placeholder="Enter step subtitle"
                    />
                  </div>

                  {/* New Image Upload Component */}
                  <CardImageUpload
                    control={control}
                    index={index}
                    getImageUrl={getImageUrl}
                  />
                </div>
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

export default HowItWorks;
