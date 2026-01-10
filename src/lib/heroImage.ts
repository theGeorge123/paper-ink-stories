const SUPABASE_URL = 'https://rtmcisfdtnmdytvnmptx.supabase.co';
const HERO_BUCKET = 'hero-portraits';
const PUBLIC_BASE_URL = `${SUPABASE_URL}/storage/v1/object/public/${HERO_BUCKET}/`;

export function normalizeHeroImageUrl(url?: string | null): string | null {
  if (!url) return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    if (trimmed.includes('/storage/v1/object/public/')) {
      return trimmed;
    }

    if (trimmed.includes('/storage/v1/object/sign/')) {
      const match = trimmed.match(/\/storage\/v1\/object\/sign\/[^/]+\/([^?]+)/);
      if (match?.[1]) {
        return `${PUBLIC_BASE_URL}${match[1]}`;
      }
    }

    return trimmed;
  }

  if (trimmed.startsWith(`${HERO_BUCKET}/`)) {
    return `${PUBLIC_BASE_URL}${trimmed.replace(`${HERO_BUCKET}/`, '')}`;
  }

  return `${PUBLIC_BASE_URL}${trimmed}`;
}
