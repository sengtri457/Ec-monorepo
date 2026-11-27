import { describe, it, expect, vi, afterEach } from "vitest";
import {
  fetchRoadRoute,
  fetchRoadRouteMetrics,
} from "@/app/actions/fetch-road-route";

describe("fetchRoadRoute & fetchRoadRouteMetrics (OSRM GeoJSON [lng, lat])", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("queries OSRM in {lng},{lat} order and preserves GeoJSON [lng, lat] output without Leaflet reversal", async () => {
    const mockCoords: [number, number][] = [
      [104.8988, 11.5761],
      [104.912, 11.568],
      [104.9282, 11.5564],
    ];

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        code: "Ok",
        routes: [
          {
            distance: 4250.5,
            duration: 540.2,
            geometry: {
              type: "LineString",
              coordinates: mockCoords,
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchRoadRouteMetrics(11.5761, 104.8988, 11.5564, 104.9282);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestedUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(requestedUrl).toContain(
      "/route/v1/driving/104.8988,11.5761;104.9282,11.5564"
    );
    expect(requestedUrl).toContain("overview=full&geometries=geojson");

    expect(result.status).toBe("ok");
    expect(result.distanceMeters).toBe(4250.5);
    expect(result.durationSeconds).toBe(540.2);
    expect(result.coordinates).toEqual(mockCoords);

    const coordsOnly = await fetchRoadRoute(11.5761, 104.8988, 11.5564, 104.9282);
    expect(coordsOnly).toEqual(mockCoords);
  });

  it("rejects out-of-range or NaN input coordinates before making network requests", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchRoadRouteMetrics(95, 104.8988, 11.5564, 104.9282);
    expect(result.status).toBe("invalid-input");
    expect(result.coordinates).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("handles non-Ok OSRM codes and empty route geometry gracefully", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          code: "NoRoute",
          routes: [],
        }),
      })
    );

    const noRoute = await fetchRoadRouteMetrics(11.5761, 104.8988, 13.3633, 103.8564);
    expect(noRoute.status).toBe("no-route");
    expect(noRoute.coordinates).toEqual([]);
    expect(noRoute.distanceMeters).toBeNull();
    expect(noRoute.durationSeconds).toBeNull();
  });

  it("handles HTTP failures and thrown network errors without crashing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
      })
    );
    const httpErr = await fetchRoadRouteMetrics(11.5761, 104.8988, 11.5564, 104.9282);
    expect(httpErr.status).toBe("error");
    expect(httpErr.coordinates).toEqual([]);

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    const netErr = await fetchRoadRouteMetrics(11.5761, 104.8988, 11.5564, 104.9282);
    expect(netErr.status).toBe("error");
    expect(netErr.coordinates).toEqual([]);
  });
});
