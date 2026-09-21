// ZaUI stylesheet
import "zmp-ui/zaui.css";
// Tailwind stylesheet
import "@/css/tailwind.scss";
// Design tokens của Miyako
import "@/css/app.scss";

import React from "react";
import { createRoot } from "react-dom/client";

import Layout from "@/components/layout";

import appConfig from "../app-config.json";

if (!window.APP_CONFIG) {
  window.APP_CONFIG = appConfig as any;
}

// Bù khoảng cách an toàn (Safe Area Top) cho iPhone khi chạy trong Zalo Mini App
try {
  const isIOS =
    typeof navigator !== "undefined" &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
  if (isIOS) {
    const test = document.createElement("div");
    test.style.paddingTop = "env(safe-area-inset-top, 0px)";
    document.body.appendChild(test);
    const top = parseInt(window.getComputedStyle(test).paddingTop, 10);
    document.body.removeChild(test);
    // Nếu iOS mà env() trả về 0px (do WebView Zalo chưa inject), đặt mặc định an toàn 48px (chuẩn Dynamic Island / Tai thỏ)
    if (!top || top === 0) {
      document.documentElement.style.setProperty("--sat", "48px");
    }
  }
} catch {
  /* bỏ qua lỗi ngoài browser */
}

const root = createRoot(document.getElementById("app")!);
root.render(React.createElement(Layout));
