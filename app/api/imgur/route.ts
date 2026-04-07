import { NextResponse } from "next/server";

const allowedHosts = ["imgur.com", "i.imgur.com", "m.imgur.com"];
const validImageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".mp4", ".gifv", ".bmp", ".tiff"];

function normalizeImgurUrl(value: string) {
  try {
    const url = new URL(value);
    if (!allowedHosts.includes(url.hostname.toLowerCase())) return null;
    return url;
  } catch {
    try {
      const url = new URL(`https://${value}`);
      if (!allowedHosts.includes(url.hostname.toLowerCase())) return null;
      return url;
    } catch {
      return null;
    }
  }
}

function buildProxyTarget(url: URL): string | null {
  if (url.hostname.toLowerCase() === "i.imgur.com") {
    return url.toString();
  }

  const path = url.pathname.replace(/\/+$|^\//g, "");
  const idMatch = path.match(/^(?:gallery\/|a\/)?([A-Za-z0-9]{7,8})(?:\.(jpg|jpeg|png|gif|webp|mp4|gifv|bmp|tiff))?$/i);
  if (!idMatch) return null;

  const id = idMatch[1];
  const ext = idMatch[2] ? `.${idMatch[2].toLowerCase()}` : ".jpg";
  if (!validImageExtensions.includes(ext)) return null;

  return `https://i.imgur.com/${id}${ext}`;
}

export async function GET(request: Request) {
  const urlParam = new URL(request.url).searchParams.get("url");
  if (!urlParam) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  const url = normalizeImgurUrl(urlParam);
  if (!url) {
    return new NextResponse("Invalid Imgur URL", { status: 400 });
  }

  const target = buildProxyTarget(url);
  if (!target) {
    return new NextResponse("Unsupported Imgur path", { status: 400 });
  }

  const response = await fetch(target, {
    headers: {
      "User-Agent": "Next.js Imgur Proxy",
      Accept: "*/*",
    },
  });

  if (!response.ok) {
    return new NextResponse(`Imgur fetch failed: ${response.statusText}`, {
      status: response.status,
    });
  }

  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const buffer = await response.arrayBuffer();

  return new NextResponse(buffer, {
    status: response.status,
    headers: {
      "content-type": contentType,
      "cache-control": "public",
    },
  });
}
