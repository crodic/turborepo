export function stripHtmlTags(str?: string) {
  if (!str) return '';
  return str.replace(/<[^>]*>/g, '').trim();
}
