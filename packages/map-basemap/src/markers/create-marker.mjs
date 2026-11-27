import {
  Marker as DefaultMarker,
  Popup as DefaultPopup,
} from "maplibre-gl";
import { toMapCoordinate } from "../geo/coordinates.mjs";
import { isValidCoordinate } from "../geo/validation.mjs";
import { MapInitializationError } from "../utils/map-errors.mjs";

/**
 * Creates a MapLibre DOM Marker at a validated [longitude, latitude] coordinate.
 * @template TMap
 * @param {{
 *   map: TMap;
 *   coordinate: readonly [number, number];
 *   element: HTMLElement;
 *   anchor?: "center" | "top" | "bottom" | "left" | "right" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
 *   offset?: [number, number];
 *   popupHtml?: string;
 *   onClick?: () => void;
 *   MarkerConstructor?: typeof DefaultMarker;
 *   PopupConstructor?: typeof DefaultPopup;
 * }} options
 * @returns {{ marker: DefaultMarker; cleanup: () => void }}
 */
export function createHtmlMarker({
  map,
  coordinate,
  element,
  anchor = "bottom",
  offset,
  popupHtml,
  onClick,
  MarkerConstructor = DefaultMarker,
  PopupConstructor = DefaultPopup,
}) {
  if (!isValidCoordinate(coordinate)) {
    throw new MapInitializationError(
      "INVALID_COORDINATE",
      `Invalid marker coordinate: ${JSON.stringify(coordinate)}`
    );
  }

  const marker = new MarkerConstructor({
    element,
    anchor,
    ...(offset !== undefined ? { offset } : {}),
  }).setLngLat([coordinate[0], coordinate[1]]);

  if (popupHtml) {
    const popup = new PopupConstructor({ offset: 18 }).setHTML(popupHtml);
    marker.setPopup(popup);
  }

  if (typeof onClick === "function") {
    marker.on("click", onClick);
  }

  marker.addTo(/** @type {any} */ (map));

  return {
    marker,
    cleanup() {
      marker.remove();
    },
  };
}

/**
 * Synchronizes a keyed MapLibre Marker registry against an active courier dataset
 * without destroying/recreating existing markers or registering duplicate listeners.
 * @template {{ courierId: string; longitude: number; latitude: number }} TCourier
 * @param {{
 *   map: unknown;
 *   registry: Map<string, { marker: DefaultMarker; element: HTMLElement; cleanup: () => void }>;
 *   couriers: readonly TCourier[];
 *   selectedCourierId: string | null;
 *   createMarkerElement: (courier: TCourier, isSelected: boolean) => HTMLElement;
 *   updateMarkerElement?: (element: HTMLElement, courier: TCourier, isSelected: boolean) => void;
 *   onSelect?: (courierId: string) => void;
 *   MarkerConstructor?: typeof DefaultMarker;
 * }} options
 */
export function syncCourierMarkers({
  map,
  registry,
  couriers,
  selectedCourierId,
  createMarkerElement,
  updateMarkerElement,
  onSelect,
  MarkerConstructor = DefaultMarker,
}) {
  const seenIds = new Set();

  for (const courier of couriers) {
    const id = String(courier?.courierId ?? "").trim();
    if (!id) continue;

    const coordinate = toMapCoordinate({
      longitude: courier.longitude,
      latitude: courier.latitude,
    });
    if (!isValidCoordinate(coordinate)) continue;

    seenIds.add(id);
    const isSelected = id === selectedCourierId;
    const existing = registry.get(id);

    if (existing) {
      existing.marker.setLngLat(coordinate);
      if (typeof updateMarkerElement === "function") {
        updateMarkerElement(existing.element, courier, isSelected);
      }
      continue;
    }

    const element = createMarkerElement(courier, isSelected);
    if (typeof updateMarkerElement === "function") {
      updateMarkerElement(element, courier, isSelected);
    }

    const marker = new MarkerConstructor({
      element,
      anchor: "bottom",
    }).setLngLat(coordinate);

    if (typeof onSelect === "function") {
      marker.on("click", () => {
        onSelect(id);
      });
    }

    marker.addTo(/** @type {any} */ (map));
    registry.set(id, {
      marker,
      element,
      cleanup() {
        marker.remove();
      },
    });
  }

  for (const [id, entry] of registry.entries()) {
    if (!seenIds.has(id)) {
      entry.cleanup();
      registry.delete(id);
    }
  }
}
