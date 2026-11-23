"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Image as ImageIcon,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Star,
} from "lucide-react";
import {
  AdminProduct,
  AdminCategory,
  AdminProductVariant,
  AdminProductImage,
  fetchCategories,
} from "@/lib/api/catalogApi";
import { VariantMatrixEditor } from "./VariantMatrixEditor";

interface ProductFormProps {
  initialData?: AdminProduct;
  onSubmit: (payload: any) => Promise<void>;
  isEdit?: boolean;
}

export function ProductForm({
  initialData,
  onSubmit,
  isEdit = false,
}: ProductFormProps) {
  const router = useRouter();

  // Form State
  const [title, setTitle] = useState(initialData?.title || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [basePrice, setBasePrice] = useState<number | string>(
    initialData?.base_price !== undefined ? initialData.base_price : "25.00"
  );
  const [categoryId, setCategoryId] = useState<number | string>(
    initialData?.category_id || initialData?.category?.id || 1
  );
  const [department, setDepartment] = useState(initialData?.department || "men");
  const [audience, setAudience] = useState(initialData?.audience || "adult");
  const [subcategory, setSubcategory] = useState(initialData?.subcategory || "tops");
  const [fabric, setFabric] = useState(initialData?.fabric || "100% Cotton");
  const [isActive, setIsActive] = useState(
    initialData?.is_active !== undefined ? initialData.is_active : true
  );
  const [isFeatured, setIsFeatured] = useState(
    initialData?.is_featured !== undefined ? initialData.is_featured : false
  );

  // Images state
  const [images, setImages] = useState<AdminProductImage[]>(
    initialData?.images && initialData.images.length > 0
      ? initialData.images
      : [
          {
            image_url:
              "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80",
            alt_text: "Product Primary",
            is_primary: true,
            sort_order: 0,
          },
        ]
  );
  const [newImageUrl, setNewImageUrl] = useState("");

  // Variants state
  const [variants, setVariants] = useState<AdminProductVariant[]>(
    initialData?.variants && initialData.variants.length > 0
      ? initialData.variants
      : [
          {
            sku: "PROD-BLK-S",
            size: "S",
            color: "Black",
            color_hex: "#000000",
            stock: 30,
            price_override: null,
            is_default: true,
            is_active: true,
          },
          {
            sku: "PROD-BLK-M",
            size: "M",
            color: "Black",
            color_hex: "#000000",
            stock: 50,
            price_override: null,
            is_default: false,
            is_active: true,
          },
          {
            sku: "PROD-BLK-L",
            size: "L",
            color: "Black",
            color_hex: "#000000",
            stock: 40,
            price_override: null,
            is_default: false,
            is_active: true,
          },
        ]
  );

  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories().then((cats) => {
      setCategories(cats);
      if (!categoryId && cats.length > 0) {
        setCategoryId(cats[0].id);
      }
    });
  }, [categoryId]);

  const handleAddImage = () => {
    if (!newImageUrl.trim()) return;
    const isFirst = images.length === 0;
    setImages([
      ...images,
      {
        image_url: newImageUrl.trim(),
        alt_text: title || "Product Image",
        is_primary: isFirst,
        sort_order: images.length,
      },
    ]);
    setNewImageUrl("");
  };

  const handleRemoveImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    if (updated.length > 0 && !updated.some((img) => img.is_primary)) {
      updated[0].is_primary = true;
    }
    setImages(updated);
  };

  const handleSetPrimaryImage = (index: number) => {
    setImages(
      images.map((img, i) => ({
        ...img,
        is_primary: i === index,
      }))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage("Product title is required.");
      return;
    }
    if (variants.length === 0) {
      setErrorMessage("At least one product variant is required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const payload = {
      title: title.trim(),
      slug: slug.trim() || undefined,
      description: description.trim(),
      base_price: parseFloat(String(basePrice)),
      category_id: parseInt(String(categoryId)) || 1,
      department,
      audience,
      subcategory,
      fabric,
      is_active: isActive,
      is_featured: isFeatured,
      variants,
      images,
    };

    try {
      await onSubmit(payload);
      router.push("/products");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save product.";
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <Link
            href="/products"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-1"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>Back to Products</span>
          </Link>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            {isEdit ? `Edit Product: ${initialData?.title}` : "Create New Apparel Product"}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/products"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Saving Product...</span>
              </>
            ) : (
              <span>{isEdit ? "Update Product" : "Publish Product"}</span>
            )}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Basic Attributes Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
          General Information
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Product Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Classic Organic Cotton Crewneck T-Shirt"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-slate-800 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Custom Slug (Optional, auto-generated from title if blank)
            </label>
            <input
              type="text"
              placeholder="e.g. classic-organic-cotton-crewneck"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-800 focus:border-slate-800 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Category *
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-slate-800 focus:outline-hidden"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({cat.department || "General"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Department *
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-slate-800 focus:outline-hidden"
            >
              <option value="men">Men</option>
              <option value="women">Women</option>
              <option value="kids">Kids</option>
              <option value="unisex">Unisex</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Audience
            </label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-slate-800 focus:outline-hidden"
            >
              <option value="adult">Adult</option>
              <option value="youth">Youth</option>
              <option value="toddler">Toddler</option>
              <option value="all">All</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Subcategory
            </label>
            <input
              type="text"
              placeholder="e.g. tops, bottoms, outerwear"
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-slate-800 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Fabric Composition
            </label>
            <input
              type="text"
              placeholder="e.g. 100% Combed Cotton, French Terry"
              value={fabric}
              onChange={(e) => setFabric(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-slate-800 focus:outline-hidden"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Product Description
            </label>
            <textarea
              rows={3}
              placeholder="Detailed marketing description, fit profile, and care instructions..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-slate-800 focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Pricing & Visibility Options */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
          Base Pricing & Storefront Visibility
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Base Price ($USD) *
            </label>
            <input
              type="number"
              step="0.01"
              min={0}
              required
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm font-semibold text-slate-900 focus:border-slate-800 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-3 pt-6">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 cursor-pointer rounded text-slate-900"
            />
            <label htmlFor="isActive" className="cursor-pointer text-xs font-semibold text-slate-800">
              Active (Visible in Storefront)
            </label>
          </div>

          <div className="flex items-center gap-3 pt-6">
            <input
              type="checkbox"
              id="isFeatured"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="h-4 w-4 cursor-pointer rounded text-slate-900"
            />
            <label htmlFor="isFeatured" className="cursor-pointer text-xs font-semibold text-slate-800">
              Featured on Homepage
            </label>
          </div>
        </div>
      </div>

      {/* Image Gallery */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Product Images</h3>
            <p className="text-xs text-slate-500">
              Supply high-resolution media URLs. Click star to select thumbnail.
            </p>
          </div>
        </div>

        {/* Add Image input */}
        <div className="flex items-center gap-2">
          <input
            type="url"
            placeholder="Paste image URL (https://...)"
            value={newImageUrl}
            onChange={(e) => setNewImageUrl(e.target.value)}
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-slate-800 focus:outline-hidden"
          />
          <button
            type="button"
            onClick={handleAddImage}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Image</span>
          </button>
        </div>

        {/* Image Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {images.map((img, idx) => (
            <div
              key={idx}
              className={`relative group rounded-xl border overflow-hidden ${
                img.is_primary
                  ? "border-amber-400 ring-2 ring-amber-400/20"
                  : "border-slate-200"
              }`}
            >
              <img
                src={img.image_url}
                alt={img.alt_text || "Product thumbnail"}
                className="h-36 w-full object-cover bg-slate-100"
              />
              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSetPrimaryImage(idx)}
                  className={`rounded-lg p-1.5 transition ${
                    img.is_primary ? "bg-amber-400 text-slate-900" : "bg-white text-slate-700 hover:bg-amber-100"
                  }`}
                  title="Make Primary Thumbnail"
                >
                  <Star className="h-4 w-4 fill-current" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveImage(idx)}
                  className="rounded-lg bg-white p-1.5 text-rose-600 hover:bg-rose-50 transition"
                  title="Remove Image"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {img.is_primary && (
                <div className="absolute top-2 left-2 rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-slate-900 shadow-xs">
                  Primary
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Sizing & Color Variant Matrix */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <VariantMatrixEditor
          variants={variants}
          onChange={setVariants}
          basePrice={basePrice}
        />
      </div>
    </form>
  );
}
