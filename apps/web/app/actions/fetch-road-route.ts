"use server";

import {
  isValidCoordinate,
  isValidLatLng,
  type MapCoordinate,
} from "@ec/map-basemap";

export interface RoadRouteResult {
  coordinates: MapCoordinate[];
  distanceMeters: number | null;
  durationSeconds: number | null;
  status: "ok" | "invalid-input" | "no-route" | "error";
}

const DEFAULT_OSRM_BASE_URL = "https://router.project-osrm.org";

/**
 * Server Action — runs on the server (no CORS issues, full Node.js fetch).
 * Queries Open Source Routing Machine (OSRM) and returns validated GeoJSON
 * [longitude, latitude] coordinates plus OSRM distance and duration metrics.
 */
export async function fetchRoadRouteMetrics(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<RoadRouteResult> {
  if (
    !isValidLatLng(originLat, originLng) ||
    !isValidLatLng(destLat, destLng)
  ) {
    return {
      coordinates: [],
      distanceMeters: null,
      durationSeconds: null,
      status: "invalid-input",
    };
  }

  const baseUrl = (
    process.env.OSRM_BASE_URL || DEFAULT_OSRM_BASE_URL
  ).replace(/\/+$/, "");

  // OSRM expects coordinates in {longitude},{latitude} order
  const url =
    `${baseUrl}/route/v1/driving/` +
    `${originLng},${originLat};${destLng},${destLat}` +
    `?overview=full&geometries=geojson`;

  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "Clothes-Apparel-Cambodia/1.0" },
      signal: AbortSignal.timeout(15_000),
      next: { revalidate: 600 },
    });

    if (!resp.ok) {
      console.warn(`[fetchRoadRoute] OSRM responded with status ${resp.status}`);
      return {
        coordinates: [],
        distanceMeters: null,
        durationSeconds: null,
        status: "error",
      };
    }

    const data = await resp.json();
    if (data?.code !== "Ok") {
      console.warn(`[fetchRoadRoute] OSRM returned non-Ok code: ${data?.code}`);
      return {
        coordinates: [],
        distanceMeters: null,
        durationSeconds: null,
        status: "no-route",
      };
    }

    const primaryRoute = data?.routes?.[0];
    const rawCoords: unknown[] = primaryRoute?.geometry?.coordinates ?? [];
    const coordinates = rawCoords.filter((coord): coord is MapCoordinate =>
      isValidCoordinate(coord)
    );

    if (coordinates.length === 0) {
      return {
        coordinates: [],
        distanceMeters: null,
        durationSeconds: null,
        status: "no-route",
      };
    }

    const distanceMeters =
      typeof primaryRoute?.distance === "number" &&
      Number.isFinite(primaryRoute.distance)
        ? primaryRoute.distance
        : null;
    const durationSeconds =
      typeof primaryRoute?.duration === "number" &&
      Number.isFinite(primaryRoute.duration)
        ? primaryRoute.duration
        : null;

    // Pass GeoJSON [longitude, latitude] geometry directly to MapLibre
    return {
      coordinates,
      distanceMeters,
      durationSeconds,
      status: "ok",
    };
  } catch (err) {
    console.error("[fetchRoadRoute] Error fetching road geometry:", err);
    return {
      coordinates: [],
      distanceMeters: null,
      durationSeconds: null,
      status: "error",
    };
  }
}

/**
 * Queries OSRM and returns GeoJSON [longitude, latitude] coordinates directly for MapLibre.
 */
export async function fetchRoadRoute(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<MapCoordinate[]> {
  const result = await fetchRoadRouteMetrics(
    originLat,
    originLng,
    destLat,
    destLng
  );
  return result.coordinates;
}
