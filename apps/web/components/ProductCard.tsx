"use client";

import Image from "next/image";
import Link from "next/link";
import { Product } from "@/types";
import { useWishlist } from "@/context/WishlistContext";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { isFavorite, toggleItem } = useWishlist();
  const active = isFavorite(product.id);

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleItem(product);
  };

  return (
    <article className="group relative flex flex-col justify-between border-r border-b border-border bg-paper transition-colors hover:bg-backdrop">
      {/* Floating Wishlist Heart Button */}
      <button
        type="button"
        onClick={handleWishlistClick}
        aria-label={active ? `Remove ${product.title} from wishlist` : `Add ${product.title} to wishlist`}
        className={`absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-200 cursor-pointer ${
          active
            ? "border-ctrl-red/40 bg-paper text-ctrl-red shadow-sm scale-105"
            : "border-border/80 bg-paper/90 text-ink-soft hover:text-ctrl-red hover:border-ink/60 sm:opacity-0 group-hover:opacity-100 shadow-xs"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className={`h-4 w-4 transition-transform duration-200 ${
            active ? "fill-ctrl-red scale-110" : "fill-none stroke-current stroke-2"
          }`}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
          />
        </svg>
      </button>

      <Link
        href={`/products/${product.id}`}
        className="relative flex h-52 sm:h-64 md:h-72 w-full items-center justify-center overflow-hidden p-4 sm:p-6 bg-backdrop/60"
      >
        <Image
          src={product.thumbnail}
          alt={product.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-contain p-4 sm:p-5 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
          priority={product.id <= 3}
        />
      </Link>

      {/* Clean Retail Typography */}
      <div className="p-3.5 sm:p-4.5 pt-2.5 flex flex-col justify-between">
        <div>
          <Link
            href={`/products/${product.id}`}
            className="text-xs sm:text-sm font-medium tracking-tight text-ink hover:text-terracotta transition-colors block line-clamp-1"
          >
            {product.title}
          </Link>

          {/* Micro-caption subtext */}
          <p className="mt-0.5 text-[11px] text-ink-soft line-clamp-1">
            {product.fabric
              ? `Available in ${product.fabric}`
              : `Available in ${product.category}`}
          </p>
        </div>

        {/* Compact Price & Action */}
        <div className="mt-2.5 pt-2.5 border-t border-border flex items-center justify-between">
          <span className="font-semibold text-ink text-xs sm:text-sm tabular-nums">
            ${product.price.toFixed(2)}
          </span>

          <span className="text-xs font-medium text-ink-soft group-hover:text-terracotta transition-colors flex items-center gap-1">
            <span>View</span>
            <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
          </span>
        </div>
      </div>
    </article>
  );
}
