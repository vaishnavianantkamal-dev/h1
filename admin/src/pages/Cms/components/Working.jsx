import React, { useEffect, useState, useCallback } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "react-hot-toast";
import apiClient from "../../../api/client";

const Working = () => {
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
      id: null,
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
  const formatWorkingData = useCallback((data) => {
    if (Array.isArray(data)) {
      if (data.length > 0) {
        const firstItem = data[0];
        // If the first item has cards, use it as the main object
        if (firstItem.cards) {
          return {
            ...firstItem,
            id: firstItem.id, // Capture section ID
            is_active: Boolean(firstItem.is_active),
            cards: firstItem.cards || [],
          };
        }
        // Otherwise, assume the array IS the list of cards, and take parent info from the first item
        // In this case, we might not have a distinct section ID, or firstItem.id IS the section ID if structure is weird.
        // Assuming the first item contains the section metadata and potentially the section ID if flattened.
        return {
          id: firstItem.id, // Tentatively use first item ID, though it might be card ID. Ideally backend should send object.
          short_heading: firstItem.short_heading || "",
          heading: firstItem.heading || "",
          description: firstItem.description || "",
          is_active: Boolean(firstItem.is_active),
          cards: data.map((item) => ({
            id: item.id,
            card_title: item.card_title || item.title || "",
            card_subtitle: item.card_subtitle || item.subtitle || "",
          })),
        };
      }
      return {
        id: null,
        short_heading: "",
        heading: "",
        description: "",
        cards: [],
        is_active: true,
      };
    }
    // Object response
    return {
      ...data,
      id: data.id, // Capture section ID
      is_active: Boolean(data.is_active),
      cards: (data.cards || []).map((card) => ({
        ...card,
        card_title: card.card_title || card.title || "",
        card_subtitle: card.card_subtitle || card.subtitle || "",
      })),
    };
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const response = await apiClient.get("/api/cms/workings");
      if (response.data.success) {
        const data = response.data.data;
        if (data && (Array.isArray(data) || Object.keys(data).length > 0)) {
          setIsEditing(true);
          reset(formatWorkingData(data));
        }
      }
    } catch (error) {
      console.error("Error fetching working section data:", error);
      if (error.response?.status !== 404) {
        toast.error("Failed to load working section configuration");
      }
    } finally {
      setLoading(false);
    }
  }, [reset, formatWorkingData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onSubmit = async (data) => {
    try {
      let response;
      const isUpdate = isEditing && data.id;

      if (isUpdate) {
        // Use PUT with JSON for updates
        const payload = {
          short_heading: data.short_heading || "",
          heading: data.heading || "",
          description: data.description || "",
          is_active: data.is_active ? "1" : "0",
          // Flatten arrays for backend compatibility
          card_id: [],
          card_title: [],
          card_subtitle: [],
        };

        data.cards.forEach((card) => {
          // Push ID if exists, otherwise null to maintain index alignment with title/subtitle arrays
          // This ensures the backend knows exactly which ID corresponds to which title
          payload.card_id.push(card.id || null);
          payload.card_title.push(card.card_title || "");
          payload.card_subtitle.push(card.card_subtitle || "");
        });

        response = await apiClient.put(`/api/cms/workings/${data.id}`, payload);
      } else {
        // Use POST with FormData for creation (standard pattern)
        const formData = new FormData();
        formData.append("short_heading", data.short_heading || "");
        formData.append("heading", data.heading || "");
        formData.append("description", data.description || "");
        formData.append("is_active", data.is_active ? "1" : "0");

        data.cards.forEach((card, index) => {
          // New cards won't have IDs yet
          formData.append(`card_title[${index}]`, card.card_title || "");
          formData.append(`card_subtitle[${index}]`, card.card_subtitle || "");
        });

        response = await apiClient.post("/api/cms/workings", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      if (response.data.success) {
        toast.success(
          `Working section ${isEditing ? "updated" : "created"} successfully`,
        );
        // Refresh data from server to ensure we have the latest state (especially cards)
        await fetchData();
      } else {
        toast.error(response.data.message || "Failed to save");
      }
    } catch (error) {
      console.error("Error saving working section:", error);
      toast.error(
        error.response?.data?.message || "Failed to save working section",
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
          <h2 className="text-xl font-semibold text-neutral-900">Working</h2>
          <p className="text-sm text-neutral-500 mt-1">
            Showcase your work methodology
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
            placeholder="e.g., Our Approach"
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
            placeholder="Enter working description"
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-neutral-700">
              Cards
            </label>
            <button
              type="button"
              onClick={() => appendCard({ card_title: "", card_subtitle: "" })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium 
                       text-neutral-700 bg-white border border-neutral-300 rounded-lg 
                       hover:bg-neutral-50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Card
            </button>
          </div>

          <div className="space-y-3">
            {cardFields.map((field, index) => (
              <div
                key={field.id}
                className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs font-medium text-neutral-500">
                    Card {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeCard(index)}
                    className="text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <input type="hidden" {...register(`cards.${index}.id`)} />
                  <div className="grid gap-2">
                    <label className="text-xs font-medium text-neutral-600">
                      Title
                    </label>
                    <input
                      type="text"
                      {...register(`cards.${index}.card_title`)}
                      className="w-full px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg 
                               focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                               transition-shadow placeholder:text-neutral-400"
                      placeholder="Enter title"
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-xs font-medium text-neutral-600">
                      Subtitle
                    </label>
                    <input
                      type="text"
                      {...register(`cards.${index}.card_subtitle`)}
                      className="w-full px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg 
                               focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                               transition-shadow placeholder:text-neutral-400"
                      placeholder="Enter subtitle"
                    />
                  </div>
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

export default Working;
