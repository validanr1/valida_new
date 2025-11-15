import { PropsWithChildren, useEffect, useRef, useState } from "react";

type RevealProps = PropsWithChildren<{ direction?: "up"|"left"|"right"; delayMs?: number }>;

const dirMap: Record<string, string> = {
  up: "translate-y-3",
  left: "-translate-x-3",
  right: "translate-x-3",
};

const Reveal = ({ children, direction = "up", delayMs = 0 }: RevealProps) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          setTimeout(() => setVisible(true), delayMs);
          obs.disconnect();
        }
      });
    }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [delayMs]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? "opacity-100 translate-x-0 translate-y-0" : `opacity-0 ${dirMap[direction]}`}`}
    >
      {children}
    </div>
  );
};

export default Reveal;