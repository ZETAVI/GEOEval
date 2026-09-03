import type {
  MediaResourceEffectiveStatus,
  MediaResourceStatus,
  MediaSupplierStatus,
} from "./media-supply.types.js";

export function mediaResourceEffectiveStatus(
  resourceStatus: MediaResourceStatus,
  supplierStatus: MediaSupplierStatus,
): MediaResourceEffectiveStatus {
  if (resourceStatus === "INACTIVE") return "RESOURCE_INACTIVE";
  if (supplierStatus === "INACTIVE") return "SUPPLIER_INACTIVE";
  return "ACTIVE";
}

export function isMediaResourceEffectivelyActive(
  resourceStatus: MediaResourceStatus,
  supplierStatus: MediaSupplierStatus,
): boolean {
  return (
    mediaResourceEffectiveStatus(resourceStatus, supplierStatus) === "ACTIVE"
  );
}
