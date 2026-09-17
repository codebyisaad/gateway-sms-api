export const firstName = (name?: string | null): string =>
  name?.trim().split(/\s+/)[0] || 'there'
