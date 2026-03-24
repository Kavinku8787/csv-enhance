export function tax(price: number, qty: number): number {
  return Number((price * qty * 1.08).toFixed(2));
}

export function bucket(qty: number): string {
  if (qty >= 8) {
    return "high";
  }
  if (qty >= 5) {
    return "medium";
  }
  return "low";
}
