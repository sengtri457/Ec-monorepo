export type BasemapTheme = "light" | "dark";

export interface LeafletLayerLike {
  addTo(map: never): unknown;
}

export interface LeafletLike {
  tileLayer(
    urlTemplate: string,
    options?: {
      attribution?: string;
      maxZoom?: number;
      className?: string;
    }
  ): LeafletLayerLike;
}

export type MaplibreGLFactory = (options: {
  style: string;
  padding?: number;
}) => LeafletLayerLike;

export interface AttachBasemapOptions<TMap = unknown> {
  L: LeafletLike;
  map: TMap;
  maplibreGL: MaplibreGLFactory;
  setWorkerUrl?: (url: string) => void;
  workerUrl?: string;
  theme: BasemapTheme;
  customStyleUrl?: string;
  maxZoom?: number;
  darkFallbackClassName?: string;
}

export interface AttachBasemapResult {
  mode: "vector" | "raster-fallback";
  layer: LeafletLayerLike;
}

export declare const OPENFREEMAP_STYLES: Readonly<Record<BasemapTheme, string>>;
export declare const OSM_FALLBACK_TILE_URL: string;
export declare const DEFAULT_MAPLIBRE_WORKER_URL: string;

export declare function resolveStyleUrl(theme: BasemapTheme, customStyleUrl?: string): string;

export declare function attachBasemapLayer<TMap = unknown>(
  options: AttachBasemapOptions<TMap>
): AttachBasemapResult;
