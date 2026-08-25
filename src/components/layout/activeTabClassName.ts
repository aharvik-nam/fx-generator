/**
 * shadcn's TabsTrigger sets its active-state background via a `dark:data-active:bg-input/30`
 * variant chain (see ui/tabs.tsx) — a plain `data-active:bg-[...]` override doesn't beat it,
 * since Tailwind resolves equal-specificity utilities by generated-CSS order, not class-list
 * order, and a shorter modifier chain isn't guaranteed to lose to `dark:data-active:...`. This
 * matches the exact chain being overridden so `cn()`/tailwind-merge dedupes it correctly.
 */
export const ACTIVE_TAB_CLASSNAME =
  'data-active:bg-[#2a2a31] data-active:text-white dark:data-active:border-transparent dark:data-active:bg-[#2a2a31] dark:data-active:text-white'
