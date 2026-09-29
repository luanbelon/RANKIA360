export type AnalyticsEvent =
  | "audit_started"
  | "audit_completed"
  | "lead_form_opened"
  | "lead_submitted"
  | "agency_cta_clicked"
  | "contact_clicked"
  | "blog_clicked";

/** Local event seam; connect Plausible, PostHog, or GA here when configured. */
export function trackEvent(name: AnalyticsEvent, detail?: Record<string, string | number | boolean>): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("asa:analytics", { detail: { name, ...detail } }));
}
