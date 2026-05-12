import {
  MIN_CROP_SIZE,
  constrainCropToAspect,
  createCenteredCropRect,
  toPositiveInteger,
} from "../lib/geometry.js";
import { getLockedCropRatio, getOrientedSourceSize } from "../lib/session.js";

export function createCropActions({ session, applyTrackedChange }) {
  function getMinimumCropRatios() {
    const oriented = getOrientedSourceSize(session);
    return {
      minWidthRatio: MIN_CROP_SIZE / oriented.width,
      minHeightRatio: MIN_CROP_SIZE / oriented.height,
    };
  }

  return {
    setCropAspectMode(mode) {
      applyTrackedChange(() => {
        session.pipeline.crop.aspectMode = mode;
        session.pipeline.crop.rect = constrainCropToAspect(
          session.pipeline.crop.rect,
          getLockedCropRatio(session),
          getMinimumCropRatios()
        );
      });
    },
    setCustomAspectWidth(value) {
      applyTrackedChange(() => {
        session.pipeline.crop.aspectMode = "custom";
        session.pipeline.crop.customAspect.width = toPositiveInteger(
          value,
          session.pipeline.crop.customAspect.width
        );
        session.pipeline.crop.rect = constrainCropToAspect(
          session.pipeline.crop.rect,
          getLockedCropRatio(session),
          getMinimumCropRatios()
        );
      });
    },
    setCustomAspectHeight(value) {
      applyTrackedChange(() => {
        session.pipeline.crop.aspectMode = "custom";
        session.pipeline.crop.customAspect.height = toPositiveInteger(
          value,
          session.pipeline.crop.customAspect.height
        );
        session.pipeline.crop.rect = constrainCropToAspect(
          session.pipeline.crop.rect,
          getLockedCropRatio(session),
          getMinimumCropRatios()
        );
      });
    },
    centerCrop() {
      applyTrackedChange(() => {
        const rect = session.pipeline.crop.rect;
        session.pipeline.crop.rect = {
          ...rect,
          x: (1 - rect.width) / 2,
          y: (1 - rect.height) / 2,
        };
      });
    },
    resetCrop() {
      applyTrackedChange(
        () => {
          session.pipeline.crop.rect = createCenteredCropRect({
            ratio: getLockedCropRatio(session),
          });
        },
        { forceResizeTargets: !session.pipeline.resize.enabled }
      );
    },
  };
}
