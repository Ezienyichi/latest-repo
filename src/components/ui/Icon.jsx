// Single place defaults live: default 20px, nav 24px, inline-with-text 16px,
// stroke-width 1.75, colour always inherits currentColor (never hardcoded).
const SIZES = { default: 20, nav: 24, inline: 16 };

export default function Icon({ icon: IconCmp, size = 'default', ...props }) {
  if (!IconCmp) return null;
  const px = typeof size === 'number' ? size : (SIZES[size] ?? SIZES.default);
  return <IconCmp size={px} strokeWidth={1.75} {...props} />;
}
