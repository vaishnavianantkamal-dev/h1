import React, { useEffect, useState, useCallback } from "react";
import { Plus, X, Upload, Loader2 } from "lucide-react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { useDropzone } from "react-dropzone";
import { toast } from "react-hot-toast";
import apiClient from "../../../api/client";
import { getImageUrl } from "../../../utils/imageUrl";

const CardImageUpload = ({ value, onChange }) => {
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (typeof value === "string") {
      setPreview(getImageUrl(value));
    } else if (value instanceof File) {
      const objectUrl = URL.createObjectURL(value);
      setPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
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

  return (
    <div
      {...getRootProps()}
      className={`relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
        ${isDragActive ? "border-neutral-900 bg-neutral-50" : "border-neutral-300 hover:border-neutral-400"}`}
    >
      <input {...getInputProps()} />
      {preview ? (
        <div className="relative group">
          <img
            src={preview}
            alt="Preview"
            className="h-32 mx-auto object-contain rounded"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
            <span className="text-white text-xs font-medium">
              Click or drop to replace
            </span>
          </div>
        </div>
      ) : (
        <div className="py-4">
          <Upload className="w-8 h-8 mx-auto text-neutral-400 mb-2" />
          <p className="text-xs text-neutral-500">
            {isDragActive ? "Drop image here" : "Click or drop image"}
          </p>
        </div>
      )}
    </div>
  );
};

const WhyChoose = () => {
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      heading: "",
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
  const formatWhyChooseData = useCallback((data) => {
    if (Array.isArray(data) && data.length > 0) {
      return {
        heading: data[0].heading || "",
        is_active: Boolean(data[0].is_active),
        cards: data.map((card) => ({
          id: card.id,
          heading: card.card_heading || "",
          image: getImageUrl(card.image) || "",
        })),
      };
    }
    return { heading: "", is_active: true, cards: [] };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.get("/api/cms/choose-us");
        if (response.data.success) {
          const data = response.data.data;
          if (data && Array.isArray(data)) {
            setIsEditing(data.length > 0);
            reset(formatWhyChooseData(data));
          }
        }
      } catch (error) {
        console.error("Error fetching why choose data:", error);
        if (error.response?.status !== 404) {
          toast.error("Failed to load why choose configuration");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [reset, formatWhyChooseData]);

  const onSubmit = async (data) => {
    try {
      const formData = new FormData();
      formData.append("heading", data.heading || "");
      formData.append("is_active", data.is_active ? "1" : "0");

      data.cards.forEach((card, index) => {
        if (card.id) {
          formData.append(`card_id[${index}]`, card.id);
        }
        formData.append(`card_heading[${index}]`, card.heading || "");

        if (card.image instanceof File) {
          formData.append(`card_image[${index}]`, card.image);
        }
      });

      // Use bulk endpoint for updates and additions
      const response = await apiClient.post(
        "/api/cms/choose-us-bulk",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      if (response.data.success) {
        toast.success("Why choose section saved successfully");
        const updatedData = response.data.data;
        if (updatedData) {
          setIsEditing(true);
          reset(formatWhyChooseData(updatedData));
        }
      } else {
        toast.error(response.data.message || "Failed to save");
      }
    } catch (error) {
      console.error("Error saving why choose:", error);
      toast.error(
        error.response?.data?.message || "Failed to save why choose section",
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
      "Are you sure you want to delete this card?",
    );
    if (!confirmed) return;

    try {
      await apiClient.delete(`/api/cms/choose-us/${cardId}`);
      toast.success("Card deleted successfully");
      removeCard(index);
    } catch (error) {
      console.error("Error deleting card:", error);
      toast.error(error.response?.data?.message || "Failed to delete card");
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
            Why Choose Us
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            Highlight your unique selling points
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
            placeholder="Enter section heading"
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-neutral-700">
              Cards
            </label>
            <button
              type="button"
              onClick={() => appendCard({ image: "", heading: "" })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium 
                       text-neutral-700 bg-white border border-neutral-300 rounded-lg 
                       hover:bg-neutral-50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Card
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
                    Card {index + 1}
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
                      Image
                    </label>
                    <Controller
                      control={control}
                      name={`cards.${index}.image`}
                      render={({ field: { value, onChange } }) => (
                        <CardImageUpload value={value} onChange={onChange} />
                      )}
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-xs font-medium text-neutral-600">
                      Heading
                    </label>
                    <input
                      type="text"
                      {...register(`cards.${index}.heading`)}
                      className="w-full px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg 
                               focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                               transition-shadow placeholder:text-neutral-400"
                      placeholder="Enter card heading"
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

export default WhyChoose;
