import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type Hls from "hls.js";

interface HlsPlayerProps {
  src: string;
}

/**
 * Player HLS (m3u8) tự chủ — không phụ thuộc iframe bên thứ ba.
 * playsInline để iOS không tự nhảy fullscreen; video native nên hỗ trợ PiP.
 * Safari/iOS phát HLS trực tiếp, trình duyệt khác dùng hls.js (nạp động).
 */
const HlsPlayer = forwardRef<HTMLVideoElement, HlsPlayerProps>(({ src }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  useImperativeHandle(ref, () => videoRef.current as HTMLVideoElement);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      return;
    }

    let hls: Hls | undefined;
    let cancelled = false;
    import("hls.js").then(({ default: HlsLib }) => {
      if (cancelled || !videoRef.current) return;
      if (HlsLib.isSupported()) {
        hls = new HlsLib();
        hls.loadSource(src);
        hls.attachMedia(videoRef.current);
      }
    });

    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      controls
      playsInline
      autoPlay
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 8,
        background: "#000",
      }}
    />
  );
});

HlsPlayer.displayName = "HlsPlayer";

export default HlsPlayer;
