import type { ComponentType } from "react";

import { template as eventInviteTemplate } from "./event-invite";
import { template as familyWelcomeTemplate } from "./family-welcome";

/** Untyped template model — each template validates its own props at render time. */
export type TemplateData = Record<string, unknown>;

export interface TemplateEntry {
  /**
   * `never` keeps the registry open to any prop shape without resorting to `any`;
   * send-email.ts widens it to `ComponentType<TemplateData>` at the single render site.
   */
  component: ComponentType<never>;
  subject: string | ((data: TemplateData) => string);
  displayName?: string;
  previewData?: TemplateData;
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string;
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 *
 * Example:
 *   import { template as welcomeTemplate } from './welcome'
 *   // then add to TEMPLATES: 'welcome': welcomeTemplate
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  // Add templates here as they are created, e.g.:
  "family-welcome": familyWelcomeTemplate,
  "event-invite": eventInviteTemplate,
};
