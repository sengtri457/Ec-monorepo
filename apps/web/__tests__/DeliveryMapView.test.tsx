import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  cleanup,
} from "@testing-library/react";
import type { DeliveryShipment } from "@/types";

interface MockMarkerRecord {
  lngLat: [number, number] | null;
  setLngLatCalls: [number, number][];
  removed: boolean;
  element?: HTMLElement;
}

const mockState = vi.hoisted(() => ({
  mapInstances: [] as {
    options: Record<string, unknown>;
    removed: boolean;
    fitBoundsCalls: number;
    sources: Map<string, { data: unknown; setDataCalls: unknown[] }>;
    layers: Map<string, Record<string, unknown>>;
    controls: unknown[];
    handlers: Map<string, ((ev?: unknown) => void)[]>;
    trigger: (event: string, payload?: unknown) => void;
  }[],
  markerRecords: [] as MockMarkerRecord[],
  workerUrls: [] as string[],
  fetchRoadRouteMetrics: vi.fn(),
}));

vi.mock("@/app/actions/fetch-road-route", () => ({
  fetchRoadRouteMetrics: mockState.fetchRoadRouteMetrics,
  fetchRoadRoute: vi.fn(async () => []),
}));

vi.mock("maplibre-gl", () => {
  class MockMap {
    options: Record<string, unknown>;
    removed = false;
    fitBoundsCalls = 0;
    sources = new Map<string, { data: unknown; setDataCalls: unknown[] }>();
    layers = new Map<string, Record<string, unknown>>();
    controls: unknown[] = [];
    handlers = new Map<string, ((ev?: unknown) => void)[]>();
    private styleLoaded = false;

    constructor(options: Record<string, unknown>) {
      this.options = options;
      mockState.mapInstances.push(this);
    }

    on(event: string, cb: (ev?: unknown) => void) {
      const list = this.handlers.get(event) ?? [];
      list.push(cb);
      this.handlers.set(event, list);
      if (event === "load") {
        queueMicrotask(() => {
          this.styleLoaded = true;
          cb();
        });
      }
      return this;
    }

    trigger(event: string, payload?: unknown) {
      if (event === "load") this.styleLoaded = true;
      for (const cb of this.handlers.get(event) ?? []) {
        cb(payload);
      }
    }

    isStyleLoaded() {
      return this.styleLoaded;
    }

    addControl(control: unknown) {
      this.controls.push(control);
      return this;
    }

    getSource(id: string) {
      const src = this.sources.get(id);
      if (!src) return undefined;
      return {
        setData(next: unknown) {
          src.data = next;
          src.setDataCalls.push(next);
        },
      };
    }

    getLayer(id: string) {
      return this.layers.get(id);
    }

    addSource(id: string, spec: { data: unknown }) {
      this.sources.set(id, { data: spec.data, setDataCalls: [] });
    }

    addLayer(spec: Record<string, unknown> & { id: string }) {
      this.layers.set(spec.id, spec);
    }

    fitBounds() {
      this.fitBoundsCalls += 1;
    }

    remove() {
      this.removed = true;
    }
  }

  class MockMarker {
    private record: MockMarkerRecord;
    constructor(opts?: { element?: HTMLElement }) {
      this.record = {
        lngLat: null,
        setLngLatCalls: [],
        removed: false,
        element: opts?.element,
      };
      mockState.markerRecords.push(this.record);
    }
    setLngLat(coord: [number, number]) {
      this.record.lngLat = coord;
      this.record.setLngLatCalls.push(coord);
      return this;
    }
    setPopup() {
      return this;
    }
    on() {
      return this;
    }
    addTo() {
      return this;
    }
    remove() {
      this.record.removed = true;
    }
  }

  class MockPopup {
    setHTML() {
      return this;
    }
  }

  class MockLngLatBounds {
    extend() {
      return this;
    }
  }

  class MockNavigationControl {}
  class MockScaleControl {}

  return {
    Map: MockMap,
    Marker: MockMarker,
    Popup: MockPopup,
    LngLatBounds: MockLngLatBounds,
    NavigationControl: MockNavigationControl,
    ScaleControl: MockScaleControl,
    setWorkerUrl: (url: string) => {
      mockState.workerUrls.push(url);
    },
  };
});

import DeliveryMapView from "@/components/delivery/DeliveryMapView";

function makeShipment(overrides: Partial<DeliveryShipment> = {}): DeliveryShipment {
  return {
    id: "ship-1",
    orderNumber: "ORD-1001",
    trackingNumber: "KH-20261126-ABCD",
    courierName: "Clothes Express Phnom Penh",
    courierPhone: "+855 12 889 900",
    driverName: "Sokha V.",
    driverPhone: "+855 98 765 432",
    vehicleInfo: "Honda Dream 125",
    status: "OUT_FOR_DELIVERY",
    shippingMethodCode: "phnom_penh_express",
    destinationCity: "Phnom Penh",
    destinationAddress: "House #42, St 310, Chamkarmon",
    recipientName: "Bopha Devi",
    recipientPhone: "012889900",
    originLat: 11.5761,
    originLng: 104.8988,
    destLat: 11.5422,
    destLng: 104.9282,
    currentLat: 11.562,
    currentLng: 104.915,
    heading: 135,
    speed: 28,
    timeline: [],
    createdAt: "2026-11-26T14:00:00Z",
    updatedAt: "2026-11-26T15:00:10Z",
    ...overrides,
  };
}

describe("DeliveryMapView (pure MapLibre GL JS)", () => {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;

  beforeEach(() => {
    mockState.mapInstances.length = 0;
    mockState.markerRecords.length = 0;
    mockState.workerUrls.length = 0;
    mockState.fetchRoadRouteMetrics.mockReset();
    mockState.fetchRoadRouteMetrics.mockResolvedValue({
      coordinates: [
        [104.915, 11.562],
        [104.922, 11.551],
        [104.9282, 11.5422],
      ],
      distanceMeters: 3800,
      durationSeconds: 540,
      status: "ok",
    });

    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({})) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  });

  afterEach(() => {
    cleanup();
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  it("initializes MapLibre with Positron style, worker URL, 3 markers, and GeoJSON OSRM route", async () => {
    const shipment = makeShipment();
    const { unmount } = render(<DeliveryMapView shipment={shipment} />);

    await waitFor(() => {
      expect(mockState.mapInstances).toHaveLength(1);
      expect(mockState.mapInstances[0]?.sources.has("delivery-route")).toBe(true);
    });

    const map = mockState.mapInstances[0]!;
    expect(mockState.workerUrls).toEqual(["/maplibre-gl-worker.mjs"]);
    expect(map.options.style).toBe("https://tiles.openfreemap.org/styles/positron");
    expect(map.options.center).toEqual([104.915, 11.562]);
    expect(map.controls.length).toBe(2);
    expect(mockState.markerRecords).toHaveLength(3);
    expect(mockState.markerRecords[0]?.lngLat).toEqual([104.8988, 11.5761]);
    expect(mockState.markerRecords[1]?.lngLat).toEqual([104.9282, 11.5422]);
    expect(mockState.markerRecords[2]?.lngLat).toEqual([104.915, 11.562]);
    expect(map.layers.has("delivery-route-line")).toBe(true);
    expect(map.fitBoundsCalls).toBe(1);
    expect(screen.getByText(/3\.8 km/)).toBeTruthy();

    unmount();
    expect(map.removed).toBe(true);
    expect(mockState.markerRecords.every((m) => m.removed)).toBe(true);
  });

  it("updates rider marker via setLngLat without recreating map, spamming OSRM, or accepting stale GPS", async () => {
    const initial = makeShipment();
    const { rerender } = render(<DeliveryMapView shipment={initial} />);

    await waitFor(() => {
      expect(mockState.mapInstances).toHaveLength(1);
      expect(mockState.fetchRoadRouteMetrics).toHaveBeenCalledTimes(1);
    });

    const map = mockState.mapInstances[0]!;
    const riderMarker = mockState.markerRecords[2]!;

    // Small newer GPS tick (~30m): should update marker via setLngLat only
    rerender(
      <DeliveryMapView
        shipment={makeShipment({
          currentLat: 11.5622,
          currentLng: 104.9152,
          updatedAt: "2026-11-26T15:00:20Z",
        })}
      />
    );

    await waitFor(() => {
      expect(riderMarker.lngLat).toEqual([104.9152, 11.5622]);
    });
    expect(mockState.mapInstances).toHaveLength(1);
    expect(mockState.markerRecords).toHaveLength(3);
    expect(mockState.fetchRoadRouteMetrics).toHaveBeenCalledTimes(1);
    expect(map.fitBoundsCalls).toBe(1);

    // Older stale GPS tick: should be ignored
    rerender(
      <DeliveryMapView
        shipment={makeShipment({
          currentLat: 11.57,
          currentLng: 104.901,
          updatedAt: "2026-11-26T15:00:05Z",
        })}
      />
    );
    expect(riderMarker.lngLat).toEqual([104.9152, 11.5622]);

    // Manual Recenter button triggers fitBounds
    const recenterBtn = screen.getByRole("button", { name: /recenter/i });
    fireEvent.click(recenterBtn);
    expect(map.fitBoundsCalls).toBe(2);
  });

  it("renders accessible text fallback UI when WebGL is unavailable", async () => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext;

    render(<DeliveryMapView shipment={makeShipment()} />);

    await waitFor(() => {
      expect(screen.getByText(/WebGL Map Preview Unavailable/i)).toBeTruthy();
    });
    expect(mockState.mapInstances).toHaveLength(0);
    expect(screen.getByText(/House #42, St 310, Chamkarmon/i)).toBeTruthy();
    expect(screen.getByText(/11\.56200, 104\.91500/)).toBeTruthy();
  });
});
