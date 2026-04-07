"use client";

import { FormEvent, useMemo, useState } from "react";

const validExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".mp4", ".gifv", ".bmp", ".tiff"];

function normalizeUrl(value: string) {
  try {
    return new URL(value.trim()).toString();
  } catch {
    if (!/^https?:\/\//i.test(value.trim())) {
      return normalizeUrl(`https://${value.trim()}`);
    }
    return "";
  }
}

function parseImgurUrl(value: string) {
  const normalized = normalizeUrl(value);
  if (!normalized) return null;

  try {
    const url = new URL(normalized);
    const host = url.hostname.toLowerCase();
    const pathname = url.pathname.replace(/\/+$|^\//g, "");

    if (!/(^|\.)imgur\.com$/i.test(host) || !pathname) return null;

    // Direct image URL already
    if (host === "i.imgur.com") {
      return {
        type: "direct",
        sourceUrl: url.toString(),
        alternateUrl: url.toString(),
        proxyUrl: `/api/imgur?url=${encodeURIComponent(url.toString())}`,
      };
    }

    const imageIdMatch = pathname.match(/^(?:gallery\/|a\/)?([A-Za-z0-9]{7,8})(?:\.[A-Za-z0-9]+)?$/);
    if (!imageIdMatch) return null;

    const id = imageIdMatch[1];
    const extMatch = pathname.match(/(\.[A-Za-z0-9]+)$/);
    const ext = extMatch && validExtensions.includes(extMatch[1].toLowerCase()) ? extMatch[1] : ".jpg";
    const alternateUrl = `https://i.imgur.com/${id}${ext}`;

    return {
      type: "image",
      sourceUrl: url.toString(),
      alternateUrl,
      proxyUrl: `/api/imgur?url=${encodeURIComponent(alternateUrl)}`,
    };
  } catch {
    return null;
  }
}

export default function Home() {
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState("");

  const result = useMemo(() => parseImgurUrl(submitted), [submitted]);
  const error = submitted && !result ? "That does not look like a valid Imgur image URL." : "";
  const showResult = !!result && !error;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(input.trim());
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-10 sm:px-8">
        <div className="rounded-3xl border border-white/10 bg-zinc-900/80 p-8 shadow-2xl shadow-black/30 backdrop-blur">
          <h1 className="text-4xl font-semibold tracking-tight text-white">Imgur alternate path helper</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-300">
            Paste an Imgur image or gallery URL and get a direct image path plus a proxy endpoint you can use if Imgur is blocked.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4 sm:flex-row">
            <label className="sr-only" htmlFor="imgur-url">
              Imgur URL
            </label>
            <input
              id="imgur-url"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="https://imgur.com/gallery/ABCDEFG"
              className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
            />
            <button
              type="submit"
              className="rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400"
            >
              Generate path
            </button>
          </form>

          {submitted ? (
            <div className="mt-8 rounded-3xl border border-white/10 bg-black/50 p-6">
              {error ? (
                <p className="text-sm text-rose-300">{error}</p>
              ) : showResult ? (
                <>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-zinc-400">Original URL</p>
                      <p className="break-all text-sm text-zinc-200">{result?.sourceUrl}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-zinc-400">Direct alternate image path</p>
                      <a href={result?.alternateUrl} className="break-all text-sm text-cyan-300 hover:text-cyan-200" target="_blank" rel="noreferrer">
                        {result?.alternateUrl}
                      </a>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-zinc-400">Proxy path (same-origin)</p>
                      <a href={result?.proxyUrl} className="break-all text-sm text-cyan-300 hover:text-cyan-200" target="_blank" rel="noreferrer">
                        {result?.proxyUrl}
                      </a>
                    </div>
                  </div>

                  <div className="mt-6 rounded-3xl border border-white/10 bg-zinc-950/70 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-zinc-400">Preview</p>
                    <div className="mt-4 rounded-3xl border border-white/10 bg-black/60 p-4">
                      <img
                        src={result?.proxyUrl}
                        alt="Imgur preview"
                        className="max-h-[420px] w-full rounded-3xl object-contain"
                      />
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 rounded-3xl border border-white/10 bg-zinc-900/70 p-6 text-sm leading-6 text-zinc-300">
            <p>
              If your browser cannot load Imgur directly, use the proxy path. This app will fetch the image through the server, then serve it from the same origin.
            </p>
            <p>
              Note: this helper only supports Imgur image URLs and gallery IDs. Album pages may not always map to a single direct image.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
