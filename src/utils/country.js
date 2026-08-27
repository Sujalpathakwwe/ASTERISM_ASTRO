/* =========================================================
   COUNTRY DETECTION
   IP → COUNTRY → CURRENCY
========================================================= */

const COUNTRY_DATA = {
  IN: {
    code: "IN",
    name: "India",
    currency: "INR",
    symbol: "₹",
  },

  US: {
    code: "US",
    name: "United States",
    currency: "USD",
    symbol: "$",
  },

  GB: {
    code: "GB",
    name: "United Kingdom",
    currency: "GBP",
    symbol: "£",
  },

  CA: {
    code: "CA",
    name: "Canada",
    currency: "CAD",
    symbol: "C$",
  },

  AU: {
    code: "AU",
    name: "Australia",
    currency: "AUD",
    symbol: "A$",
  },

  NZ: {
    code: "NZ",
    name: "New Zealand",
    currency: "NZD",
    symbol: "NZ$",
  },

  AE: {
    code: "AE",
    name: "United Arab Emirates",
    currency: "AED",
    symbol: "د.إ",
  },

  SA: {
    code: "SA",
    name: "Saudi Arabia",
    currency: "SAR",
    symbol: "﷼",
  },

  SG: {
    code: "SG",
    name: "Singapore",
    currency: "SGD",
    symbol: "S$",
  },

  MY: {
    code: "MY",
    name: "Malaysia",
    currency: "MYR",
    symbol: "RM",
  },

  DE: {
    code: "DE",
    name: "Germany",
    currency: "EUR",
    symbol: "€",
  },

  FR: {
    code: "FR",
    name: "France",
    currency: "EUR",
    symbol: "€",
  },

  IT: {
    code: "IT",
    name: "Italy",
    currency: "EUR",
    symbol: "€",
  },

  ES: {
    code: "ES",
    name: "Spain",
    currency: "EUR",
    symbol: "€",
  },

  NL: {
    code: "NL",
    name: "Netherlands",
    currency: "EUR",
    symbol: "€",
  },

  BE: {
    code: "BE",
    name: "Belgium",
    currency: "EUR",
    symbol: "€",
  },

  AT: {
    code: "AT",
    name: "Austria",
    currency: "EUR",
    symbol: "€",
  },

  IE: {
    code: "IE",
    name: "Ireland",
    currency: "EUR",
    symbol: "€",
  },

  PT: {
    code: "PT",
    name: "Portugal",
    currency: "EUR",
    symbol: "€",
  },

  FI: {
    code: "FI",
    name: "Finland",
    currency: "EUR",
    symbol: "€",
  },

  GR: {
    code: "GR",
    name: "Greece",
    currency: "EUR",
    symbol: "€",
  },

  JP: {
    code: "JP",
    name: "Japan",
    currency: "JPY",
    symbol: "¥",
  },

  CN: {
    code: "CN",
    name: "China",
    currency: "CNY",
    symbol: "¥",
  },

  HK: {
    code: "HK",
    name: "Hong Kong",
    currency: "HKD",
    symbol: "HK$",
  },

  KR: {
    code: "KR",
    name: "South Korea",
    currency: "KRW",
    symbol: "₩",
  },

  TH: {
    code: "TH",
    name: "Thailand",
    currency: "THB",
    symbol: "฿",
  },

  ID: {
    code: "ID",
    name: "Indonesia",
    currency: "IDR",
    symbol: "Rp",
  },

  PH: {
    code: "PH",
    name: "Philippines",
    currency: "PHP",
    symbol: "₱",
  },

  VN: {
    code: "VN",
    name: "Vietnam",
    currency: "VND",
    symbol: "₫",
  },

  BR: {
    code: "BR",
    name: "Brazil",
    currency: "BRL",
    symbol: "R$",
  },

  MX: {
    code: "MX",
    name: "Mexico",
    currency: "MXN",
    symbol: "$",
  },

  ZA: {
    code: "ZA",
    name: "South Africa",
    currency: "ZAR",
    symbol: "R",
  },

  CH: {
    code: "CH",
    name: "Switzerland",
    currency: "CHF",
    symbol: "CHF",
  },

  NO: {
    code: "NO",
    name: "Norway",
    currency: "NOK",
    symbol: "kr",
  },

  SE: {
    code: "SE",
    name: "Sweden",
    currency: "SEK",
    symbol: "kr",
  },

  DK: {
    code: "DK",
    name: "Denmark",
    currency: "DKK",
    symbol: "kr",
  },

  PL: {
    code: "PL",
    name: "Poland",
    currency: "PLN",
    symbol: "zł",
  },

  TR: {
    code: "TR",
    name: "Turkey",
    currency: "TRY",
    symbol: "₺",
  },

  RU: {
    code: "RU",
    name: "Russia",
    currency: "RUB",
    symbol: "₽",
  },
};


/* =========================================================
   FLAG
========================================================= */

export function getCountryFlag(code) {
  if (!code || code.length !== 2) {
    return "🌐";
  }

  return code
    .toUpperCase()
    .split("")
    .map(
      (char) =>
        String.fromCodePoint(
          127397 + char.charCodeAt(0)
        )
    )
    .join("");
}


/* =========================================================
   GET COUNTRY DATA
========================================================= */

export function getCountryData(code) {
  if (!code) {
    return COUNTRY_DATA.IN;
  }

  const normalized =
    code.toUpperCase();

  if (COUNTRY_DATA[normalized]) {
    return COUNTRY_DATA[normalized];
  }

  return {
    code: normalized,
    name: normalized,
    currency: "",
    symbol: "",
  };
}


/* =========================================================
   DETECT COUNTRY BY IP
========================================================= */

export async function detectCountry() {
  try {
    const response =
      await fetch(
        "https://ipwho.is/"
      );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const data =
      await response.json();

    if (!data.success) {
      throw new Error(
        "Country detection failed"
      );
    }

    const code =
      data.country_code?.toUpperCase();

    const knownCountry =
      getCountryData(code);

    return {
      ...knownCountry,

      code:
        code ||
        knownCountry.code,

      name:
        data.country ||
        knownCountry.name,

      flag:
        getCountryFlag(code),

      currency:
        data.currency?.code ||
        knownCountry.currency,

      symbol:
        data.currency?.symbol ||
        knownCountry.symbol,
    };

  } catch (error) {

    console.error(
      "Country detection error:",
      error
    );

    /* =========================================
       FALLBACK
    ========================================= */

    return {
      code: "IN",
      name: "India",
      flag: "🇮🇳",
      currency: "INR",
      symbol: "₹",
    };
  }
}


/* =========================================================
   EXPORT COUNTRY DATABASE
========================================================= */

export {
  COUNTRY_DATA,
};