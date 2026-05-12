import { toPositiveInteger } from "../lib/geometry.js";
import { scaleHeightFromWidth, scaleWidthFromHeight } from "../lib/export.js";
import { getCropBaseSize, syncResizeTargets } from "../lib/session.js";

export function createResizeActions({ session, applyTrackedChange }) {
  return {
    setResizeEnabled(enabled) {
      applyTrackedChange(() => {
        session.pipeline.resize.enabled = enabled;
        if (enabled) {
          syncResizeTargets(session, { force: true });
        }
      });
    },
    setResizeWidth(value) {
      applyTrackedChange(() => {
        const baseSize = getCropBaseSize(session);
        const width = toPositiveInteger(value, baseSize.width);
        session.pipeline.resize.targetWidth = width;
        if (session.pipeline.resize.keepAspectRatio) {
          session.pipeline.resize.targetHeight = scaleHeightFromWidth(baseSize, width);
        }
      });
    },
    setResizeHeight(value) {
      applyTrackedChange(() => {
        const baseSize = getCropBaseSize(session);
        const height = toPositiveInteger(value, baseSize.height);
        session.pipeline.resize.targetHeight = height;
        if (session.pipeline.resize.keepAspectRatio) {
          session.pipeline.resize.targetWidth = scaleWidthFromHeight(baseSize, height);
        }
      });
    },
    setKeepAspectRatio(keepAspectRatio) {
      applyTrackedChange(() => {
        session.pipeline.resize.keepAspectRatio = keepAspectRatio;
        if (keepAspectRatio) {
          const baseSize = getCropBaseSize(session);
          session.pipeline.resize.targetHeight = scaleHeightFromWidth(
            baseSize,
            session.pipeline.resize.targetWidth
          );
        }
      });
    },
    useCropSize() {
      applyTrackedChange(() => {
        syncResizeTargets(session, { force: true });
      });
    },
  };
}
