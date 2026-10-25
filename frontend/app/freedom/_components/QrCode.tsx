"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import s from "../freedom.module.css";

// Renders an EIP-681 request as an SVG QR code, generated locally from our own string.
export default function QrCode({ value, label }: { value: string; label: string }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    let live = true;
    QRCode.toString(value, {
      type: "svg",
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0a1f21", light: "#f7fffb" },
    })
      .then((out) => {
        if (live) setSvg(out);
      })
      .catch(() => {
        if (live) setSvg("");
      });
    return () => {
      live = false;
    };
  }, [value]);
  return <div className={s.qr} role="img" aria-label={label} dangerouslySetInnerHTML={{ __html: svg }} />;
}
