import { createCenteredCropRect, flipCropRect, rotateCropRect } from "../lib/geometry.js";
import { getLockedCropRatio } from "../lib/session.js";

export function createOrientationActions({ session, applyTrackedChange }) {
  return {
    rotateLeft() {
      applyTrackedChange(() => {
        session.pipeline.orientation.rotateQuarterTurns =
          (session.pipeline.orientation.rotateQuarterTurns + 3) % 4;
        session.pipeline.crop.rect = rotateCropRect(session.pipeline.crop.rect, 3);
      });
    },
    rotateRight() {
      applyTrackedChange(() => {
        session.pipeline.orientation.rotateQuarterTurns =
          (session.pipeline.orientation.rotateQuarterTurns + 1) % 4;
        session.pipeline.crop.rect = rotateCropRect(session.pipeline.crop.rect, 1);
      });
    },
    rotate180() {
      applyTrackedChange(() => {
        session.pipeline.orientation.rotateQuarterTurns =
          (session.pipeline.orientation.rotateQuarterTurns + 2) % 4;
        session.pipeline.crop.rect = rotateCropRect(session.pipeline.crop.rect, 2);
      });
    },
    resetOrientation() {
      applyTrackedChange(() => {
        session.pipeline.orientation.rotateQuarterTurns = 0;
        session.pipeline.orientation.flipX = false;
        session.pipeline.orientation.flipY = false;
        session.pipeline.crop.rect = createCenteredCropRect({
          ratio: getLockedCropRatio(session),
        });
      });
    },
    flipHorizontal() {
      applyTrackedChange(() => {
        session.pipeline.orientation.flipX = !session.pipeline.orientation.flipX;
        session.pipeline.crop.rect = flipCropRect(session.pipeline.crop.rect, {
          horizontal: true,
        });
      });
    },
    flipVertical() {
      applyTrackedChange(() => {
        session.pipeline.orientation.flipY = !session.pipeline.orientation.flipY;
        session.pipeline.crop.rect = flipCropRect(session.pipeline.crop.rect, {
          vertical: true,
        });
      });
    },
  };
}
