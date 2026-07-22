import { useEffect, useRef, useState } from 'react';

// Fires once when scrolled into view. Respects prefers-reduced-motion by
// skipping the animation entirely and showing the final value immediately.
export default function CountUp({ end, decimals = 0, prefix = '', suffix = '', duration = 1800 }) {
  const ref = useRef(null);
  const triggeredRef = useRef(false);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) { setValue(end); return; }

    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !triggeredRef.current) {
        triggeredRef.current = true;
        const start = performance.now();
        const step = (now) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setValue(end * eased);
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        observer.disconnect();
      }
    }, { threshold: 0.3 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [end, duration]);

  const display = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toLocaleString();
  return <span ref={ref}>{prefix}{display}{suffix}</span>;
}
