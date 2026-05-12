import { ADJUSTMENT_LIMITS, createDefaultAdjustments } from "../lib/adjustments.js";

export function createAdjustmentActions({ session, applyTrackedChange }) {
  return {
    setAdjustmentValue(key, value) {
      applyTrackedChange(() => {
        if (!(key in ADJUSTMENT_LIMITS)) {
          return;
        }

        session.pipeline.adjustments[key] = Number(value);
      });
    },
    setAdjustmentToggle(key, enabled) {
      applyTrackedChange(() => {
        session.pipeline.adjustments[key] = Boolean(enabled);
      });
    },
    resetAdjustments() {
      applyTrackedChange(() => {
        session.pipeline.adjustments = createDefaultAdjustments();
      });
    },
  };
}
