// Thumbnail helper for Alibaba Cloud OSS-hosted images.
//
// Generated images are stored full-size (~1MB, 1024x1536) on OSS. Rendering them
// at full resolution in small grid cells is slow. Alibaba OSS can resize on the
// fly via the `x-oss-process` query param, so we append it for OSS URLs and leave
// everything else (data: URLs, other hosts) untouched.
const OSS_HOST = /(^|\.)aliyuncs\.com$/i;

function isOssImageUrl(url: string): boolean {
  if (!url || !/^https?:\/\//i.test(url)) return false;
  try {
    return OSS_HOST.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

/**
 * Return a thumbnail variant of an OSS image URL constrained to `width` px
 * (height auto), re-encoded to a smaller quality. Non-OSS URLs are returned
 * unchanged so the caller can use this unconditionally.
 */
export function ossThumb(url: string | null | undefined, width = 480, quality = 80): string {
  if (!url) return ''
  if (!isOssImageUrl(url)) return url
  // Don't double-process if a process param is already present.
  if (url.includes('x-oss-process=')) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}x-oss-process=image/resize,w_${Math.round(width)}/quality,q_${Math.round(quality)}`
}
