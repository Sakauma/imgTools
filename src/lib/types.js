/**
 * @typedef {{ width: number, height: number }} Size
 * @typedef {{ x: number, y: number, width: number, height: number }} Rect
 *
 * @typedef {{
 *   rotateQuarterTurns: number,
 *   flipX: boolean,
 *   flipY: boolean,
 * }} OrientationState
 *
 * @typedef {{
 *   rect: Rect,
 *   aspectMode: string,
 *   customAspect: { width: number, height: number },
 * }} CropState
 *
 * @typedef {{
 *   enabled: boolean,
 *   targetWidth: number | null,
 *   targetHeight: number | null,
 *   keepAspectRatio: boolean,
 * }} ResizeState
 *
 * @typedef {{
 *   brightness: number,
 *   contrast: number,
 *   saturation: number,
 *   temperature: number,
 *   tint: number,
 *   grayscale: boolean,
 *   sepia: boolean,
 *   invert: boolean,
 *   blur: number,
 *   sharpen: number,
 * }} AdjustmentState
 *
 * @typedef {{
 *   enabled: boolean,
 *   aspectMode: string,
 *   customAspect: { width: number, height: number },
 * }} ExpandState
 *
 * @typedef {{
 *   backgroundColor: string | null,
 *   cornerRadius: number,
 *   borderWidth: number,
 *   borderColor: string,
 * }} AppearanceState
 *
 * @typedef {{
 *   grayscale: boolean,
 *   threshold: number,
 *   paperLift: number,
 *   lineFade: number,
 *   grain: number,
 *   paperTexture: number,
 *   halftone: number,
 * }} EffectsState
 *
 * @typedef {{
 *   id: string,
 *   type: "text" | "shape",
 *   x: number,
 *   y: number,
 *   width: number,
 *   height: number,
 *   rotation: number,
 *   opacity: number,
 *   blendMode: string,
 *   visible: boolean,
 *   zIndex: number,
 * }} BaseLayer
 *
 * @typedef {BaseLayer & {
 *   type: "text",
 *   text: string,
 *   fontFamily: string,
 *   fontSize: number,
 *   fontWeight: number,
 *   italic: boolean,
 *   letterSpacing: number,
 *   lineHeight: number,
 *   color: string,
 * }} TextLayer
 *
 * @typedef {BaseLayer & {
 *   type: "shape",
 *   shape: "rect",
 *   fillColor: string,
 *   strokeColor: string,
 *   strokeWidth: number,
 * }} ShapeLayer
 *
 * @typedef {TextLayer | ShapeLayer} Layer
 *
 * @typedef {{
 *   orientation: OrientationState,
 *   crop: CropState,
 *   resize: ResizeState,
 *   adjustments: AdjustmentState,
 *   expand: ExpandState,
 *   appearance: AppearanceState,
 *   layers: Layer[],
 *   effects: EffectsState,
 * }} Pipeline
 *
 * @typedef {{
 *   format: string,
 *   quality: number,
 *   fileName: string,
 * }} ExportOptions
 *
 * @typedef {{
 *   image: CanvasImageSource,
 *   name: string,
 *   width: number,
 *   height: number,
 *   token: string,
 * }} SourceState
 *
 * @typedef {{
 *   orientedKey: string,
 *   orientedCanvas: HTMLCanvasElement | OffscreenCanvas | null,
 *   outputKey: string,
 *   outputCanvas: HTMLCanvasElement | OffscreenCanvas | null,
 *   outputMeta: { cropSize: Size, contentSize: Size, outputSize: Size } | null,
 * }} PipelineCache
 *
 * @typedef {{
 *   source: SourceState | null,
 *   pipeline: Pipeline,
 *   exportOptions: ExportOptions,
 *   history: import("./history.js").HistoryState,
 *   cache: PipelineCache,
 * }} EditorSession
 */

export {};
