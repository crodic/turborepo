import { clsx, type ClassValue } from "clsx";
import { decodeJwt } from "jose";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function decodeToken(token: string) {
  try {
    const payload = decodeJwt(token);
    return payload;
  } catch (error) {
    console.log(error);
    return null;
  }
}

/**
 * Fetches a file from a given URL and returns a Promise that resolves to a File object.
 * The function will timeout after the specified timeout (in milliseconds) and throw an Error.
 * If the URL does not contain a valid filename (i.e. has no extension), a random filename will be generated.
 * If the URL extension does not match the MIME type of the file, the extension will be corrected.
 * @param url The URL of the file to fetch.
 * @param timeout The timeout in milliseconds (default: 15000).
 * @returns A Promise that resolves to a File object.
 */
export async function urlToFile(url: string, timeout = 15000): Promise<File> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok)
      throw new Error(`Failed to fetch ${url}. Status: ${res.status}`);

    const blob = await res.blob();
    const mime = blob.type; // e.g. image/jpeg
    const extFromMime = mime.split("/")[1] || "jpg";

    // Extract filename from URL
    const cleanUrl = url.split("?")[0].split("#")[0]; // remove ?query and #hash
    const rawName = cleanUrl.substring(cleanUrl.lastIndexOf("/") + 1); // part after last /

    let finalName: string;

    const hasValidName = rawName && rawName.includes(".");
    const hasExt = hasValidName && rawName.split(".").pop();

    if (hasValidName && hasExt) {
      // Check extension correctness
      const extFromUrl = rawName.split(".").pop()!.toLowerCase();

      if (extFromUrl === extFromMime.toLowerCase()) {
        // URL extension matches MIME → use it
        finalName = rawName;
      } else {
        // Extension mismatch → fix extension
        const basename = rawName.replace(/\.[^/.]+$/, ""); // remove ext
        finalName = `${basename}.${extFromMime}`;
      }
    } else {
      // URL no filename OR invalid → fallback to random filename
      finalName = `image-${crypto.randomUUID()}.${extFromMime}`;
    }

    return new File([blob], finalName, { type: blob.type });
  } catch (err) {
    console.error("urlToFile error:", err);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
