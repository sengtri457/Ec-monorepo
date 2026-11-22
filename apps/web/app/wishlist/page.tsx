import type { Metadata } from "next";
import WishlistClient from "./WishlistClient";

export const metadata: Metadata = {
  title: "Saved Wishlist & Lookbook — Clothes™ Cambodia",
  description:
    "Review your curated wardrobe edit, saved silhouettes, and Men's luxury essentials.",
};

export default function WishlistPage() {
  return <WishlistClient />;
}
