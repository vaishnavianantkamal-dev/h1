import React, { useEffect, useState, useCallback } from "react";
import { Upload, Loader2, X } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { useDropzone } from "react-dropzone";
import { toast } from "react-hot-toast";
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

const GetTheApp = () => {
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      short_heading: "",
      heading: "",
      description: "",
      google_image: null,
      google_status: true,
      applestore_image: null,
      applestore_status: true,
      is_active: true,
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.get("/api/cms/get-in-app");
        if (response.data.success) {
          const responseData = response.data.data;

          let data = responseData;
          if (Array.isArray(responseData) && responseData.length > 0) {
            data = responseData[0];
          }

          if (data && Object.keys(data).length > 0) {
            setIsEditing(true);

            // Map existing data to form structure
            // Check if google_play is object or flat
            let googleImg = "";
            let googleStatus = true;
            let appleImg = "";
            let appleStatus = true;

            if (data.google_play && typeof data.google_play === "object") {
              googleImg = data.google_play.image || "";
              googleStatus = data.google_play.status ?? true;
            } else {
              googleImg = data.google_image || "";
              googleStatus = data.google_status ?? true;
            }

            if (data.app_store && typeof data.app_store === "object") {
              appleImg = data.app_store.image || "";
              appleStatus = data.app_store.status ?? true;
            } else {
              appleImg = data.applestore_image || "";
              appleStatus = data.applestore_status ?? true;
            }

            reset({
              short_heading: data.short_heading || "",
              heading: data.heading || "",
              description: data.description || "",
              is_active: Boolean(data.is_active),
              google_image: googleImg,
              google_status: Boolean(googleStatus),
              applestore_image: appleImg,
              applestore_status: Boolean(appleStatus),
            });
          }
        }
      } catch (error) {
        console.error("Error fetching app data:", error);
        if (error.response?.status !== 404) {
          toast.error("Failed to load app configuration");
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
      formData.append("is_active", data.is_active ? "1" : "0");

      // Google Play
      if (data.google_image instanceof File) {
        formData.append("google_image", data.google_image);
      }
      formData.append("google_status", data.google_status ? "1" : "0");

      // App Store
      if (data.applestore_image instanceof File) {
        formData.append("applestore_image", data.applestore_image);
      }
      formData.append("applestore_status", data.applestore_status ? "1" : "0");

      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      };

      // Create vs update:
      // - POST /api/cms/get-in-app             (create)
      // - POST /api/cms/get-in-app?_method=PUT (update with files)
      const apiCall = isEditing
        ? apiClient.post("/api/cms/get-in-app?_method=PUT", formData, config)
        : apiClient.post("/api/cms/get-in-app", formData, config);

      const response = await apiCall;
      if (response.data.success) {
        toast.success(
          `App section ${isEditing ? "updated" : "created"} successfully`,
        );
        const updatedData = response.data.data;

        let newData = updatedData;
        if (Array.isArray(updatedData) && updatedData.length > 0) {
          newData = updatedData[0];
        }

        if (newData) {
          setIsEditing(true);

          let googleImg = "";
          let googleStatus = true;
          let appleImg = "";
          let appleStatus = true;

          if (newData.google_play && typeof newData.google_play === "object") {
            googleImg = newData.google_play.image || "";
            googleStatus = newData.google_play.status ?? true;
          } else {
            googleImg = newData.google_image || "";
            googleStatus = newData.google_status ?? true;
          }

          if (newData.app_store && typeof newData.app_store === "object") {
            appleImg = newData.app_store.image || "";
            appleStatus = newData.app_store.status ?? true;
          } else {
            appleImg = newData.applestore_image || "";
            appleStatus = newData.applestore_status ?? true;
          }

          reset({
            short_heading: newData.short_heading || "",
            heading: newData.heading || "",
            description: newData.description || "",
            is_active: Boolean(newData.is_active),
            google_image: googleImg,
            google_status: Boolean(googleStatus),
            applestore_image: appleImg,
            applestore_status: Boolean(appleStatus),
          });
        }
      } else {
        toast.error(response.data.message || "Failed to update");
      }
    } catch (error) {
      console.error("Error updating app section:", error);
      toast.error(
        error.response?.data?.message || "Failed to update app section",
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
            Get The App
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            Configure app download section
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
            placeholder="e.g., Download Now"
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
            placeholder="Enter app download description"
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Google Play Store */}
          <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
            <h3 className="text-sm font-medium text-neutral-900 mb-4">
              Google Play Store
            </h3>

            <div className="space-y-4">
              <ImageUpload
                control={control}
                name="google_image"
                label="Badge Image"
              />

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="google-status"
                  {...register("google_status")}
                  className="w-4 h-4 text-neutral-900 bg-white border-neutral-300 rounded 
                           focus:ring-2 focus:ring-neutral-900"
                />
                <label
                  htmlFor="google-status"
                  className="text-xs font-medium text-neutral-600"
                >
                  Enable Google Play Store
                </label>
              </div>
            </div>
          </div>

          {/* Apple App Store */}
          <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
            <h3 className="text-sm font-medium text-neutral-900 mb-4">
              Apple App Store
            </h3>

            <div className="space-y-4">
              <ImageUpload
                control={control}
                name="applestore_image"
                label="Badge Image"
              />

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="apple-status"
                  {...register("applestore_status")}
                  className="w-4 h-4 text-neutral-900 bg-white border-neutral-300 rounded 
                           focus:ring-2 focus:ring-neutral-900"
                />
                <label
                  htmlFor="apple-status"
                  className="text-xs font-medium text-neutral-600"
                >
                  Enable Apple App Store
                </label>
              </div>
            </div>
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

export default GetTheApp;
