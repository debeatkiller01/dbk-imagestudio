export function Bubbles() {
  const bubbles = [
    { size: 280, top: "10%", left: "5%", delay: "0s", anim: "animate-float" },
    { size: 200, top: "60%", left: "80%", delay: "2s", anim: "animate-float-slow" },
    { size: 160, top: "30%", left: "70%", delay: "4s", anim: "animate-float" },
    { size: 120, top: "80%", left: "20%", delay: "1s", anim: "animate-float-slow" },
    { size: 240, top: "5%", left: "55%", delay: "3s", anim: "animate-float" },
  ];
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {bubbles.map((b, i) => (
        <div
          key={i}
          className={`absolute rounded-full blur-3xl opacity-30 ${b.anim}`}
          style={{
            width: b.size,
            height: b.size,
            top: b.top,
            left: b.left,
            animationDelay: b.delay,
            background: i % 2 === 0
              ? "radial-gradient(circle, oklch(0.82 0.17 220 / 0.6), transparent 70%)"
              : "radial-gradient(circle, oklch(0.7 0.2 280 / 0.5), transparent 70%)",
          }}
        />
      ))}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,oklch(0.82_0.17_220/0.15),transparent_50%)]" />
    </div>
  );
}