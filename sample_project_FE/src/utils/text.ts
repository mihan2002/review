/** Collapses whitespace and trims a long body to a readable card preview. */
export function preview(content: string, maxLength = 180): string {
  const normalised = content.replace(/\s+/g, ' ').trim()
  if (normalised.length <= maxLength) return normalised

  const cut = normalised.slice(0, maxLength)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}
