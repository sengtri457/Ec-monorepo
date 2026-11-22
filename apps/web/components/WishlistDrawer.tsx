"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useWishlist } from "@/context/WishlistContext";
import { useCart } from "@/context/CartContext";
import { WishlistItem } from "@/types";

export default function WishlistDrawer() {
  const {
    items,
    itemCount,
    isDrawerOpen,
    closeDrawer,
    removeItem,
    clearWishlist,
  } = useWishlist();

  const { addItem: addToCart } = useCart();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isDrawerOpen) {
        closeDrawer();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawerOpen, closeDrawer]);

  // Lock body scroll when open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isDrawerOpen]);

  const handleMoveToCart = (item: WishlistItem) => {
    const defaultSize = item.sizes?.[0] || "M";
    addToCart(
      {
        id: `${item.productId}-${defaultSize}`,
        productId: item.productId,
        variantId: undefined,
        sku: `CLO-${item.productId.toString().padStart(4, "0")}`,
        selectedSize: defaultSize,
        title: item.title,
        price: item.price,
        thumbnail: item.thumbnail,
      },
      1,
      item.stock,
      true // open cart drawer
    );
    removeItem(item.productId);
    closeDrawer();
  };

  if (!isDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Wishlist"
        className="relative z-10 flex h-[100dvh] w-full max-w-md flex-col bg-paper border-l border-border shadow-2xl transition-transform duration-300"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="h-4 w-4 fill-ctrl-red text-ctrl-red"
            >
              <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
            <span className="type-label text-xs uppercase tracking-widest text-ink font-semibold">
              Wishlist / Favorites
            </span>
            <span className="text-xs text-ink-soft tabular-nums">
              ({itemCount} {itemCount === 1 ? "piece" : "pieces"})
            </span>
          </div>

          <button
            onClick={closeDrawer}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-ink-soft hover:text-ink transition-colors cursor-pointer"
            aria-label="Close wishlist"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drawer Item List */}
        <div className="flex-1 overflow-y-auto px-6 divide-y divide-border/60">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center py-12">
              <div className="h-12 w-12 rounded-full bg-ctrl-red/10 flex items-center justify-center text-ctrl-red mb-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="h-6 w-6 fill-none stroke-current stroke-2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                  />
                </svg>
              </div>
              <span className="type-label text-xs uppercase tracking-widest text-ink font-semibold">
                Wishlist Empty
              </span>
              <p className="mt-2 text-xs text-ink-soft max-w-xs leading-relaxed">
                Save your favorite silhouettes and tailoring pieces to review or purchase later.
              </p>
              <div className="mt-6 flex flex-col gap-2 w-full max-w-xs">
                <Link
                  href="/catalog?audience=men"
                  onClick={closeDrawer}
                  className="type-label inline-flex items-center justify-center bg-ink px-6 py-3 text-xs uppercase tracking-widest text-paper hover:bg-ink-soft transition-colors"
                >
                  Explore Men&apos;s Collection
                </Link>
                <Link
                  href="/catalog"
                  onClick={closeDrawer}
                  className="type-label inline-flex items-center justify-center border border-border px-6 py-2.5 text-xs uppercase tracking-widest text-ink hover:border-ink transition-colors"
                >
                  Browse Full Catalog
                </Link>
              </div>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.productId} className="py-4 flex gap-4 items-center">
                <Link
                  href={`/products/${item.productId}`}
                  onClick={closeDrawer}
                  className="relative h-20 w-20 shrink-0 overflow-hidden border border-border bg-backdrop p-1"
                >
                  <Image
                    src={item.thumbnail}
                    alt={item.title}
                    fill
                    sizes="80px"
                    className="object-contain p-1"
                  />
                </Link>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/products/${item.productId}`}
                      onClick={closeDrawer}
                      className="text-xs font-semibold text-ink hover:text-ctrl-red transition-colors truncate block"
                    >
                      {item.title}
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId)}
                      aria-label={`Remove ${item.title}`}
                      className="text-ink-soft hover:text-ctrl-red p-1 cursor-pointer transition-colors"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono text-ink-soft">
                    <span>{item.category}</span>
                    {item.audience && (
                      <>
                        <span>•</span>
                        <span className="uppercase text-ink font-medium">{item.audience}</span>
                      </>
                    )}
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-ink">
                      ${item.price.toFixed(2)}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleMoveToCart(item)}
                      className="type-label inline-flex items-center gap-1 bg-ink px-3 py-1.5 text-[10px] uppercase tracking-wider text-paper hover:bg-ink-soft transition-all cursor-pointer shadow-xs active:scale-95"
                    >
                      <span>Move to Bag</span>
                      <span aria-hidden="true">&rarr;</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer */}
        {items.length > 0 && (
          <div className="border-t border-border bg-canvas/30 p-6 space-y-3">
            <Link
              href="/wishlist"
              onClick={closeDrawer}
              className="type-label flex w-full items-center justify-center gap-2 bg-ink py-3 text-xs uppercase tracking-widest text-paper hover:bg-ink-soft transition-colors shadow-xs"
            >
              <span>View Full Wishlist Page</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>

            <div className="flex items-center justify-between text-[11px] font-mono text-ink-soft pt-1">
              <span>{itemCount} saved pieces</span>
              <button
                type="button"
                onClick={clearWishlist}
                className="hover:text-ctrl-red transition-colors underline underline-offset-2 cursor-pointer"
              >
                Clear all
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
