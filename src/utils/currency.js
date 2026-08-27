import countryToCurrency from "country-to-currency";

export function getCurrencyFromCountry(countryCode) {
  const code = String(countryCode || "").toUpperCase();

  return countryToCurrency[code] || "INR";
}

export function getCurrencySymbol(currencyCode) {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .formatToParts(0)
      .find((part) => part.type === "currency")?.value || currencyCode;
  } catch {
    return currencyCode;
  }
}