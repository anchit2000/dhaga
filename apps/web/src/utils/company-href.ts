export function companyFilteredHref(name: string): string {
  return `/app/companies?name=${encodeURIComponent(name)}`;
}
