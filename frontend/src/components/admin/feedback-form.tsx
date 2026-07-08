"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiFailureMessage, readJsonPayload } from "@/utils/api-error";

const labels = [
  { value: "NEEDS_REVIEW", label: "Needs review" },
  { value: "CONFIRMED_MALICIOUS", label: "Confirmed malicious" },
  { value: "CONFIRMED_CLEAN", label: "Confirmed clean" },
  { value: "FALSE_POSITIVE", label: "False positive" },
  { value: "FALSE_NEGATIVE", label: "False negative" },
];

export function FeedbackForm({ fileId }: { fileId: string }) {
  const router = useRouter();
  const [label, setLabel] = useState(labels[0].value);
  const [comment, setComment] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function submitFeedback() {
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileId, label, comment: comment || undefined }),
      });

      if (!response.ok) {
        const payload = await readJsonPayload(response);
        throw new Error(apiFailureMessage(payload, "Could not save feedback."));
      }

      toast.success("Feedback saved.");
      setComment("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save feedback.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <select
        value={label}
        onChange={(event) => setLabel(event.currentTarget.value)}
        className="h-10 w-full rounded-md border border-(--app-border) bg-(--app-surface) px-3 text-sm text-(--app-fg) shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
      >
        {labels.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Textarea
        value={comment}
        onChange={(event) => setComment(event.currentTarget.value)}
        placeholder="Optional reviewer note"
      />
      <Button onClick={submitFeedback} disabled={isSaving} className="w-full">
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <MessageSquarePlus className="h-4 w-4" aria-hidden />}
        Save feedback
      </Button>
    </div>
  );
}
