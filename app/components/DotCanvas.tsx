import { useRef, useEffect, useState } from "react";

export default function DotCanvas({ followers }: { followers: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const width = Math.min(containerWidth - 32, 600);
        const height = Math.min(width * 0.667, 400);
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Render dots
  useEffect(() => {
    console.log("Rendering dots for followers:", followers);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear and fill background
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw dots
    for (let i = 0; i < followers; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const color = `hsl(${Math.random() * 360}, 100%, 50%)`;

      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
  }, [followers, dimensions]);

  return (
    <div ref={containerRef} className="w-full max-w-2xl px-4">
      <div className="mt-2 bg-white p-2 sm:p-4 rounded-lg">
        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full h-auto"
        />
      </div>
    </div>
  );
}
