"use client";

import { useEffect } from "react";
import Script from "next/script";

interface SwaggerUIConfig {
  url: string;
  dom_id: string;
  docExpansion: "list" | "full" | "none";
  defaultModelsExpandDepth: number;
  displayOperationId: boolean;
  filter: boolean;
}

interface SwaggerUIBundleFn {
  (config: SwaggerUIConfig): void;
}

declare global {
  interface Window {
    SwaggerUIBundle?: SwaggerUIBundleFn;
  }
}

export default function SwaggerUI() {
  useEffect(() => {
    function initSwagger() {
      if (typeof window !== "undefined" && window.SwaggerUIBundle) {
        window.SwaggerUIBundle({
          url: "/api/docs",
          dom_id: "#swagger-ui",
          docExpansion: "list",
          defaultModelsExpandDepth: 0,
          displayOperationId: false,
          filter: true,
        });
      }
    }

    // Try initializing immediately in case script is already loaded
    initSwagger();
  }, []);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.18.2/swagger-ui.css"
      />
      <div id="swagger-ui" />
      <Script
        src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.18.2/swagger-ui-bundle.js"
        strategy="afterInteractive"
        onReady={initSwagger}
      />
    </>
  );
}

function initSwagger() {
  if (typeof window !== "undefined" && window.SwaggerUIBundle) {
    window.SwaggerUIBundle({
      url: "/api/docs",
      dom_id: "#swagger-ui",
      docExpansion: "list",
      defaultModelsExpandDepth: 0,
      displayOperationId: false,
      filter: true,
    });
  }
}
