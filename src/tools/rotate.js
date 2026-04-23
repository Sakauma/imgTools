export const rotateTool = {
  id: "rotate",
  label: "旋转",
  hint: "旋转和翻转总是在裁剪之前应用。",
  render(root, session, actions) {
    const rotation = session.transforms.rotateQuarterTurns * 90;
    root.innerHTML = `
      <div class="button-row">
        <button id="rotateLeftBtn" type="button">左转 90°</button>
        <button id="rotateRightBtn" type="button">右转 90°</button>
      </div>

      <div class="button-row">
        <button id="rotate180Btn" type="button">旋转 180°</button>
        <button id="resetOrientationBtn" type="button">恢复方向</button>
      </div>

      <div class="button-row">
        <button id="flipHorizontalBtn" type="button">水平翻转</button>
        <button id="flipVerticalBtn" type="button">垂直翻转</button>
      </div>

      <div class="tool-summary">
        <strong>当前方向</strong>
        旋转 ${rotation}° · ${session.transforms.flipX ? "水平翻转" : "未水平翻转"} · ${session.transforms.flipY ? "垂直翻转" : "未垂直翻转"}
      </div>
    `;

    root.querySelector("#rotateLeftBtn").addEventListener("click", actions.rotateLeft);
    root.querySelector("#rotateRightBtn").addEventListener("click", actions.rotateRight);
    root.querySelector("#rotate180Btn").addEventListener("click", actions.rotate180);
    root.querySelector("#resetOrientationBtn").addEventListener("click", actions.resetOrientation);
    root.querySelector("#flipHorizontalBtn").addEventListener("click", actions.flipHorizontal);
    root.querySelector("#flipVerticalBtn").addEventListener("click", actions.flipVertical);
  },
};
