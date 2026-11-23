import Link from "next/link";
import { fetchDeliveryTracking } from "@/lib/api";
import DeliveryTrackingCard from "@/components/delivery/DeliveryTrackingCard";

interface TrackingDetailProps {
  params: Promise<{ trackingNumber: string }>;
}

export default async function TrackingDetailPage({ params }: TrackingDetailProps) {
  const { trackingNumber } = await params;
  const decoded = decodeURIComponent(trackingNumber);

  const shipment = await fetchDeliveryTracking(decoded);

  if (!shipment) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="border border-border bg-paper p-10 shadow-sm">
          <span className="type-label text-xs uppercase tracking-widest text-ctrl-red">
            Tracking Record Not Found
          </span>
          <h1 className="type-display mt-3 text-2xl font-bold tracking-tight text-ink">
            No Shipment Found for &ldquo;{decoded}&rdquo;
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-ink-soft max-w-sm mx-auto">
            Please ensure you have entered the exact tracking code provided in your invoice receipt or SMS confirmation.
          </p>
          <div className="mt-6 flex items-center justify-center gap-4">
            <Link
              href="/tracking"
              className="type-label inline-flex items-center gap-2 bg-ink px-6 py-3 text-xs uppercase tracking-widest text-paper hover:bg-ink-soft transition-colors"
            >
              <span>Search Again</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Breadcrumb Navigation */}
      <div className="mb-6 flex items-center gap-2 text-xs text-ink-soft">
        <Link href="/" className="hover:text-ink transition-colors">
          Home
        </Link>
        <span>/</span>
        <Link href="/tracking" className="hover:text-ink transition-colors">
          Tracking
        </Link>
        <span>/</span>
        <span className="text-ink font-semibold tabular-nums">{shipment.trackingNumber}</span>
      </div>

      {/* Main Delivery Tracking Card with Map */}
      <DeliveryTrackingCard initialShipment={shipment} showMapByDefault={true} />

      {/* Bottom Assistance & Invoice Link Strip */}
      <div className="border border-border bg-paper p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div>
          <h3 className="font-semibold text-ink">Order Reference: {shipment.orderNumber}</h3>
          <p className="text-ink-soft text-[11px] mt-0.5">
            View full commercial invoice slip and download tax receipt.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/invoice/${encodeURIComponent(shipment.orderNumber)}`}
            className="type-label inline-flex items-center gap-1.5 border border-border bg-canvas px-4 py-2 text-xs uppercase tracking-wider text-ink hover:border-ink hover:bg-paper transition-colors"
          >
            <span>View Invoice &rarr;</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
