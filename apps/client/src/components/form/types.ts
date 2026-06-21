// Form payload types - represents user intent for submission
export type ImagePayload =
  | { type: "existing"; id: string; order: number }
  | { type: "new"; file: File; tempId: string; order: number }
  | { type: "deleted"; id: string };

// UI state types - for display and interaction only
export interface UIImage {
  id: string;
  src: string;
  alt: string;
  source: "existing" | "new";
  // For new images, store the File reference
  file?: File;
}

// Props for existing images from server
export interface ExistingImage {
  id: string;
  src: string;
  alt?: string;
}

// Helper to extract non-deleted payloads for order computation
export function getActivePayloads(
  payloads: ImagePayload[]
): (ImagePayload & { type: "existing" | "new" })[] {
  return payloads.filter(
    (p): p is ImagePayload & { type: "existing" | "new" } =>
      p.type === "existing" || p.type === "new"
  );
}

// Helper to get deleted IDs from payloads
export function getDeletedIds(payloads: ImagePayload[]): string[] {
  return payloads.filter((p) => p.type === "deleted").map((p) => p.id);
}
