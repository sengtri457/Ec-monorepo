"use client";

import React from "react";
import { ProductForm } from "@/components/products/ProductForm";
import { createAdminProduct } from "@/lib/api/catalogApi";

export default function NewProductPage() {
  const handleCreate = async (payload: any) => {
    await createAdminProduct(payload);
  };

  return (
    <div className="space-y-6">
      <ProductForm onSubmit={handleCreate} isEdit={false} />
    </div>
  );
}
