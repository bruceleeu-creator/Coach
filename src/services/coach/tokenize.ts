export function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term))
}

export function matchedTerms(text: string, terms: string[]): string[] {
  return terms.filter((term) => text.includes(term))
}

export function tokenize(text: string): string[] {
  const normalized = text.toLowerCase()
  const latinWords = normalized.match(/[a-z0-9]{2,}/g) || []
  const chinesePairs = Array.from(normalized.matchAll(/[\u4e00-\u9fa5]{2,}/g))
    .flatMap((match) => {
      const value = match[0]
      const words: string[] = []
      for (let index = 0; index < value.length - 1; index += 1) {
        words.push(value.slice(index, index + 2))
      }
      return words
    })
  return Array.from(new Set([...latinWords, ...chinesePairs]))
}