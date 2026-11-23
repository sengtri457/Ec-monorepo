"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { ProductForm } from "@/components/products/ProductForm";
import { AdminProduct, fetchAdminProduct, updateAdminProduct } from "@/lib/api/catalogApi";

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = React.use(params);
  const productId = resolvedParams.id;

  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    fetchAdminProduct(productId)
      .then((data) => {
        if (isMounted) setProduct(data);
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Failed to load product.";
          setErrorMessage(msg);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [productId]);

  const handleUpdate = async (payload: any) => {
    await updateAdminProduct(productId, payload);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-xs text-slate-500">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
          <span>Retrieving product #{productId}...</span>
        </div>
      </div>
    );
  }

  if (errorMessage || !product) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-xs text-rose-800">
        <AlertCircle className="mx-auto h-8 w-8 text-rose-600 mb-2" />
        <h3 className="font-bold text-sm">Product not found</h3>
        <p className="mt-1">{errorMessage || "Unable to find product record."}</p>
        <Link
          href="/products"
          className="mt-4 inline-flex items-center gap-1 font-semibold text-slate-900 underline"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Products Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ProductForm initialData={product} onSubmit={handleUpdate} isEdit={true} />
    </div>
  );
}
