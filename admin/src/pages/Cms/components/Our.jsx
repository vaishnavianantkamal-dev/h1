import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import apiClient from "../../../api/client";
import { Loader2 } from "lucide-react";

const Our = () => {
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      short_heading: "",
      heading: "",
      description: "",
      is_active: true,
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.get("/api/cms/service");
        if (response.data.success) {
          const data = response.data.data;
          if (data && Object.keys(data).length > 0) {
            setIsEditing(true);
            reset({
              ...data,
              is_active: Boolean(data.is_active),
            });
          }
        }
      } catch (error) {
        console.error("Error fetching service section data:", error);
        // Don't show error toast on 404 (first time setup)
        if (error.response?.status !== 404) {
          toast.error("Failed to load service section configuration");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [reset]);

  const onSubmit = async (data) => {
    try {
      const apiCall = isEditing
        ? apiClient.put("/api/cms/service", data)
        : apiClient.post("/api/cms/service", data);

      const response = await apiCall;

      if (response.data.success) {
        toast.success(
          `Service section ${isEditing ? "updated" : "created"} successfully`,
        );
        const updatedData = response.data.data;
        if (updatedData) {
          setIsEditing(true);
          reset({
            ...updatedData,
            is_active: Boolean(updatedData.is_active),
          });
        }
      } else {
        toast.error(response.data.message || "Failed to save");
      }
    } catch (error) {
      console.error("Error saving service section:", error);
      toast.error(
        error.response?.data?.message || "Failed to save service section",
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
            Our Services
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            Configure your services section content
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
            placeholder="e.g., What We Offer"
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
            placeholder="Enter services description"
          />
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

export default Our;
