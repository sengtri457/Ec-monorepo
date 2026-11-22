"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { Product, WishlistItem } from "@/types";
import { getStorageItem, setStorageItem } from "@/lib/storage";

const WISHLIST_STORAGE_KEY = "clothes_wishlist_items";

interface WishlistContextType {
  items: WishlistItem[];
  itemCount: number;
  isLoaded: boolean;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  addItem: (product: Product) => void;
  removeItem: (productId: number) => void;
  toggleItem: (product: Product) => void;
  isFavorite: (productId: number) => boolean;
  clearWishlist: () => void;
  toastMessage: string | null;
  dismissToast: () => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadRef = useRef(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = getStorageItem<WishlistItem[]>(WISHLIST_STORAGE_KEY, []);
    setTimeout(() => {
      setItems(saved);
      setIsLoaded(true);
      initialLoadRef.current = true;
    }, 0);
  }, []);

  // Save to localStorage when items change
  useEffect(() => {
    if (!initialLoadRef.current || !isLoaded) return;
    setStorageItem(WISHLIST_STORAGE_KEY, items);
  }, [items, isLoaded]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }, []);

  const dismissToast = useCallback(() => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(null);
  }, []);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  const isFavorite = useCallback(
    (productId: number) => items.some((i) => i.productId === productId),
    [items]
  );

  const addItem = useCallback(
    (product: Product) => {
      setItems((prev) => {
        if (prev.some((i) => i.productId === product.id)) return prev;
        const newItem: WishlistItem = {
          productId: product.id,
          title: product.title,
          price: product.price,
          thumbnail: product.thumbnail,
          category: product.category,
          audience: product.audience,
          department: product.department,
          subcategory: product.subcategory,
          fabric: product.fabric,
          sizes: product.sizes,
          stock: product.stock,
          addedAt: new Date().toISOString(),
        };
        return [newItem, ...prev];
      });
      showToast(`Added "${product.title}" to your Wishlist.`);
    },
    [showToast]
  );

  const removeItem = useCallback(
    (productId: number) => {
      setItems((prev) => {
        const target = prev.find((i) => i.productId === productId);
        if (target) {
          showToast(`Removed "${target.title}" from Wishlist.`);
        }
        return prev.filter((i) => i.productId !== productId);
      });
    },
    [showToast]
  );

  const toggleItem = useCallback(
    (product: Product) => {
      if (items.some((i) => i.productId === product.id)) {
        removeItem(product.id);
      } else {
        addItem(product);
      }
    },
    [items, addItem, removeItem]
  );

  const clearWishlist = useCallback(() => {
    setItems([]);
    showToast("Wishlist cleared.");
  }, [showToast]);

  return (
    <WishlistContext.Provider
      value={{
        items,
        itemCount: items.length,
        isLoaded,
        isDrawerOpen,
        openDrawer,
        closeDrawer,
        addItem,
        removeItem,
        toggleItem,
        isFavorite,
        clearWishlist,
        toastMessage,
        dismissToast,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
