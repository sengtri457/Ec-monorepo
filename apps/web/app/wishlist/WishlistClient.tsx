"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useWishlist } from "@/context/WishlistContext";
import { useCart } from "@/context/CartContext";
import { WishlistItem } from "@/types";

type AudienceFilter = "all" | "men" | "women";

export default function WishlistClient() {
  const { items, isLoaded, removeItem, clearWishlist } = useWishlist();
  const { addItem: addToCart, openDrawer: openCartDrawer } = useCart();

  const [activeTab, setActiveTab] = useState<AudienceFilter>("all");
  const [selectedSizes, setSelectedSizes] = useState<Record<number, string>>({});
  const [movingId, setMovingId] = useState<number | null>(null);
  const [isMovingAll, setIsMovingAll] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Filter items by audience tab
  const filteredItems = items.filter((item) => {
    if (activeTab === "all") return true;
    const aud = item.audience?.toLowerCase() || "";
    if (activeTab === "men") {
      return aud === "men" || aud === "unisex" || !aud;
    }
    if (activeTab === "women") {
      return aud === "women" || aud === "unisex";
    }
    return true;
  });

  const menCount = items.filter((i) => {
    const aud = i.audience?.toLowerCase() || "";
    return aud === "men" || aud === "unisex" || !aud;
  }).length;

  const womenCount = items.filter((i) => {
    const aud = i.audience?.toLowerCase() || "";
    return aud === "women" || aud === "unisex";
  }).length;

  const handleSizeChange = (productId: number, size: string) => {
    setSelectedSizes((prev) => ({ ...prev, [productId]: size }));
  };

  const handleMoveToCart = (item: WishlistItem) => {
    setMovingId(item.productId);
    const chosenSize =
      selectedSizes[item.productId] ||
      (item.sizes && item.sizes.length > 0 ? item.sizes[0] : "M");

    setTimeout(() => {
      addToCart(
        {
          id: `${item.productId}-${chosenSize}`,
          productId: item.productId,
          sku: `CLO-${item.productId.toString().padStart(4, "0")}`,
          selectedSize: chosenSize,
          title: item.title,
          price: item.price,
          thumbnail: item.thumbnail,
        },
        1,
        item.stock,
        true
      );
      removeItem(item.productId);
      setMovingId(null);
    }, 200);
  };

  const handleMoveAllToCart = () => {
    if (filteredItems.length === 0) return;
    setIsMovingAll(true);

    setTimeout(() => {
      filteredItems.forEach((item) => {
        const chosenSize =
          selectedSizes[item.productId] ||
          (item.sizes && item.sizes.length > 0 ? item.sizes[0] : "M");
        addToCart(
          {
            id: `${item.productId}-${chosenSize}`,
            productId: item.productId,
            sku: `CLO-${item.productId.toString().padStart(4, "0")}`,
            selectedSize: chosenSize,
            title: item.title,
            price: item.price,
            thumbnail: item.thumbnail,
          },
          1,
          item.stock
        );
        removeItem(item.productId);
      });
      setIsMovingAll(false);
      openCartDrawer();
    }, 350);
  };

  if (!isLoaded) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex h-64 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-ctrl-red border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb Nav */}
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-ink-soft">
        <Link
          href="/"
          className="hover:text-ink transition-colors underline underline-offset-4 decoration-border"
        >
          Home
        </Link>
        <span>/</span>
        <span className="uppercase text-ink font-semibold">Wishlist &amp; Lookbook</span>
      </nav>

      {/* Header Section */}
      <div className="mb-8 border-b-2 border-ink pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="type-label text-xs uppercase tracking-widest text-ctrl-red block font-semibold">
            Private Lookbook Edit
          </span>
          <h1 className="type-display text-3xl text-ink sm:text-4xl font-semibold mt-1">
            Saved Wardrobe Pieces
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-ink-soft max-w-xl font-sans">
            Archived silhouettes, tactile organic fabrics, and tailored Men&apos;s essentials
            curated for your modern wardrobe.
          </p>
        </div>

        {items.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleMoveAllToCart}
              disabled={isMovingAll || filteredItems.length === 0}
              className="flex items-center gap-2 rounded bg-ink px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-paper shadow-sm transition-all hover:bg-ink/90 active:scale-95 disabled:opacity-40 cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              <span>{isMovingAll ? "Adding to Bag..." : "Move All to Bag"}</span>
            </button>

            <button
              onClick={() => setShowClearConfirm(true)}
              className="rounded border border-border bg-paper px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-ink-soft transition-all hover:border-ctrl-red hover:text-ctrl-red cursor-pointer"
              title="Clear all saved pieces"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Clear Confirmation Dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-lg border border-border bg-paper p-6 shadow-2xl">
            <h3 className="type-display text-lg font-semibold text-ink">Clear Saved Pieces?</h3>
            <p className="mt-2 text-xs text-ink-soft">
              This will remove all {items.length} saved garments from your private wishlist.
              This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="rounded border border-border px-3 py-1.5 text-xs font-semibold text-ink hover:bg-canvas transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  clearWishlist();
                  setShowClearConfirm(false);
                }}
                className="rounded bg-ctrl-red px-3 py-1.5 text-xs font-semibold text-paper hover:bg-ctrl-red/90 transition-colors cursor-pointer"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs by Audience */}
      {items.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`rounded px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === "all"
                  ? "bg-ink text-paper"
                  : "bg-paper border border-border text-ink-soft hover:text-ink hover:border-ink"
              }`}
            >
              All Pieces ({items.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("men")}
              className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === "men"
                  ? "bg-ink text-paper"
                  : "bg-paper border border-border text-ink-soft hover:text-ink hover:border-ink"
              }`}
            >
              <span>Men&apos;s Edit</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  activeTab === "men"
                    ? "bg-paper text-ink"
                    : "bg-canvas text-ink-soft"
                }`}
              >
                {menCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("women")}
              className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === "women"
                  ? "bg-ink text-paper"
                  : "bg-paper border border-border text-ink-soft hover:text-ink hover:border-ink"
              }`}
            >
              <span>Women&apos;s</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  activeTab === "women"
                    ? "bg-paper text-ink"
                    : "bg-canvas text-ink-soft"
                }`}
              >
                {womenCount}
              </span>
            </button>
          </div>

          <span className="text-xs text-ink-soft tabular-nums">
            Showing <strong className="text-ink">{filteredItems.length}</strong> of{" "}
            {items.length} pieces
          </span>
        </div>
      )}

      {/* Main Content Area */}
      {items.length === 0 ? (
        /* Empty State with Men's Highlight */
        <div className="rounded-lg border border-dashed border-border bg-paper p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-canvas border border-border text-ctrl-red">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 stroke-current fill-none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </div>

          <h2 className="type-display mt-4 text-2xl font-semibold text-ink">
            Your Wishlist is Empty
          </h2>
          <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm text-ink-soft">
            You haven&apos;t saved any garments to your private lookbook yet. Click the heart
            icon on any piece across the catalog to curate your wardrobe.
          </p>

          {/* Men's Discovery CTA */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/catalog?audience=men"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded bg-ink px-6 py-3 text-xs font-semibold uppercase tracking-wider text-paper shadow-sm transition-all hover:bg-ink/90 active:scale-95"
            >
              <span>Explore Men&apos;s Collection &rarr;</span>
            </Link>
            <Link
              href="/catalog"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded border border-border bg-paper px-6 py-3 text-xs font-semibold uppercase tracking-wider text-ink shadow-sm transition-all hover:bg-canvas hover:border-ink"
            >
              Browse Complete Catalog
            </Link>
          </div>

          {/* Quick Men's Style Discovery Cards */}
          <div className="mt-12 border-t border-border pt-8">
            <span className="type-label text-[11px] uppercase tracking-widest text-ink-soft block font-semibold mb-4">
              Explore Men&apos;s Seasonal Capsules
            </span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
              <Link
                href="/catalog?audience=men&subcategory=tshirt"
                className="group rounded border border-border bg-canvas/30 p-4 transition-all hover:border-ink hover:bg-canvas"
              >
                <span className="text-[10px] uppercase font-semibold text-ctrl-red">Essential</span>
                <h4 className="mt-1 text-xs font-semibold text-ink group-hover:underline">
                  Heavyweight Tees
                </h4>
                <p className="mt-1 text-[11px] text-ink-soft">Long-staple structured cotton</p>
              </Link>

              <Link
                href="/catalog?audience=men&subcategory=sweater"
                className="group rounded border border-border bg-canvas/30 p-4 transition-all hover:border-ink hover:bg-canvas"
              >
                <span className="text-[10px] uppercase font-semibold text-ctrl-red">Knitwear</span>
                <h4 className="mt-1 text-xs font-semibold text-ink group-hover:underline">
                  Thermal Sweaters
                </h4>
                <p className="mt-1 text-[11px] text-ink-soft">Merino &amp; organic ribbed knits</p>
              </Link>

              <Link
                href="/catalog?audience=men&subcategory=hoodies"
                className="group rounded border border-border bg-canvas/30 p-4 transition-all hover:border-ink hover:bg-canvas"
              >
                <span className="text-[10px] uppercase font-semibold text-ctrl-red">Loungewear</span>
                <h4 className="mt-1 text-xs font-semibold text-ink group-hover:underline">
                  French Terry Hoodies
                </h4>
                <p className="mt-1 text-[11px] text-ink-soft">Brushed interior &amp; relaxed drape</p>
              </Link>

              <Link
                href="/catalog?dept=shoes"
                className="group rounded border border-border bg-canvas/30 p-4 transition-all hover:border-ink hover:bg-canvas"
              >
                <span className="text-[10px] uppercase font-semibold text-ctrl-red">Footwear</span>
                <h4 className="mt-1 text-xs font-semibold text-ink group-hover:underline">
                  Classic Runners &amp; Leather
                </h4>
                <p className="mt-1 text-[11px] text-ink-soft">Minimalist craftsmanship</p>
              </Link>
            </div>
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        /* Empty for this specific tab */
        <div className="rounded-lg border border-dashed border-border bg-paper p-12 text-center">
          <h3 className="type-display text-lg font-semibold text-ink">
            No items in {activeTab === "men" ? "Men's Edit" : "Women's Collection"}
          </h3>
          <p className="mt-2 text-xs text-ink-soft">
            You don&apos;t have any saved pieces categorized under this collection.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => setActiveTab("all")}
              className="rounded bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-wider text-paper hover:bg-ink/90 transition-colors cursor-pointer"
            >
              View All ({items.length})
            </button>
            {activeTab === "men" && (
              <Link
                href="/catalog?audience=men"
                className="rounded border border-border bg-paper px-4 py-2 text-xs font-semibold uppercase tracking-wider text-ink hover:bg-canvas transition-colors"
              >
                Shop Men&apos;s Pieces &rarr;
              </Link>
            )}
          </div>
        </div>
      ) : (
        /* Product Cards Grid */
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item) => {
            const chosenSize =
              selectedSizes[item.productId] ||
              (item.sizes && item.sizes.length > 0 ? item.sizes[0] : "M");
            const isMoving = movingId === item.productId;

            return (
              <div
                key={item.productId}
                className="group relative flex flex-col justify-between overflow-hidden rounded-md border border-border bg-paper shadow-sm transition-all hover:border-ink hover:shadow-md"
              >
                <div>
                  {/* Image Container with Badges */}
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-canvas">
                    <Link href={`/products/${item.productId}`}>
                      <Image
                        src={item.thumbnail}
                        alt={item.title}
                        fill
                        sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                      />
                    </Link>

                    {/* Department / Category Pill */}
                    {item.audience && (
                      <span className="absolute left-3 top-3 z-10 rounded bg-paper/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-ink backdrop-blur-xs border border-border shadow-xs">
                        {item.audience.toUpperCase()}
                      </span>
                    )}

                    {/* Heart Remove Button */}
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId)}
                      className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-paper/90 text-ctrl-red shadow-md backdrop-blur-xs transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                      title="Remove from Wishlist"
                      aria-label={`Remove ${item.title} from Wishlist`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 fill-ctrl-red stroke-ctrl-red"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Product Details */}
                  <div className="p-4">
                    <div className="flex items-center justify-between text-[11px] text-ink-soft">
                      <span className="uppercase tracking-wider font-semibold">
                        {item.category || "Garment"}
                      </span>
                      {item.fabric && (
                        <span className="capitalize">{item.fabric}</span>
                      )}
                    </div>

                    <Link href={`/products/${item.productId}`}>
                      <h3 className="type-display mt-1 text-sm font-semibold text-ink line-clamp-1 group-hover:underline">
                        {item.title}
                      </h3>
                    </Link>

                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-sm font-bold text-ink tabular-nums">
                        ${item.price.toFixed(2)}
                      </span>
                    </div>

                    {/* Size Selector */}
                    {item.sizes && item.sizes.length > 0 && (
                      <div className="mt-3">
                        <label className="type-label block text-[10px] uppercase tracking-wider text-ink-soft mb-1">
                          Select Size:
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {item.sizes.map((sz) => (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => handleSizeChange(item.productId, sz)}
                              className={`h-6 min-w-6 rounded border px-1.5 text-[10px] font-semibold transition-all cursor-pointer ${
                                chosenSize === sz
                                  ? "border-ink bg-ink text-paper"
                                  : "border-border bg-paper text-ink-soft hover:border-ink hover:text-ink"
                              }`}
                            >
                              {sz}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="border-t border-border bg-canvas/20 p-4 pt-3">
                  <button
                    type="button"
                    onClick={() => handleMoveToCart(item)}
                    disabled={isMoving}
                    className="flex w-full items-center justify-center gap-2 rounded bg-ink py-2 text-xs font-semibold uppercase tracking-wider text-paper transition-all hover:bg-ink/90 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                      />
                    </svg>
                    <span>
                      {isMoving ? "Moving..." : `Move to Bag (${chosenSize})`}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
