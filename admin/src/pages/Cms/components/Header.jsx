import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import apiClient from "../../../api/client";

const Header = () => {
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      marquee_text: "",
      marquee_status: false,
      is_active: true,
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.get("/api/cms/header");
        if (response.data.success) {
          const data = response.data.data;
          if (data && Object.keys(data).length > 0) {
            setIsEditing(true);
            reset({
              ...data,
              marquee_status: Boolean(data.marquee_status),
              is_active: Boolean(data.is_active),
            });
          }
        }
      } catch (error) {
        console.error("Error fetching header data:", error);
        if (error.response?.status !== 404) {
          toast.error("Failed to load header configuration");
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
        ? apiClient.put("/api/cms/header", data)
        : apiClient.post("/api/cms/header", data);

      const response = await apiCall;

      if (response.data.success) {
        toast.success(
          `Header configuration ${isEditing ? "updated" : "created"} successfully`,
        );
        const updatedData = response.data.data;
        if (updatedData) {
          setIsEditing(true);
          reset({
            ...updatedData,
            marquee_status: Boolean(updatedData.marquee_status),
            is_active: Boolean(updatedData.is_active),
          });
        }
      } else {
        toast.error(response.data.message || "Failed to save");
      }
    } catch (error) {
      console.error("Error saving header:", error);
      toast.error(
        error.response?.data?.message || "Failed to save header configuration",
      );
    }
  };

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
          Header Configuration
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          Manage header marquee and visibility settings
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid gap-2">
          <label
            htmlFor="marquee_text"
            className="text-sm font-medium text-neutral-700"
          >
            Marquee Text
          </label>
          <input
            type="text"
            id="marquee_text"
            {...register("marquee_text")}
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-neutral-300 rounded-lg 
                     focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                     transition-shadow placeholder:text-neutral-400"
            placeholder="Enter marquee text"
          />
        </div>

        <div className="flex items-center gap-8">
          <div className="flex items-center">
            <input
              id="marquee_status"
              type="checkbox"
              {...register("marquee_status")}
              className="h-4 w-4 text-neutral-900 focus:ring-neutral-900 border-gray-300 rounded"
            />
            <label
              htmlFor="marquee_status"
              className="ml-2 block text-sm font-medium text-neutral-700"
            >
              Enable Marquee
            </label>
          </div>

          <div className="flex items-center">
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
              Header Active
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

export default Header;
