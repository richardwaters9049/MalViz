import { cn } from "@/lib/utils";

const tones = {
  neutral: "border-[var(--app-border)] bg-[var(--app-surface-muted)] text-[var(--app-fg)]",
  success: "border-cyan-200 bg-cyan-50 text-cyan-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-red-200 bg-red-50 text-red-700",
};

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
