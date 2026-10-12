import React, { useEffect, useState } from "react";
import { Plus, X, Upload, Loader2 } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "react-hot-toast";
import apiClient from "../../../api/client";
import { getImageUrl } from "../../../utils/imageUrl";

const Testimonials = () => {
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [testimonialsId, setTestimonialsId] = useState(null);
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.get("/api/cms/testimonials");
        if (response.data.success) {
          const responseData = response.data.data;

          if (Array.isArray(responseData) && responseData.length > 0) {
            const firstItem = responseData[0];
            setTestimonialsId(firstItem.id || null);
            // Map the flat array structure to the nested form structure
            const cards = responseData
              .filter((item) => item.name || item.card_description) // Filter out empty card rows if any
              .map((item) => ({
                star: item.star,
                description: item.card_description || "", // Map card_description to description
                image: getImageUrl(item.image) || "",
                name: item.name || "",
                designation: item.designation || "",
              }));

            setIsEditing(true);
            reset({
              short_heading: firstItem.short_heading || "",
              heading: firstItem.heading || "",
              description: firstItem.description || "",
              is_active: Boolean(firstItem.is_active),
              cards: cards,
            });
          } else if (
            responseData &&
            typeof responseData === "object" &&
            Object.keys(responseData).length > 0
          ) {
            setIsEditing(true);
            setTestimonialsId(responseData.id || null);
            reset({
              ...responseData,
              is_active: Boolean(responseData.is_active),
              cards: responseData.cards || [],
            });
          }
        }
      } catch (error) {
        console.error("Error fetching testimonials data:", error);
        if (error.response?.status !== 404) {
          toast.error("Failed to load testimonials configuration");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [reset]);

  const onSubmit = async (data) => {
    try {
      const url =
        isEditing && testimonialsId
          ? `/api/cms/testimonials/${testimonialsId}`
          : "/api/cms/testimonials";

      const method = isEditing && testimonialsId ? "put" : "post";

      const response = await apiClient[method](url, data);

      if (response.data.success) {
        toast.success(
          `Testimonials section ${isEditing ? "updated" : "created"} successfully`,
        );
        const updatedData = response.data.data;

        if (Array.isArray(updatedData) && updatedData.length > 0) {
          const firstItem = updatedData[0];
          setTestimonialsId(firstItem.id || null);
          const cards = updatedData
            .filter((item) => item.name || item.card_description)
            .map((item) => ({
              star: item.star,
              description: item.card_description || "",
              image: getImageUrl(item.image) || "",
              name: item.name || "",
              designation: item.designation || "",
            }));

          setIsEditing(true);
          reset({
            short_heading: firstItem.short_heading || "",
            heading: firstItem.heading || "",
            description: firstItem.description || "",
            is_active: Boolean(firstItem.is_active),
            cards: cards,
          });
        } else if (updatedData && typeof updatedData === "object") {
          setIsEditing(true);
          setTestimonialsId(updatedData.id || null);
          reset({
            ...updatedData,
            is_active: Boolean(updatedData.is_active),
            cards: (updatedData.cards || []).map((card) => ({
              ...card,
              image: getImageUrl(card.image) || "",
            })),
          });
        }
      } else {
        toast.error(response.data.message || "Failed to save");
      }
    } catch (error) {
      console.error("Error saving testimonials:", error);
      toast.error(
        error.response?.data?.message || "Failed to save testimonials section",
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
            Testimonials
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            Display customer reviews and feedback
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
            placeholder="e.g., What Our Clients Say"
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
            placeholder="Enter testimonials description"
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-neutral-700">
              Testimonials
            </label>
            <button
              type="button"
              onClick={() =>
                appendCard({
                  star: 5,
                  description: "",
                  image: "",
                  name: "",
                  designation: "",
                })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium 
                       text-neutral-700 bg-white border border-neutral-300 rounded-lg 
                       hover:bg-neutral-50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Testimonial
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
                    Testimonial {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeCard(index)}
                    className="text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="grid gap-2">
                    <label className="text-xs font-medium text-neutral-600">
                      Star Rating
                    </label>
                    <select
                      {...register(`cards.${index}.star`)}
                      className="w-full px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg 
                               focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                               transition-shadow"
                    >
                      <option value={1}>1 Star</option>
                      <option value={2}>2 Stars</option>
                      <option value={3}>3 Stars</option>
                      <option value={4}>4 Stars</option>
                      <option value={5}>5 Stars</option>
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <label className="text-xs font-medium text-neutral-600">
                      Description
                    </label>
                    <textarea
                      {...register(`cards.${index}.description`)}
                      rows="3"
                      className="w-full px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg 
                               focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                               transition-shadow placeholder:text-neutral-400 resize-none"
                      placeholder="Enter testimonial text"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <label className="text-xs font-medium text-neutral-600">
                        Image URL
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          {...register(`cards.${index}.image`)}
                          className="w-full px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg 
                                   focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                                   transition-shadow placeholder:text-neutral-400 pr-10"
                          placeholder="Profile image URL"
                        />
                        <Upload className="absolute right-3 top-2.5 w-4 h-4 text-neutral-400" />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs font-medium text-neutral-600">
                        Name
                      </label>
                      <input
                        type="text"
                        {...register(`cards.${index}.name`)}
                        className="w-full px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg 
                                 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                                 transition-shadow placeholder:text-neutral-400"
                        placeholder="Customer name"
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <label className="text-xs font-medium text-neutral-600">
                      Designation
                    </label>
                    <input
                      type="text"
                      {...register(`cards.${index}.designation`)}
                      className="w-full px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg 
                               focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                               transition-shadow placeholder:text-neutral-400"
                      placeholder="e.g., CEO at Company"
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

export default Testimonials;
