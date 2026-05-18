import { cn } from "@/lib/utils";

/** Subtle pitch-line grid decoration used behind hero sections. */
export function FieldGridOverlay({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={cn("absolute inset-0 h-full w-full pointer-events-none", className)}
      width="100%"
      height="100%"
    >
      <defs>
        <pattern id="field-grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#field-grid)" className="text-white" opacity="0.06" />
    </svg>
  );
}
