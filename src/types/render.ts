// RenderState/RenderQuality are defined in effect.ts alongside the EffectNode/CameraState
// types they're composed from (avoids a circular import). Re-exported here so `render.ts`
// remains the discoverable entry point named in the architecture doc.
export type { RenderState, RenderQuality, RenderSurface, CameraState } from './effect'
