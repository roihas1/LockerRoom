export function wazeUrl(address: string): string {
  return `https://waze.com/ul?${new URLSearchParams({ q: address, navigate: "yes" }).toString()}`;
}
