import React, { useEffect, useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "react-hot-toast";
import apiClient from "../../../api/client";

const Faq = () => {
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [faqSectionId, setFaqSectionId] = useState(null);
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.get("/api/cms/faqs");
        if (response.data.success) {
          const responseData = response.data.data;

          if (Array.isArray(responseData) && responseData.length > 0) {
            const firstItem = responseData[0];
            setFaqSectionId(firstItem.id ?? null);
            const cards = (firstItem.cards || []).map((item) => ({
              id: item.id,
              question: item.question || item.name || "",
              answer: item.answer || item.card_description || "",
            }));

            setIsEditing(true);
            reset({
              short_heading: firstItem.short_heading || "",
              heading: firstItem.heading || "",
              description: firstItem.description || "",
              is_active: Boolean(firstItem.is_active),
              cards,
            });
          } else if (
            responseData &&
            typeof responseData === "object" &&
            Object.keys(responseData).length > 0
          ) {
            setIsEditing(true);
            setFaqSectionId(responseData.id ?? null);
            reset({
              short_heading: responseData.short_heading || "",
              heading: responseData.heading || "",
              description: responseData.description || "",
              is_active: Boolean(responseData.is_active),
              cards: (responseData.cards || []).map((item) => ({
                id: item.id,
                question: item.question || item.name || "",
                answer: item.answer || item.card_description || "",
              })),
            });
          }
        }
      } catch (error) {
        console.error("Error fetching FAQ data:", error);
        if (error.response?.status !== 404) {
          toast.error("Failed to load FAQ configuration");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [reset]);

  const onSubmit = async (data) => {
    try {
      const payload = {
        short_heading: data.short_heading || "",
        heading: data.heading || "",
        description: data.description || "",
        is_active: data.is_active,
        cards: (data.cards || []).map((card) => ({
          question: card.question || "",
          answer: card.answer || "",
        })),
      };

      let response;
      if (isEditing && faqSectionId) {
        response = await apiClient.post("/api/cms/faqs-bulk", {
          id: faqSectionId,
          ...payload,
        });
      } else {
        response = await apiClient.post("/api/cms/faqs", {
          ...payload,
          order: 0,
        });
      }

      if (response.data.success) {
        toast.success(
          `FAQ section ${isEditing ? "updated" : "created"} successfully`,
        );
        const updatedData = response.data.data;

        if (Array.isArray(updatedData) && updatedData.length > 0) {
          const firstItem = updatedData[0];
          setFaqSectionId(firstItem.id ?? null);
          const cards = (firstItem.cards || []).map((item) => ({
            id: item.id,
            question: item.question || item.name || "",
            answer: item.answer || item.card_description || "",
          }));

          setIsEditing(true);
          reset({
            short_heading: firstItem.short_heading || "",
            heading: firstItem.heading || "",
            description: firstItem.description || "",
            is_active: Boolean(firstItem.is_active),
            cards,
          });
        } else if (updatedData && typeof updatedData === "object") {
          setIsEditing(true);
          setFaqSectionId(updatedData.id ?? null);
          reset({
            short_heading: updatedData.short_heading || "",
            heading: updatedData.heading || "",
            description: updatedData.description || "",
            is_active: Boolean(updatedData.is_active),
            cards: (updatedData.cards || []).map((item) => ({
              id: item.id,
              question: item.question || item.name || "",
              answer: item.answer || item.card_description || "",
            })),
          });
        }
      } else {
        toast.error(response.data.message || "Failed to save");
      }
    } catch (error) {
      console.error("Error saving FAQ:", error);
      toast.error(
        error.response?.data?.message || "Failed to save FAQ section",
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
      "Are you sure you want to delete this question?",
    );
    if (!confirmed) return;

    try {
      await apiClient.delete(`/api/cms/faqs/${cardId}`);
      toast.success("Question deleted successfully");
      removeCard(index);
    } catch (error) {
      console.error("Error deleting question:", error);
      toast.error(error.response?.data?.message || "Failed to delete question");
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
          <h2 className="text-xl font-semibold text-neutral-900">FAQ</h2>
          <p className="text-sm text-neutral-500 mt-1">
            Manage frequently asked questions
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
            placeholder="e.g., Common Questions"
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
            placeholder="Enter FAQ section description"
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-neutral-700">
              Questions
            </label>
            <button
              type="button"
              onClick={() => appendCard({ question: "", answer: "" })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium 
                       text-neutral-700 bg-white border border-neutral-300 rounded-lg 
                       hover:bg-neutral-50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Question
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
                    Question {index + 1}
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
                      Question
                    </label>
                    <input
                      type="text"
                      {...register(`cards.${index}.question`)}
                      className="w-full px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg 
                               focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                               transition-shadow placeholder:text-neutral-400"
                      placeholder="Enter question"
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-xs font-medium text-neutral-600">
                      Answer
                    </label>
                    <textarea
                      {...register(`cards.${index}.answer`)}
                      rows="3"
                      className="w-full px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg 
                               focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                               transition-shadow placeholder:text-neutral-400 resize-none"
                      placeholder="Enter answer"
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

export default Faq;
