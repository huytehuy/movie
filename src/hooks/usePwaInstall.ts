import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);

const checkStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  // iOS Safari
  (navigator as unknown as { standalone?: boolean }).standalone === true;

/**
 * Trạng thái cài đặt PWA:
 * - canPrompt: trình duyệt hỗ trợ prompt cài trực tiếp (Chrome/Edge/Android)
 * - needsIosGuide: iOS không có prompt, phải hướng dẫn thủ công qua nút Chia sẻ
 * - isStandalone: đang chạy trong app đã cài (ẩn nút cài)
 */
export const usePwaInstall = () => {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(checkStandalone);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstallEvent(null);
      setIsStandalone(true);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    setInstallEvent(null);
  };

  return {
    canPrompt: installEvent !== null,
    needsIosGuide: isIos && !isStandalone,
    isStandalone,
    install,
  };
};
