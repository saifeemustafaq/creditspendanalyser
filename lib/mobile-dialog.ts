/** Shared Tailwind classes for mobile-friendly dialogs (mobile optimization Hard rule §6). */

export const mobileDialogContentClass =
  "min-w-0 max-h-[90dvh] max-w-[calc(100%-1rem)] overflow-y-auto";

export const mobileDialogFooterClass =
  "flex-col-reverse gap-2 sm:flex-row sm:justify-end [&_[data-slot=button]]:h-auto [&_[data-slot=button]]:min-h-9 [&_[data-slot=button]]:w-full [&_[data-slot=button]]:whitespace-normal [&_[data-slot=button]]:px-3 [&_[data-slot=button]]:py-2.5 sm:[&_[data-slot=button]]:w-auto";

export const mobileDialogDescriptionClass = "break-words";
