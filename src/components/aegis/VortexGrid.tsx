/**
 * Pure-CSS perspective neon-purple grid matrix.
 * Sits behind hero scenes. Two scrolling planes give a "moving toward you" feel.
 */
export function VortexGrid({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden bg-black ${className}`}>
      {/* perspective floor */}
      <div className="absolute inset-x-0 bottom-0 h-[60%]" style={{ perspective: "600px" }}>
        <div className="absolute inset-0 origin-top vortex-grid-plane" />
      </div>
      {/* perspective ceiling (mirrored) */}
      <div className="absolute inset-x-0 top-0 h-[60%] scale-y-[-1]" style={{ perspective: "600px" }}>
        <div className="absolute inset-0 origin-top vortex-grid-plane" />
      </div>
      {/* center vortex glow */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="h-[60vmin] w-[60vmin] rounded-full vortex-ring animate-spin-slow" style={{ animationDuration: "18s" }} />
        <div className="absolute inset-0 h-[60vmin] w-[60vmin] rounded-full vortex-ring-inner animate-spin-slow" style={{ animationDuration: "9s", animationDirection: "reverse" }} />
      </div>
      {/* radial darkening */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,black_85%)]" />
    </div>
  );
}
