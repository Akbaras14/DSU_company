"use client";
import { ModalNotice } from "@/components/notification-provider";
import { useEffect, useState } from "react";
import type { DeliveryAddress } from "@dsu/contracts";

export type LocationOption = { id: string; name: string };
type LocationLevel = "provinces" | "regencies" | "districts" | "villages";
function useLocations(level: LocationLevel, parent = "") {
  const enabled = level === "provinces" || Boolean(parent);
  const requestKey = `${level}:${parent}`;
  const [result, setResult] = useState<{
    key: string;
    options: LocationOption[];
    error: string;
  }>({ key: "", options: [], error: "" });
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const query = new URLSearchParams({ level, ...(parent ? { parent } : {}) });
    fetch(`/api/v1/locations?${query}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Data wilayah belum dapat dimuat.");
        return response.json() as Promise<LocationOption[]>;
      })
      .then((options) => setResult({ key: requestKey, options, error: "" }))
      .catch((cause) => {
        if (cause instanceof Error && cause.name !== "AbortError")
          setResult({ key: requestKey, options: [], error: cause.message });
      });
    return () => controller.abort();
  }, [enabled, level, parent, requestKey]);
  return {
    options: enabled && result.key === requestKey ? result.options : [],
    loading: enabled && result.key !== requestKey,
    error: enabled && result.key === requestKey ? result.error : "",
  };
}
export function useAddressLocations(value: DeliveryAddress) {
  const provinces = useLocations("provinces");
  const regencies = useLocations("regencies", value.provinceId);
  const districts = useLocations("districts", value.regencyId);
  const villages = useLocations("villages", value.districtId);
  return { provinces, regencies, districts, villages };
}
export function DeliveryAddressFields({
  value,
  onChange,
  locations,
  disabled = false,
  prefix = "customer",
  error = "",
  postalCodeError = "",
  noticeKey = 0,
}: {
  value: DeliveryAddress;
  onChange: (value: DeliveryAddress) => void;
  locations: ReturnType<typeof useAddressLocations>;
  disabled?: boolean;
  prefix?: string;
  error?: string;
  postalCodeError?: string;
  noticeKey?: number;
}) {
  const regionFields = [
    {
      key: "provinceId",
      label: "Provinsi",
      placeholder: "Pilih provinsi",
      list: locations.provinces,
      enabled: true,
    },
    {
      key: "regencyId",
      label: "Kabupaten / Kota",
      placeholder: "Pilih kabupaten / kota",
      list: locations.regencies,
      enabled: !!value.provinceId,
    },
    {
      key: "districtId",
      label: "Kecamatan",
      placeholder: "Pilih kecamatan",
      list: locations.districts,
      enabled: !!value.regencyId,
    },
    {
      key: "villageId",
      label: "Desa / Kelurahan",
      placeholder: "Pilih desa / kelurahan",
      list: locations.villages,
      enabled: !!value.districtId,
    },
  ] as const;
  const locationError =
    error || Object.values(locations).find((location) => location.error)?.error;
  return (
    <>
      <div className="shop-location-grid">
        <label className="shop-field">
          Negara
          <select value="ID" disabled>
            <option value="ID">Indonesia</option>
          </select>
        </label>
        {regionFields.map((field, index) => (
          <label className="shop-field" key={field.key}>
            {field.label}
            <select
              aria-label={field.label}
              id={`${prefix}-${field.key === "provinceId" ? "province" : field.key}`}
              value={value[field.key]}
              disabled={disabled || !field.enabled || field.list.loading}
              onChange={(event) => {
                const next = { ...value, [field.key]: event.target.value };
                regionFields.slice(index + 1).forEach((child) => {
                  next[child.key] = "";
                });
                onChange(next);
              }}
            >
              <option value="">
                {field.list.loading ? "Memuat wilayah..." : field.placeholder}
              </option>
              {field.list.options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
        ))}
        <label className="shop-field">
          Kode pos
          <input
            id={`${prefix}-postal-code`}
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={5}
            value={value.postalCode}
            disabled={disabled}
            aria-invalid={!!postalCodeError}
            aria-describedby={
              postalCodeError ? `${prefix}-postal-error` : undefined
            }
            onChange={(event) =>
              onChange({
                ...value,
                postalCode: event.target.value.replace(/\D/g, "").slice(0, 5),
              })
            }
          />
          {postalCodeError && (
            <small className="shop-error" id={`${prefix}-postal-error`}>
              {postalCodeError}
            </small>
          )}
        </label>
      </div>
      {locationError && (
        <ModalNotice key={`location-${noticeKey}`} message={locationError} />
      )}
      {postalCodeError && (
        <ModalNotice key={`postal-${noticeKey}`} message={postalCodeError} />
      )}
    </>
  );
}
