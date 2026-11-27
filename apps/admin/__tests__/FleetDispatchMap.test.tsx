import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  cleanup,
} from "@testing-library/react";
import type { CourierData } from "@/components/dispatch/CourierTelemetryDrawer";

interface MockMarkerRecord {
  lngLat: [number, number] | null;
  removed: boolean;
  element?: HTMLElement;
  onClick?: () => void;
}

const mockState = vi.hoisted(() => ({
  mapInstances: [] as {
    options: Record<string, unknown>;
    removed: boolean;
    flyToCalls: Record<string, unknown>[];
    sources: Map<string, { data: unknown; setDataCalls: unknown[] }>;
    layers: Map<string, Record<string, unknown>>;
    controls: unknown[];
  }[],
  markerRecords: [] as MockMarkerRecord[],
  workerUrls: [] as string[],
}));

vi.mock("maplibre-gl", () => {
  class MockMap {
    options: Record<string, unknown>;
    removed = false;
    flyToCalls: Record<string, unknown>[] = [];
    sources = new Map<string, { data: unknown; setDataCalls: unknown[] }>();
    layers = new Map<string, Record<string, unknown>>();
    controls: unknown[] = [];
    private styleLoaded = false;

    constructor(options: Record<string, unknown>) {
      this.options = options;
      mockState.mapInstances.push(this);
    }

    on(event: string, cb: () => void) {
      if (event === "load") {
        queueMicrotask(() => {
          this.styleLoaded = true;
          cb();
        });
      }
      return this;
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

    flyTo(opts: Record<string, unknown>) {
      this.flyToCalls.push(opts);
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
        removed: false,
        element: opts?.element,
      };
      mockState.markerRecords.push(this.record);
    }
    setLngLat(coord: [number, number]) {
      this.record.lngLat = coord;
      return this;
    }
    setPopup() {
      return this;
    }
    on(event: string, cb: () => void) {
      if (event === "click") {
        this.record.onClick = cb;
      }
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

  class MockNavigationControl {}

  return {
    Map: MockMap,
    Marker: MockMarker,
    Popup: MockPopup,
    NavigationControl: MockNavigationControl,
    setWorkerUrl: (url: string) => {
      mockState.workerUrls.push(url);
    },
  };
});

import { FleetDispatchMap } from "@/components/dispatch/FleetDispatchMap";

function makeCourier(overrides: Partial<CourierData> = {}): CourierData {
  return {
    id: "cour-001",
    courierId: "CR-082",
    name: "Sokha Chan",
    phone: "+855 12 345 678",
    vehicleType: "SCOOTER",
    plateNumber: "1AB-2345",
    batteryPercent: 88,
    speedKmh: 34,
    bearing: 45,
    latitude: 11.5585,
    longitude: 104.9255,
    assignedOrderNumber: "ORD-9821",
    ...overrides,
  };
}

describe("FleetDispatchMap (pure MapLibre GL JS)", () => {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;

  beforeEach(() => {
    mockState.mapInstances.length = 0;
    mockState.markerRecords.length = 0;
    mockState.workerUrls.length = 0;
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({})) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  });

  afterEach(() => {
    cleanup();
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  it("initializes dark MapLibre map, hub marker, and keyed courier markers", async () => {
    const couriers = [
      makeCourier({ courierId: "CR-082", longitude: 104.9255, latitude: 11.5585 }),
      makeCourier({ id: "cour-002", courierId: "CR-104", longitude: 104.931, latitude: 11.552 }),
    ];
    const onSelectCourier = vi.fn();

    const { unmount } = render(
      <FleetDispatchMap
        couriers={couriers}
        selectedCourierId={null}
        onSelectCourier={onSelectCourier}
      />
    );

    await waitFor(() => {
      expect(mockState.mapInstances).toHaveLength(1);
      expect(mockState.markerRecords).toHaveLength(3);
    });

    const map = mockState.mapInstances[0]!;
    expect(mockState.workerUrls).toEqual(["/maplibre-gl-worker.mjs"]);
    expect(map.options.style).toBe("https://tiles.openfreemap.org/styles/dark");
    expect(map.options.center).toEqual([104.9282, 11.5564]);
    expect(mockState.markerRecords[0]?.lngLat).toEqual([104.9282, 11.5564]);
    expect(mockState.markerRecords[1]?.lngLat).toEqual([104.9255, 11.5585]);
    expect(mockState.markerRecords[2]?.lngLat).toEqual([104.931, 11.552]);

    // Click courier marker
    mockState.markerRecords[1]?.onClick?.();
    expect(onSelectCourier).toHaveBeenCalledWith("CR-082");

    unmount();
    expect(map.removed).toBe(true);
    expect(mockState.markerRecords.every((m) => m.removed)).toBe(true);
  });

  it("updates existing markers without duplicates, removes vanished couriers, and draws selected route", async () => {
    const initialCouriers = [
      makeCourier({ courierId: "CR-082", longitude: 104.9255, latitude: 11.5585 }),
      makeCourier({ id: "cour-002", courierId: "CR-104", longitude: 104.931, latitude: 11.552 }),
    ];

    const { rerender } = render(
      <FleetDispatchMap
        couriers={initialCouriers}
        selectedCourierId="CR-082"
        onSelectCourier={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(mockState.markerRecords).toHaveLength(3);
      expect(mockState.mapInstances[0]?.sources.has("selected-courier-route")).toBe(true);
    });

    const map = mockState.mapInstances[0]!;
    const cr082Marker = mockState.markerRecords[1]!;
    const cr104Marker = mockState.markerRecords[2]!;

    // Update CR-082 position, remove CR-104, add CR-219
    rerender(
      <FleetDispatchMap
        couriers={[
          makeCourier({ courierId: "CR-082", longitude: 104.9265, latitude: 11.5595 }),
          makeCourier({ id: "cour-003", courierId: "CR-219", longitude: 104.918, latitude: 11.564 }),
        ]}
        selectedCourierId="CR-082"
        onSelectCourier={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(cr082Marker.lngLat).toEqual([104.9265, 11.5595]);
    });

    expect(mockState.markerRecords).toHaveLength(4); // Hub + CR-082 + CR-104 + 1 new CR-219
    expect(cr104Marker.removed).toBe(true);
    expect(map.sources.get("selected-courier-route")?.setDataCalls.length).toBeGreaterThanOrEqual(1);

    // Clear selection clears route source
    rerender(
      <FleetDispatchMap
        couriers={[
          makeCourier({ courierId: "CR-082", longitude: 104.9265, latitude: 11.5595 }),
          makeCourier({ id: "cour-003", courierId: "CR-219", longitude: 104.918, latitude: 11.564 }),
        ]}
        selectedCourierId={null}
        onSelectCourier={vi.fn()}
      />
    );

    // Reset View button calls flyTo Phnom Penh Hub
    fireEvent.click(screen.getByRole("button", { name: /reset view/i }));
    expect(map.flyToCalls).toHaveLength(1);
    expect(map.flyToCalls[0]?.center).toEqual([104.9282, 11.5564]);
  });

  it("renders selectable dark courier fallback when WebGL is unavailable", async () => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    const onSelectCourier = vi.fn();

    render(
      <FleetDispatchMap
        couriers={[makeCourier({ courierId: "CR-082", name: "Sokha Chan" })]}
        selectedCourierId={null}
        onSelectCourier={onSelectCourier}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/WebGL Fleet Map Unavailable/i)).toBeTruthy();
    });
    expect(mockState.mapInstances).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: /CR-082/i }));
    expect(onSelectCourier).toHaveBeenCalledWith("CR-082");
  });
});
