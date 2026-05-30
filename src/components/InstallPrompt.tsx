"use client";
import { useEffect, useState } from "react";
import { X, Download, Share } from "lucide-react";

type Mode = "android" | "ios" | null;

export function InstallPrompt() {
  const [mode, setMode] = useState<Mode>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<Event & { prompt: () => Promise<void> } | null>(null);
  const [dismissed, setDismissed] = useState(true); // start hidden; reveal after check

  useEffect(() => {
    if (localStorage.getItem("pwa-install-dismissed")) return;

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true);

    if (isStandalone) return;

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as { MSStream?: unknown }).MSStream;
    const isAndroid = /android/i.test(navigator.userAgent);

    if (isIOS) {
      setMode("ios");
      setDismissed(false);
    } else if (isAndroid) {
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as Event & { prompt: () => Promise<void> });
        setMode("android");
        setDismissed(false);
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem("pwa-install-dismissed", "1");
    setDismissed(true);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    dismiss();
  };

  if (dismissed || !mode) return null;

  return (
    <div className="fixed bottom-16 inset-x-3 z-50 md:bottom-6 md:left-auto md:right-6 md:max-w-sm">
      <div className="rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl p-4">
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          {/* App icon */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="4unter" className="h-12 w-12 rounded-xl flex-shrink-0" />

          <div>
            <p className="text-sm font-semibold text-white leading-tight">Install 4unter</p>
            <p className="text-xs text-zinc-400 mt-0.5 leading-snug">
              {mode === "ios"
                ? "Add to your home screen for the full app experience."
                : "Install the app for faster access and offline support."}
            </p>
          </div>
        </div>

        {mode === "ios" ? (
          <div className="mt-3 rounded-xl bg-zinc-800 px-3 py-2.5 text-xs text-zinc-300 leading-relaxed">
            Tap <Share className="inline h-3.5 w-3.5 mx-0.5 text-blue-400" />
            {" "}(Share) at the bottom of Safari, then{" "}
            <strong className="text-white">Add to Home Screen</strong>.
          </div>
        ) : (
          <button
            onClick={install}
            className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 transition-colors py-2.5 text-sm font-semibold text-white"
          >
            <Download className="h-4 w-4" />
            Install App
          </button>
        )}
      </div>
    </div>
  );
}
