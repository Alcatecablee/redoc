import { cn } from "@/lib/utils";

const SkipNavigation = () => {
  return (
    <a
      href="#main-content"
      className={cn(
        "sr-only focus:not-sr-only",
        "fixed top-4 left-4 z-[100]",
        "bg-primary text-primary-foreground",
        "px-4 py-2 rounded-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "transition-all duration-200"
      )}
    >
      Skip to main content
    </a>
  );
};

export default SkipNavigation;
