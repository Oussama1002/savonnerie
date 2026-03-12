import React, { useEffect, useRef } from "react";

/** Renders a Code128 barcode for the given value. Loads JsBarcode from CDN (no npm package). */
export const BarcodeDisplay: React.FC<{
  value: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  className?: string;
}> = ({ value, width = 1.2, height = 36, displayValue = true, fontSize = 10, className }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!value || !svgRef.current) return;
    const loadAndDraw = () => {
      const JsBarcode = (window as unknown as { JsBarcode?: (el: SVGElement, value: string, opts: Record<string, unknown>) => void }).JsBarcode;
      if (JsBarcode && svgRef.current) {
        try {
          svgRef.current.innerHTML = "";
          JsBarcode(svgRef.current, value, {
            format: "CODE128",
            width,
            height,
            displayValue,
            fontSize,
            margin: 0,
          });
        } catch (_) {
          // ignore
        }
      }
    };
    if ((window as unknown as { JsBarcode?: unknown }).JsBarcode) {
      loadAndDraw();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js";
    script.async = true;
    script.onload = loadAndDraw;
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [value, width, height, displayValue, fontSize]);

  return <svg ref={svgRef} className={className} />;
};
