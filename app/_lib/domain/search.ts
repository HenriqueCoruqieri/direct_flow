const COMBINING_MARKS = /[\u0300-\u036f]/g

export const normalizeSearchText = (text: string): string =>
  text.normalize("NFD").replace(COMBINING_MARKS, "").toLowerCase().trim()
