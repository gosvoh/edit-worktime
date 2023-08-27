"use client";

import InfiniteCanvasConstructor, {
  InfiniteCanvas,
  InfiniteCanvasRenderingContext2D,
} from "ef-infinite-canvas";
import { useCallback, useEffect, useRef, useState } from "react";

export default function Editor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ctx, setCtx] = useState<InfiniteCanvasRenderingContext2D | null>(null);

  useEffect(() => {
    if (!ctx) return;

    // Set line width
    ctx!.lineWidth = 10;

    // Wall
    ctx!.strokeRect(75, 140, 150, 110);

    // Door
    ctx!.fillRect(130, 190, 40, 60);

    // Roof
    ctx!.beginPath();
    ctx!.moveTo(50, 140);
    ctx!.lineTo(150, 60);
    ctx!.lineTo(250, 140);
    ctx!.closePath();
    ctx!.stroke();
  }, [ctx]);

  return (
    <canvas className="editor" ref={canvasRef} width="100vw" height="100vh" />
  );
}
