"use server";

/**
 * Server Action — runs on the server (no CORS issues, full Node.js fetch).
 * Queries Open Source Routing Machine (OSRM) to calculate realistic
 * road-following polyline coordinates across Cambodia.
 */
export async function fetchRoadRoute(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<[number, number][]> {
  // OSRM expects coordinates in {longitude},{latitude} order
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${originLng},${originLat};${destLng},${destLat}` +
    `?overview=full&geometries=geojson`;

  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "Clothes-Apparel-Cambodia/1.0" },
      signal: AbortSignal.timeout(15_000),
      next: { revalidate: 600 }, // Cache 10 minutes for fast repeated loads
    });

    if (!resp.ok) {
      console.warn(`[fetchRoadRoute] OSRM responded with status ${resp.status}`);
      return [];
    }

    const data = await resp.json();
    if (data?.code !== "Ok") {
      console.warn(`[fetchRoadRoute] OSRM returned non-Ok code: ${data?.code}`);
      return [];
    }

    const coords: [number, number][] =
      data?.routes?.[0]?.geometry?.coordinates ?? [];

    if (!coords.length) {
      return [];
    }

    // Convert OSRM [longitude, latitude] to Leaflet [latitude, longitude]
    return coords.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]);
  } catch (err) {
    console.error("[fetchRoadRoute] Error fetching road geometry:", err);
    return [];
  }
}
