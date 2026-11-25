"use client";

import React, { useEffect, useState } from "react";
import { Shirt } from "lucide-react";
import { getStoreUrl } from "@/lib/adminApiClient";

interface ProductThumbnailProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  fallbackIcon?: React.ReactNode;
}

export function ProductThumbnail({
  src,
  alt,
  className = "h-10 w-10 rounded-lg object-cover bg-neutral-100 border border-neutral-200 shrink-0",
  fallbackClassName = "flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 text-neutral-400 border border-neutral-200 shrink-0",
  fallbackIcon,
}: ProductThumbnailProps) {
  const [hasError, setHasError] = useState(false);
  const [triedStoreFallback, setTriedStoreFallback] = useState(false);
  const [storeUrl, setStoreUrl] = useState(
    process.env.NEXT_PUBLIC_STORE_URL || "http://localhost:3000"
  );

  useEffect(() => {
    setStoreUrl(getStoreUrl());
  }, []);

  // If no source or error occurred, render styled placeholder
  if (!src || hasError) {
    return (
      <div className={fallbackClassName} title={alt}>
        {fallbackIcon || <Shirt className="h-5 w-5" />}
      </div>
    );
  }

  // If relative path failed once, try prepending the storefront origin
  const currentSrc =
    triedStoreFallback && src.startsWith("/")
      ? `${storeUrl.replace(/\/$/, "")}${src}`
      : src;

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => {
        if (!triedStoreFallback && src.startsWith("/")) {
          setTriedStoreFallback(true);
        } else {
          setHasError(true);
        }
      }}
    />
  );
}
