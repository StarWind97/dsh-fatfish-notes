/** Shared literal terms; never interpret a user's search as a regular expression. */
export function searchTerms(query = ''): string[] { return [...new Set(query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean))] }
export function matchRanges(value: string, query: string): Array<[number, number]> {
  const text = value.toLocaleLowerCase(), ranges: Array<[number, number]> = []
  for (const term of searchTerms(query)) {
    let pos = 0
    while ((pos = text.indexOf(term, pos)) >= 0) { ranges.push([pos, pos + term.length]); pos += term.length }
  }
  const merged: Array<[number, number]> = []
  for (const [start, end] of ranges.sort((a, b) => a[0] - b[0])) {
    const last = merged.at(-1)
    if (last && start <= last[1]) last[1] = Math.max(end, last[1]); else merged.push([start, end])
  }
  return merged
}
