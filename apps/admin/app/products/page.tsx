"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Shirt,
  Search,
  Plus,
  RefreshCw,
  Edit,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { AdminProduct, fetchAdminProducts, patchAdminProduct } from "@/lib/api/catalogApi";
import { ProductThumbnail } from "@/components/ui/ProductThumbnail";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [offset, setOffset] = useState(0);
  const pageSize = 25;

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchAdminProducts({
        search: search.trim() || undefined,
        department: deptFilter,
        limit: pageSize,
        offset,
      });
      setProducts(res.results || []);
      setTotalCount(res.count || 0);
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setIsLoading(false);
    }
  }, [search, deptFilter, offset]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleToggleActive = async (id: number, currentActive: boolean) => {
    try {
      await patchAdminProduct(id, { is_active: !currentActive });
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_active: !currentActive } : p))
      );
    } catch (err) {
      console.error("Failed to toggle product status:", err);
    }
  };

  const formatPrice = (p?: number | string) => {
    const num = typeof p === "string" ? parseFloat(p) : p;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(num || 0);
  };

  const departmentTabs = [
    { id: "ALL", label: "All Departments" },
    { id: "men", label: "Men" },
    { id: "women", label: "Women" },
    { id: "kids", label: "Kids" },
    { id: "unisex", label: "Unisex" },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Product Catalog
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            Publish products, manage sizing variants, configure pricing and control visibility.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadProducts()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 shadow-xs hover:bg-neutral-50 transition cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </button>
          <Link
            href="/products/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 hover:bg-[#944434] px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add New Product</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 min-w-0 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by title, category, or slug..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setOffset(0);
              }}
              className="w-full rounded-lg border border-neutral-200 bg-neutral-50/50 pl-9 pr-4 py-2 text-xs text-neutral-800 placeholder-neutral-400 focus:border-neutral-900 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="text-xs text-neutral-500 font-medium">
            Catalog Items: <strong className="text-neutral-900 font-mono">{totalCount}</strong>
          </div>
        </div>

        {/* Clean Underline Department Tabs */}
        <div className="border-b border-neutral-200 -mb-1 pt-1">
          <nav className="flex space-x-2 overflow-x-auto pb-px" aria-label="Department Tabs">
            {departmentTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setDeptFilter(tab.id);
                  setOffset(0);
                }}
                className={`whitespace-nowrap px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  deptFilter === tab.id
                    ? "border-neutral-900 text-neutral-900"
                    : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Products Table */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[760px]">
            <thead className="border-b border-neutral-200 bg-neutral-50/80 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="px-6 py-3.5">Product</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-4 py-3.5">Department</th>
                <th className="px-4 py-3.5">Base Price</th>
                <th className="px-4 py-3.5">Variants / Total Units</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-neutral-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-800" />
                      <span>Loading products...</span>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-neutral-400">
                    <Shirt className="mx-auto h-8 w-8 text-neutral-300 mb-2" />
                    <p className="font-semibold text-neutral-700">No products found</p>
                    <p className="text-[11px] mt-0.5 text-neutral-400">
                      Try searching a different keyword or create one.
                    </p>
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const variantsCt = p.variants?.length || 0;
                  const totalStock = p.total_stock ?? 0;

                  return (
                    <tr key={p.id} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <ProductThumbnail
                            src={p.thumbnail}
                            alt={p.title}
                            className="h-10 w-10 rounded-lg object-cover bg-neutral-100 border border-neutral-200 shrink-0"
                            fallbackClassName="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 text-neutral-400 border border-neutral-200 shrink-0"
                          />
                          <div className="min-w-0 max-w-xs">
                            <Link
                              href={`/products/${p.id}/edit`}
                              className="font-bold text-neutral-900 hover:text-[#944434] transition-colors block truncate"
                            >
                              {p.title}
                            </Link>
                            <span className="font-mono text-[11px] text-neutral-400 block truncate">
                              /{p.slug}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-neutral-700 font-medium">
                        {p.category?.name || "General"}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-block rounded-md bg-neutral-100 px-2 py-0.5 font-semibold text-[11px] capitalize text-neutral-700 border border-neutral-200">
                          {p.department}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-bold font-mono text-neutral-900">
                        {formatPrice(p.base_price)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-neutral-700">
                          <span className="font-semibold">{variantsCt} variants</span>
                          <span className="text-neutral-300">&bull;</span>
                          <span className="font-mono text-neutral-600">{totalStock} in stock</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(p.id, p.is_active)}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold transition cursor-pointer ${
                            p.is_active
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                              : "bg-neutral-100 text-neutral-500"
                          }`}
                        >
                          {p.is_active ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" /> Active
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3" /> Inactive
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <Link
                          href={`/products/${p.id}/edit`}
                          className="inline-flex items-center gap-1 font-semibold text-neutral-900 hover:text-[#944434] underline text-xs transition-colors"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-neutral-200 bg-neutral-50/50 px-6 py-3.5 text-xs text-neutral-500">
          <div>
            Showing <strong className="text-neutral-800">{products.length}</strong> of{" "}
            <strong className="text-neutral-800">{totalCount}</strong> products
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - pageSize))}
              disabled={offset === 0 || isLoading}
              className="rounded-lg border border-neutral-200 bg-white px-3 py-1 font-semibold text-neutral-700 disabled:opacity-40 hover:bg-neutral-50 cursor-pointer"
            >
              Previous
            </button>
            <button
              onClick={() => setOffset(offset + pageSize)}
              disabled={offset + pageSize >= totalCount || isLoading}
              className="rounded-lg border border-neutral-200 bg-white px-3 py-1 font-semibold text-neutral-700 disabled:opacity-40 hover:bg-neutral-50 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
