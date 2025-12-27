export type EffectParams = {
  brightness: number;
  contrast: number;
  saturation: number;
  vignette: number;
  grain: number;
  fisheye: number;
  zoom: number;
};

export const defaultParams: EffectParams = {
  brightness: 0.0,
  contrast: 1.0,
  saturation: 1.0,
  vignette: 0.2,
  grain: 0.15,
  fisheye: -0.12,
  zoom: 1.0
};
