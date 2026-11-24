"use client";

import React, { useState, useEffect } from "react";
import { User, UserAddress } from "@/types";
import { CAMBODIA_PROVINCES, PHNOM_PENH_KHANS } from "@/lib/cambodiaLocations";
import { getStorageItem, setStorageItem } from "@/lib/storage";
import {
  fetchCustomerAddresses,
  createCustomerAddress,
  updateCustomerAddress,
  deleteCustomerAddress,
} from "@/lib/api";

export interface SavedAddress {
  id: string;
  fullName: string;
  phone: string;
  telegram?: string;
  cityProvince: string;
  khanDistrict: string;
  sangkatCommune: string;
  streetAddress: string;
  landmark?: string;
  isDefault: boolean;
}

const STORAGE_KEY = "clothes_saved_addresses";

interface AddressBookTabProps {
  user: User;
  onUpdateUser: (fields: Partial<User>) => Promise<void> | void;
}

export default function AddressBookTab({ user, onUpdateUser }: AddressBookTabProps) {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Form state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [telegram, setTelegram] = useState("");
  const [cityProvince, setCityProvince] = useState("Phnom Penh");
  const [khanDistrict, setKhanDistrict] = useState("Boeng Keng Kang (BKK)");
  const [sangkatCommune, setSangkatCommune] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  // Initialize addresses from backend or storage or user.address
  useEffect(() => {
    let isMounted = true;

    async function loadAddresses() {
      try {
        const backendAddrs = await fetchCustomerAddresses();
        if (isMounted && backendAddrs && backendAddrs.length > 0) {
          const mapped: SavedAddress[] = backendAddrs.map((b) => ({
            id: String(b.id),
            fullName: b.full_name,
            phone: b.phone,
            telegram: b.telegram || "",
            cityProvince: b.city_province,
            khanDistrict: b.khan_district || "",
            sangkatCommune: b.sangkat_commune || "",
            streetAddress: b.street_address,
            landmark: b.landmark || "",
            isDefault: b.is_default,
          }));
          setAddresses(mapped);
          setStorageItem(STORAGE_KEY, mapped);
          return;
        }
      } catch (e) {
        console.warn("Backend address fetch error, using local:", e);
      }

      const saved = getStorageItem<SavedAddress[]>(STORAGE_KEY, []);
      if (isMounted) {
        if (saved && saved.length > 0) {
          setAddresses(saved);
        } else {
          // Seed from user.address
          const initialAddr: SavedAddress = {
            id: "addr-default-1",
            fullName: user.name || "Customer",
            phone: user.phone || "012889977",
            telegram: user.telegram || "",
            cityProvince: user.address?.cityProvince || "Phnom Penh",
            khanDistrict: user.address?.khanDistrict || "Chamkarmon",
            sangkatCommune: user.address?.sangkatCommune || "Boeung Keng Kang 1 (BKK1)",
            streetAddress: user.address?.streetAddress || "House #42, Street 310",
            landmark: user.address?.landmark || "Near Brown Coffee BKK57",
            isDefault: true,
          };
          setAddresses([initialAddr]);
          setStorageItem(STORAGE_KEY, [initialAddr]);
        }
      }
    }

    loadAddresses();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const resetForm = () => {
    setFullName(user.name || "");
    setPhone(user.phone || "");
    setTelegram(user.telegram || "");
    setCityProvince("Phnom Penh");
    setKhanDistrict("Boeng Keng Kang (BKK)");
    setSangkatCommune("");
    setStreetAddress("");
    setLandmark("");
    setIsDefault(false);
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsDefault(addresses.length === 0);
    setIsFormOpen(true);
    setFeedback(null);
  };

  const handleOpenEdit = (addr: SavedAddress) => {
    setEditingId(addr.id);
    setFullName(addr.fullName);
    setPhone(addr.phone);
    setTelegram(addr.telegram || "");
    setCityProvince(addr.cityProvince);
    setKhanDistrict(addr.khanDistrict);
    setSangkatCommune(addr.sangkatCommune);
    setStreetAddress(addr.streetAddress);
    setLandmark(addr.landmark || "");
    setIsDefault(addr.isDefault);
    setIsFormOpen(true);
    setFeedback(null);
  };

  const syncDefaultWithUser = (addr: SavedAddress) => {
    const userAddr: UserAddress = {
      cityProvince: addr.cityProvince,
      khanDistrict: addr.khanDistrict,
      sangkatCommune: addr.sangkatCommune,
      streetAddress: addr.streetAddress,
      landmark: addr.landmark,
      country: "Cambodia",
    };
    onUpdateUser({
      phone: addr.phone,
      telegram: addr.telegram,
      address: userAddr,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    let updatedList: SavedAddress[] = [];

    if (editingId) {
      const numId = Number(editingId);
      if (!isNaN(numId)) {
        try {
          await updateCustomerAddress(numId, {
            full_name: fullName.trim(),
            phone: phone.trim(),
            telegram: telegram.trim(),
            city_province: cityProvince,
            khan_district: khanDistrict,
            sangkat_commune: sangkatCommune.trim(),
            street_address: streetAddress.trim(),
            landmark: landmark.trim(),
            is_default: isDefault,
          });
        } catch (err) {
          console.warn("Could not sync address update with backend:", err);
        }
      }

      updatedList = addresses.map((addr) => {
        if (addr.id === editingId) {
          return {
            ...addr,
            fullName: fullName.trim(),
            phone: phone.trim(),
            telegram: telegram.trim(),
            cityProvince,
            khanDistrict,
            sangkatCommune: sangkatCommune.trim(),
            streetAddress: streetAddress.trim(),
            landmark: landmark.trim(),
            isDefault: isDefault || addr.isDefault,
          };
        }
        return isDefault ? { ...addr, isDefault: false } : addr;
      });
      setFeedback({ type: "success", message: "Delivery address updated successfully." });
    } else {
      let createdBackendId: string | null = null;
      try {
        const created = await createCustomerAddress({
          full_name: fullName.trim(),
          phone: phone.trim(),
          telegram: telegram.trim(),
          city_province: cityProvince,
          khan_district: khanDistrict,
          sangkat_commune: sangkatCommune.trim(),
          street_address: streetAddress.trim(),
          landmark: landmark.trim(),
          is_default: isDefault || addresses.length === 0,
        });
        if (created?.id) {
          createdBackendId = String(created.id);
        }
      } catch (err) {
        console.warn("Could not sync new address with backend:", err);
      }

      const newAddress: SavedAddress = {
        id: createdBackendId || `addr-${Date.now()}`,
        fullName: fullName.trim(),
        phone: phone.trim(),
        telegram: telegram.trim(),
        cityProvince,
        khanDistrict,
        sangkatCommune: sangkatCommune.trim(),
        streetAddress: streetAddress.trim(),
        landmark: landmark.trim(),
        isDefault: isDefault || addresses.length === 0,
      };

      if (newAddress.isDefault) {
        updatedList = [newAddress, ...addresses.map((a) => ({ ...a, isDefault: false }))];
      } else {
        updatedList = [...addresses, newAddress];
      }
      setFeedback({ type: "success", message: "New delivery address added successfully." });
    }

    setAddresses(updatedList);
    setStorageItem(STORAGE_KEY, updatedList);

    const defaultAddr = updatedList.find((a) => a.isDefault) || updatedList[0];
    if (defaultAddr) {
      syncDefaultWithUser(defaultAddr);
    }

    resetForm();
  };

  const handleSetDefault = async (id: string) => {
    const numId = Number(id);
    if (!isNaN(numId)) {
      try {
        await updateCustomerAddress(numId, { is_default: true });
      } catch (e) {
        console.warn("Could not sync default address update with backend:", e);
      }
    }

    const updated = addresses.map((addr) => ({
      ...addr,
      isDefault: addr.id === id,
    }));
    setAddresses(updated);
    setStorageItem(STORAGE_KEY, updated);

    const target = updated.find((a) => a.id === id);
    if (target) {
      syncDefaultWithUser(target);
      setFeedback({ type: "success", message: `"${target.streetAddress}" set as default delivery address.` });
    }
  };

  const handleDelete = async (id: string) => {
    if (addresses.length <= 1) {
      setFeedback({ type: "error", message: "You must keep at least one delivery address." });
      return;
    }

    const numId = Number(id);
    if (!isNaN(numId)) {
      try {
        await deleteCustomerAddress(numId);
      } catch (e) {
        console.warn("Could not sync address deletion with backend:", e);
      }
    }

    const target = addresses.find((a) => a.id === id);
    const updated = addresses.filter((a) => a.id !== id);

    if (target?.isDefault && updated.length > 0) {
      updated[0].isDefault = true;
      syncDefaultWithUser(updated[0]);
    }

    setAddresses(updated);
    setStorageItem(STORAGE_KEY, updated);
    setFeedback({ type: "success", message: "Address deleted successfully." });
  };

  return (
    <div className="space-y-6">
      {/* Tab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="font-heading text-lg sm:text-xl font-semibold text-ink">
            Delivery Addresses
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            Manage your default delivery destination and secondary addresses for Cambodia courier dispatch.
          </p>
        </div>

        {!isFormOpen && (
          <button
            onClick={handleOpenAdd}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 border border-ink bg-ink text-paper px-3.5 py-1.5 text-xs font-medium hover:bg-charcoal transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Add New Address</span>
          </button>
        )}
      </div>

      {/* Feedback Message */}
      {feedback && (
        <div
          className={`p-3.5 text-xs flex items-center justify-between border ${
            feedback.type === "success"
              ? "bg-sage/10 border-sage/30 text-sage"
              : "bg-error/10 border-error/30 text-error"
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="opacity-60 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Add / Edit Form Modal / Card */}
      {isFormOpen && (
        <div className="border border-border bg-paper p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-3 mb-5">
            <h2 className="font-heading text-sm font-semibold text-ink">
              {editingId ? "Edit Delivery Address" : "Add New Delivery Address"}
            </h2>
            <button
              onClick={resetForm}
              className="text-xs text-ink-soft hover:text-ink transition-colors"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-soft mb-1">
                  Recipient Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full border border-border bg-backdrop px-3 py-2 text-xs text-ink focus:border-ink focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-soft mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 012 889 977"
                  className="w-full border border-border bg-backdrop px-3 py-2 text-xs text-ink focus:border-ink focus:outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-soft mb-1">
                  City / Province
                </label>
                <select
                  value={cityProvince}
                  onChange={(e) => {
                    setCityProvince(e.target.value);
                    if (e.target.value !== "Phnom Penh") {
                      setKhanDistrict("Krong " + e.target.value);
                    } else {
                      setKhanDistrict("Boeng Keng Kang (BKK)");
                    }
                  }}
                  className="w-full border border-border bg-backdrop px-3 py-2 text-xs text-ink focus:border-ink focus:outline-hidden"
                >
                  {CAMBODIA_PROVINCES.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-soft mb-1">
                  Khan / District
                </label>
                {cityProvince === "Phnom Penh" ? (
                  <select
                    value={khanDistrict}
                    onChange={(e) => setKhanDistrict(e.target.value)}
                    className="w-full border border-border bg-backdrop px-3 py-2 text-xs text-ink focus:border-ink focus:outline-hidden"
                  >
                    {PHNOM_PENH_KHANS.map((khan) => (
                      <option key={khan} value={khan}>
                        {khan}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    value={khanDistrict}
                    onChange={(e) => setKhanDistrict(e.target.value)}
                    placeholder="District / Khan"
                    className="w-full border border-border bg-backdrop px-3 py-2 text-xs text-ink focus:border-ink focus:outline-hidden"
                  />
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-soft mb-1">
                  Sangkat / Commune
                </label>
                <input
                  type="text"
                  required
                  value={sangkatCommune}
                  onChange={(e) => setSangkatCommune(e.target.value)}
                  placeholder="e.g. Boeung Keng Kang 1"
                  className="w-full border border-border bg-backdrop px-3 py-2 text-xs text-ink focus:border-ink focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-soft mb-1">
                  Telegram Handle (Optional)
                </label>
                <input
                  type="text"
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  placeholder="@username"
                  className="w-full border border-border bg-backdrop px-3 py-2 text-xs text-ink focus:border-ink focus:outline-hidden font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-soft mb-1">
                  Street Address & House #
                </label>
                <input
                  type="text"
                  required
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="e.g. House #42, Street 310"
                  className="w-full border border-border bg-backdrop px-3 py-2 text-xs text-ink focus:border-ink focus:outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-soft mb-1">
                  Courier Landmark Note
                </label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="e.g. Near Brown Coffee BKK57 / Opposite Pharmacy"
                  className="w-full border border-border bg-backdrop px-3 py-2 text-xs text-ink focus:border-ink focus:outline-hidden"
                />
                <p className="text-[10px] text-ink-soft mt-1">
                  Helps delivery couriers locate your door quickly in Cambodia.
                </p>
              </div>

              <div className="sm:col-span-2">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="h-3.5 w-3.5 rounded-none border-border text-ink focus:ring-0"
                  />
                  <span className="text-xs text-ink font-medium">
                    Set as default delivery address for checkout
                  </span>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="border border-border bg-paper text-ink px-4 py-2 text-xs font-medium hover:bg-surface transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="border border-ink bg-ink text-paper px-5 py-2 text-xs font-medium hover:bg-charcoal transition-colors"
              >
                Save Address
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Address Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {addresses.map((addr) => (
          <div
            key={addr.id}
            className={`border bg-paper p-5 transition-colors relative flex flex-col justify-between ${
              addr.isDefault
                ? "border-ink shadow-xs"
                : "border-border hover:border-border-strong"
            }`}
          >
            <div>
              {/* Header: Name & Default Badge */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-semibold text-xs sm:text-sm text-ink">
                    {addr.fullName}
                  </h3>
                  {addr.isDefault && (
                    <span className="inline-flex items-center gap-1 rounded-xs bg-ink text-paper px-2 py-0.5 text-[9px] font-semibold tracking-wider uppercase">
                      Default
                    </span>
                  )}
                </div>

                <span className="text-[10px] font-medium text-ink-soft border border-border px-1.5 py-0.5 bg-surface/50">
                  {addr.cityProvince}
                </span>
              </div>

              {/* Address details */}
              <div className="space-y-1 text-xs text-ink-soft">
                <p className="text-ink font-medium">{addr.streetAddress}</p>
                <p>
                  {addr.sangkatCommune}, {addr.khanDistrict}
                </p>
                <p>{addr.cityProvince}, Cambodia</p>

                {addr.landmark && (
                  <p className="text-[11px] text-ink-soft/90 italic pt-1 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 shrink-0 text-ctrl-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Landmark: {addr.landmark}</span>
                  </p>
                )}

                <div className="pt-2 text-[11px] text-ink flex items-center gap-3">
                  <span className="font-mono">📞 {addr.phone}</span>
                  {addr.telegram && (
                    <span className="font-mono text-ctrl-red">✈️ {addr.telegram}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEdit(addr)}
                  className="text-ink hover:underline font-medium"
                >
                  Edit
                </button>
                <span className="text-border-strong">·</span>
                <button
                  onClick={() => handleDelete(addr.id)}
                  className="text-error hover:underline font-medium"
                >
                  Delete
                </button>
              </div>

              {!addr.isDefault && (
                <button
                  onClick={() => handleSetDefault(addr.id)}
                  className="text-[11px] border border-border px-2 py-1 text-ink-soft hover:text-ink hover:border-ink transition-colors"
                >
                  Set as Default
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
