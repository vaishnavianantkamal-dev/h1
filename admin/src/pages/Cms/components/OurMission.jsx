import React, { useEffect, useState, useCallback } from "react";
import { Plus, X, Loader2, Image as ImageIcon } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { useDropzone } from "react-dropzone";
import { toast } from "react-hot-toast";
import apiClient from "../../../api/client";
import { getImageUrl } from "../../../utils/imageUrl";

const OurMission = () => {
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [missionId, setMissionId] = useState(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      short_heading: "",
      heading: "",
      description: "",
      image: null,
      badges: [],
      is_active: true,
    },
  });

  const {
    fields: badgeFields,
    append: appendBadge,
    remove: removeBadge,
  } = useFieldArray({
    control,
    name: "badges",
  });

  const mapBadgesFromData = (data) => {
    if (!data || typeof data !== "object") return [];

    if (Array.isArray(data.missions) && data.missions.length > 0) {
      return data.missions.map((mission) => ({
        id: mission.id,
        title: mission.badge_title || mission.title || "",
        subtitle: mission.badge_subtitle || mission.subtitle || "",
      }));
    }

    if (Array.isArray(data.badges) && data.badges.length > 0) {
      return data.badges.map((badge) => ({
        id: badge.id,
        title: badge.title || "",
        subtitle: badge.subtitle || "",
      }));
    }

    const hasSingleBadge =
      (data.badge_title && data.badge_title.trim() !== "") ||
      (data.badge_subtitle && data.badge_subtitle.trim() !== "");

    if (hasSingleBadge) {
      return [
        {
          id: data.badge_id,
          title: data.badge_title || "",
          subtitle: data.badge_subtitle || "",
        },
      ];
    }

    return [];
  };

  const onDrop = useCallback(
    (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) {
        setValue("image", file);
        setImagePreview(URL.createObjectURL(file));
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
        const response = await apiClient.get("/api/cms/missions");
        if (response.data.success) {
          const rawData = response.data.data;

          // API returns an array where each item contains the same section
          // fields plus a single badge (badge_title, badge_subtitle, image, id).
          if (Array.isArray(rawData) && rawData.length > 0) {
            const firstItem = rawData[0];

            setIsEditing(true);
            // We track the first item's id as the current section identifier (if needed)
            setMissionId(firstItem.id || null);

            if (firstItem.image) {
              setImagePreview(getImageUrl(firstItem.image));
            }

            const badges = rawData.map((item) => ({
              id: item.id,
              title: item.badge_title || item.title || "",
              subtitle: item.badge_subtitle || item.subtitle || "",
            }));

            reset({
              short_heading: firstItem.short_heading || "",
              heading: firstItem.heading || "",
              description: firstItem.description || "",
              is_active: Boolean(firstItem.is_active),
              badges,
              image: null,
            });
          } else {
            const data = rawData;
            if (data && typeof data === "object" && Object.keys(data).length > 0) {
              setIsEditing(true);
              setMissionId(data.id || null);

              if (data.image) {
                setImagePreview(getImageUrl(data.image));
              }

              const badges = mapBadgesFromData(data);

              reset({
                short_heading: data.short_heading || "",
                heading: data.heading || "",
                description: data.description || "",
                is_active: Boolean(data.is_active),
                badges,
                image: null,
              });
            }
          }
        }
      } catch (error) {
        console.error("Error fetching mission data:", error);
        if (error.response?.status !== 404) {
          toast.error("Failed to load mission configuration");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [reset]);

  const onSubmit = async (data) => {
    // Backend requires at least one mission/badge
    if (!data.badges || data.badges.length === 0) {
      toast.error("Please add at least one badge before saving.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("short_heading", data.short_heading || "");
      formData.append("heading", data.heading || "");
      formData.append("description", data.description || "");
      formData.append("is_active", data.is_active ? "1" : "0");

      if (missionId) {
        formData.append("id", missionId);
      }

      if (data.badges && data.badges.length > 0) {
        data.badges.forEach((badge, index) => {
          if (badge.id) {
            formData.append(`missions[${index}][id]`, badge.id);
          }

          formData.append(
            `missions[${index}][badge_title]`,
            badge.title || "",
          );
          formData.append(
            `missions[${index}][badge_subtitle]`,
            badge.subtitle || "",
          );

          // Attach the uploaded image to the first mission, as expected by missions-bulk
          if (index === 0 && data.image instanceof File) {
            formData.append(`missions[${index}][image]`, data.image);
          }
        });
      }

      const response = await apiClient.post(
        "/api/cms/missions-bulk",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      if (response.data.success) {
        toast.success(
          `Mission section ${isEditing ? "updated" : "created"} successfully`,
        );
        const rawUpdated = response.data.data;

        // Same shape as GET: array of rows each containing section + single badge
        if (Array.isArray(rawUpdated) && rawUpdated.length > 0) {
          const firstItem = rawUpdated[0];

          setIsEditing(true);
          setMissionId(firstItem.id || null);

          if (firstItem.image) {
            setImagePreview(getImageUrl(firstItem.image));
          }

          const badges = rawUpdated.map((item) => ({
            id: item.id,
            title: item.badge_title || item.title || "",
            subtitle: item.badge_subtitle || item.subtitle || "",
          }));

          reset({
            short_heading: firstItem.short_heading || "",
            heading: firstItem.heading || "",
            description: firstItem.description || "",
            is_active: Boolean(firstItem.is_active),
            badges,
            image: null,
          });
        } else {
          const updatedData = rawUpdated;
          if (updatedData && typeof updatedData === "object") {
            setIsEditing(true);
            setMissionId(updatedData.id || null);

            if (updatedData.image) {
              setImagePreview(getImageUrl(updatedData.image));
            }

            const badges = mapBadgesFromData(updatedData);

            reset({
              short_heading: updatedData.short_heading || "",
              heading: updatedData.heading || "",
              description: updatedData.description || "",
              is_active: Boolean(updatedData.is_active),
              badges,
              image: null,
            });
          }
        }
      } else {
        toast.error(response.data.message || "Failed to save");
      }
    } catch (error) {
      console.error("Error saving mission:", error);
      toast.error(
        error.response?.data?.message || "Failed to save mission section",
      );
    }
  };

  const handleDeleteBadge = async (index) => {
    const values = getValues();
    const badges = values.badges || [];
    const badge = badges[index];
    const badgeId = badge?.id;

    if (!badgeId) {
      removeBadge(index);
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this badge?",
    );
    if (!confirmed) return;

    try {
      await apiClient.delete(`/api/cms/missions/${badgeId}`);
      toast.success("Badge deleted successfully");
      removeBadge(index);
    } catch (error) {
      console.error("Error deleting badge:", error);
      toast.error(error.response?.data?.message || "Failed to delete badge");
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
            Our Mission
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            Define your mission and values
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
            placeholder="e.g., Our Purpose"
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
            placeholder="Enter mission description"
          />
        </div>

        {/* Image Upload Section */}
        <div className="grid gap-2">
          <label className="text-sm font-medium text-neutral-700">
            Mission Image
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
            {imagePreview ? (
              <div className="relative inline-block">
                <img
                  src={imagePreview}
                  alt="Mission Preview"
                  className="max-h-48 rounded-lg mx-auto"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setValue("image", null);
                    setImagePreview(null);
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

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-neutral-700">
              Badges
            </label>
            <button
              type="button"
              onClick={() => appendBadge({ title: "", subtitle: "" })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium 
                       text-neutral-700 bg-white border border-neutral-300 rounded-lg 
                       hover:bg-neutral-50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Badge
            </button>
          </div>

          <div className="space-y-3">
            {badgeFields.map((field, index) => (
              <div
                key={field.id}
                className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs font-medium text-neutral-500">
                    Badge {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteBadge(index)}
                    className="text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <label className="text-xs font-medium text-neutral-600">
                      Title
                    </label>
                    <input
                      type="text"
                      {...register(`badges.${index}.title`)}
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
                      {...register(`badges.${index}.subtitle`)}
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

export default OurMission;
