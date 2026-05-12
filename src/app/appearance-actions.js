import { APPEARANCE_LIMITS, createDefaultAppearance } from "../lib/appearance.js";
import { createDefaultExpand } from "../lib/expand.js";
import { toPositiveInteger } from "../lib/geometry.js";

export function createAppearanceActions({ session, applyTrackedChange }) {
  return {
    setExpandEnabled(enabled) {
      applyTrackedChange(() => {
        session.pipeline.expand.enabled = Boolean(enabled);
      });
    },
    setExpandAspectMode(mode) {
      applyTrackedChange(() => {
        session.pipeline.expand.aspectMode = mode;
      });
    },
    setExpandCustomAspectWidth(value) {
      applyTrackedChange(() => {
        session.pipeline.expand.aspectMode = "custom";
        session.pipeline.expand.customAspect.width = toPositiveInteger(
          value,
          session.pipeline.expand.customAspect.width
        );
      });
    },
    setExpandCustomAspectHeight(value) {
      applyTrackedChange(() => {
        session.pipeline.expand.aspectMode = "custom";
        session.pipeline.expand.customAspect.height = toPositiveInteger(
          value,
          session.pipeline.expand.customAspect.height
        );
      });
    },
    resetExpand() {
      applyTrackedChange(() => {
        session.pipeline.expand = createDefaultExpand();
      });
    },
    setAppearanceBackgroundEnabled(enabled) {
      applyTrackedChange(() => {
        session.pipeline.appearance.backgroundColor = enabled
          ? session.pipeline.appearance.backgroundColor || "#f8fafc"
          : null;
      });
    },
    setAppearanceBackgroundColor(value) {
      applyTrackedChange(() => {
        session.pipeline.appearance.backgroundColor = value;
      });
    },
    setAppearanceCornerRadius(value) {
      applyTrackedChange(() => {
        session.pipeline.appearance.cornerRadius = Math.min(
          APPEARANCE_LIMITS.cornerRadius.max,
          Math.max(0, Number(value) || 0)
        );
      });
    },
    setAppearanceBorderEnabled(enabled) {
      applyTrackedChange(() => {
        session.pipeline.appearance.borderWidth = enabled
          ? Math.max(1, Number(session.pipeline.appearance.borderWidth) || 1)
          : 0;
      });
    },
    setAppearanceBorderWidth(value) {
      applyTrackedChange(() => {
        session.pipeline.appearance.borderWidth = Math.min(
          APPEARANCE_LIMITS.borderWidth.max,
          Math.max(0, Number(value) || 0)
        );
      });
    },
    setAppearanceBorderColor(value) {
      applyTrackedChange(() => {
        session.pipeline.appearance.borderColor = value;
      });
    },
    resetAppearance() {
      applyTrackedChange(() => {
        session.pipeline.appearance = createDefaultAppearance();
      });
    },
  };
}
