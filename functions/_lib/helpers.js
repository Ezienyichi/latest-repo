export function vCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function slugify(t) {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
