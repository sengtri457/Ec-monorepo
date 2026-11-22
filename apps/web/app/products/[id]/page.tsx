import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchProductDetail } from "@/lib/api";
import AddToCartButton from "@/components/AddToCartButton";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Fetch live product & variant stock strictly from Django backend
  const product = await fetchProductDetail(id);

  if (!product) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 bg-backdrop text-ink">
      {/* Editorial Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-8 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
        <Link href="/" className="hover:text-ink transition-colors underline underline-offset-4 decoration-terracotta">
          Home
        </Link>
        <span>/</span>
        <Link
          href="/catalog"
          className="hover:text-ink transition-colors"
        >
          Catalog
        </Link>
        {product.audience && (
          <>
            <span>/</span>
            <span className="capitalize text-ink font-medium">
              {product.audience}
            </span>
          </>
        )}
        {product.department && (
          <>
            <span>/</span>
            <span className="capitalize text-ink font-medium">
              {product.department}
            </span>
          </>
        )}
        {product.subcategory && (
          <>
            <span>/</span>
            <span className="capitalize text-ink font-medium">
              {product.subcategory}
            </span>
          </>
        )}
        <span>/</span>
        <span className="font-medium text-ink truncate max-w-xs">
          {product.title}
        </span>
      </nav>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
        {/* Product Media Column */}
        <div className="lg:col-span-7 flex justify-center">
          <div className="relative aspect-square w-full max-h-[520px] overflow-hidden border border-border bg-paper p-6 sm:p-12 shadow-sm flex items-center justify-center">
            <Image
              src={product.thumbnail}
              alt={product.title}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-contain p-6"
              priority
            />

            {/* Category Pill */}
            <div className="absolute top-4 left-4">
              <span className="border border-border-strong bg-paper px-2.5 py-1 text-xs font-medium text-ink shadow-sm capitalize">
                {product.category}
              </span>
            </div>
          </div>
        </div>

        {/* Product Info & Purchase Column */}
        <div className="lg:col-span-5 flex flex-col justify-between">
          <div>
            {/* Header info */}
            <div className="flex items-center justify-between text-xs text-ink-soft">
              <span className="uppercase tracking-widest font-medium text-[11px] text-ink-soft">
                {product.category || "Apparel"}
              </span>
              <span className="text-forest font-semibold text-[11px] flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-forest" />
                <span>Authentic NBC Bakong Partner</span>
              </span>
            </div>

            <h1 className="type-display mt-3 text-2xl sm:text-3xl lg:text-4xl text-ink font-bold tracking-tight">
              {product.title}
            </h1>

            {/* Price */}
            <div className="mt-4 flex items-baseline gap-3">
              <span className="font-heading text-3xl font-bold tabular-nums text-ink">
                ${product.price.toFixed(2)} USD
              </span>
              <span className="text-xs text-ink-soft">
                Taxes calculated at checkout
              </span>
            </div>

            {/* Description */}
            <div className="mt-6 border-t border-border pt-6">
              <h2 className="text-xs font-semibold tracking-wider uppercase text-ink-soft">
                Design &amp; Material Specifications
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                {product.description}
              </p>
              {product.fabric && (
                <p className="mt-2 text-xs text-ink font-medium">
                  Fabric: {product.fabric}
                </p>
              )}
            </div>

            {/* Purchase Options */}
            <div className="mt-8 border-t border-border pt-6">
              <AddToCartButton product={product} />
            </div>
          </div>

          {/* Guarantee Badges */}
          <div className="mt-10 border-t border-border pt-6 grid grid-cols-2 gap-4 text-xs text-ink-soft">
            <div className="border border-border bg-paper p-3.5 shadow-xs">
              <p className="font-semibold text-ink">Phnom Penh Express</p>
              <p className="mt-0.5 text-xs text-ink-soft">1–3h in PP · 1–2d Nationwide</p>
            </div>
            <div className="border border-border bg-paper p-3.5 shadow-xs">
              <p className="font-semibold text-ink">Doorstep Size Exchange</p>
              <p className="mt-0.5 text-xs text-ink-soft">Easy rider exchange upon arrival</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
