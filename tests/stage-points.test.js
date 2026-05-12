import test from "node:test";
import assert from "node:assert/strict";

import { getNormalizedStagePoint, getStagePoint } from "../src/app/stage-points.js";

const elements = {
  stageCanvas: {
    getBoundingClientRect() {
      return { left: 10, top: 20, width: 400, height: 200 };
    },
  },
};

test("stage points clamp pointer coordinates to the canvas bounds", () => {
  assert.deepEqual(getStagePoint(elements, 500, -20), { x: 400, y: 0 });
  assert.deepEqual(getStagePoint(elements, 210, 120), { x: 200, y: 100 });
});

test("normalized stage points use current stage metrics", () => {
  const runtimeState = {
    stageMetrics: { displayWidth: 400, displayHeight: 200 },
  };

  assert.deepEqual(getNormalizedStagePoint(elements, runtimeState, { clientX: 210, clientY: 120 }), {
    x: 50,
    y: 50,
  });
});
