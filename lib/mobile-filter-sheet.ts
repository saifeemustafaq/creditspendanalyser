/** Shared Tailwind classes for mobile filter bottom sheets. */

export const mobileFilterSheetContentClass =
  "z-[60] gap-0 rounded-t-2xl border-t pt-0 md:hidden";

export const mobileFilterSheetOverlayClass = "z-[60] bg-black/40 supports-backdrop-filter:backdrop-blur-sm";

export const mobileFilterSheetBodyClass = "flex flex-col gap-4 overflow-y-auto px-4 py-4";

export const mobileFilterSheetFooterClass =
  "border-t px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]";

export const mobileFilterTriggerClass = "w-full min-h-11";
