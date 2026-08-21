import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  City,
  Country,
  State,
} from "country-state-city";

import {
  BOOKING_SERVICES,
} from "./bookingConfig";

import {
  supabase,
} from "./lib/supabase";


/* =========================================================
   CONSTANTS
========================================================= */

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const CURRENT_YEAR =
  new Date().getFullYear();

const MIN_BIRTH_YEAR =
  CURRENT_YEAR - 120;

const CONSULTATION_YEAR_COUNT = 4;


/* =========================================================
   EMPTY BIRTH DETAILS
========================================================= */

function emptyBirthDetails() {
  return {
    date: "",

    day: "",
    month: "",
    year: "",

    time: "",
    timeKnown: true,

    countryCode: "",
    country: "",

    regionCode: "",
    region: "",

    city: "",

    latitude: "",
    longitude: "",
  };
}


/* =========================================================
   HELPERS
========================================================= */

function pad(value) {
  return String(value).padStart(2, "0");
}


function daysInMonth(
  year,
  monthIndex
) {
  return new Date(
    year,
    monthIndex + 1,
    0
  ).getDate();
}


function buildDate(
  day,
  monthIndex,
  year
) {
  if (
    day === "" ||
    monthIndex === "" ||
    year === ""
  ) {
    return "";
  }

  const numericDay =
    Number(day);

  const numericMonth =
    Number(monthIndex);

  const numericYear =
    Number(year);

  if (
    !numericDay ||
    Number.isNaN(numericMonth) ||
    !numericYear
  ) {
    return "";
  }

  const maxDay =
    daysInMonth(
      numericYear,
      numericMonth
    );

  if (
    numericDay > maxDay
  ) {
    return "";
  }

  return `${numericYear}-${pad(
    numericMonth + 1
  )}-${pad(numericDay)}`;
}


function dateToParts(
  value
) {
  if (!value) {
    return {
      day: "",
      month: "",
      year: "",
    };
  }

  const [
    year,
    month,
    day,
  ] = value.split("-");

  return {
    day:
      day
        ? Number(day)
        : "",

    month:
      month
        ? Number(month) - 1
        : "",

    year:
      year
        ? Number(year)
        : "",
  };
}


function timeToParts(
  value
) {
  if (!value) {
    return {
      hour: "",
      minute: "",
      period: "",
    };
  }

  const [
    rawHour,
    rawMinute,
  ] = value.split(":");

  const hour24 =
    Number(rawHour);

  const minute =
    Number(rawMinute);

  if (
    Number.isNaN(hour24) ||
    Number.isNaN(minute)
  ) {
    return {
      hour: "",
      minute: "",
      period: "",
    };
  }

  const period =
    hour24 >= 12
      ? "PM"
      : "AM";

  let hour12 =
    hour24 % 12;

  if (hour12 === 0) {
    hour12 = 12;
  }

  return {
    hour:
      hour12,

    minute:
      minute,

    period:
      period,
  };
}


function partsToTime(
  hour,
  minute,
  period
) {
  if (
    hour === "" ||
    minute === "" ||
    !period
  ) {
    return "";
  }

  let hour24 =
    Number(hour);

  if (period === "AM") {

    if (
      hour24 === 12
    ) {
      hour24 = 0;
    }

  } else {

    if (
      hour24 !== 12
    ) {
      hour24 += 12;
    }
  }

  return `${pad(hour24)}:${pad(
    Number(minute)
  )}`;
}


function formatDate(
  dateString
) {
  if (!dateString) {
    return "";
  }

  const date =
    new Date(
      `${dateString}T00:00:00`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return dateString;
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day:
        "numeric",

      month:
        "long",

      year:
        "numeric",
    }
  ).format(date);
}


function getQuestionLabel(
  serviceId
) {
  const labels = {

    palmistry:
      "What would you like the palm reading to focus on?",

    "birth-chart":
      "What would you like to understand from your birth chart?",

    relationship:
      "What would you like to understand about this relationship?",

    "career-finance":
      "What would you like to understand about your career or finances?",

    marriage:
      "What would you like to understand about marriage or partnership?",

    "career-deep-dive":
      "What would you like us to focus on in your career?",

    "relationship-deep-dive":
      "What would you like us to explore in depth about this relationship?",

    "life-path":
      "Which areas of your life would you most like us to explore?",

    "dasha-timing":
      "What timing, period, or upcoming development would you like us to examine?",

    synastry:
      "What would you like to understand about your compatibility and connection?",
  };

  return (
    labels[serviceId] ||
    "What would you like the consultation to focus on?"
  );
}


function getContactLabel(
  contactMethod
) {
  if (
    contactMethod ===
    "whatsapp"
  ) {
    return "WhatsApp number";
  }

  if (
    contactMethod ===
    "telegram"
  ) {
    return "Telegram username";
  }

  if (
    contactMethod ===
    "instagram"
  ) {
    return "Instagram username";
  }

  return "Email address";
}


function getContactPlaceholder(
  contactMethod
) {
  if (
    contactMethod ===
    "whatsapp"
  ) {
    return "+91...";
  }

  if (
    contactMethod ===
    "telegram"
  ) {
    return "@username";
  }

  if (
    contactMethod ===
    "instagram"
  ) {
    return "@username";
  }

  return "";
}


/* =========================================================
   DATE SELECTOR
   DAY / MONTH / YEAR CAN BE SELECTED IN ANY ORDER
========================================================= */

function DateSelector({
  value,
  onChange,
  label,
  birthDate = false,
  disabled = false,
  isDateAvailable = null,
  resetKey = "",
}) {
  const initialParts =
    dateToParts(value);

  const [
    day,
    setDay,
  ] = useState(
    initialParts.day
  );

  const [
    month,
    setMonth,
  ] = useState(
    initialParts.month
  );

  const [
    year,
    setYear,
  ] = useState(
    initialParts.year
  );


  /*
   * Only reset when the service/component context changes.
   * Do not reset when `value` is temporarily empty, because
   * that would erase a Day selection before Month/Year exist.
   */
  useEffect(() => {

    const parts =
      dateToParts(value);

    if (
      parts.day !== "" ||
      parts.month !== "" ||
      parts.year !== ""
    ) {

      setDay(
        parts.day
      );

      setMonth(
        parts.month
      );

      setYear(
        parts.year
      );
    }

  }, [
    resetKey,
  ]);


  /* -------------------------------------------------------
     YEARS
  ------------------------------------------------------- */

  const years =
    useMemo(() => {

      if (birthDate) {

        return Array.from(
          {
            length:
              CURRENT_YEAR -
              MIN_BIRTH_YEAR +
              1,
          },
          (_, index) =>
            CURRENT_YEAR -
            index
        );
      }


      return Array.from(
        {
          length:
            CONSULTATION_YEAR_COUNT +
            1,
        },
        (_, index) =>
          CURRENT_YEAR +
          index
      );

    }, [
      birthDate,
    ]);


  /* -------------------------------------------------------
     DAYS
  ------------------------------------------------------- */

  const availableDayList =
    useMemo(() => {

      /*
       * For birth dates, allow 1–31 regardless
       * of the order in which values are chosen.
       */
      if (birthDate) {

        return Array.from(
          {
            length:
              31,
          },
          (_, index) =>
            index + 1
        );
      }


      /*
       * Consultation dates need Month + Year
       * before we can determine valid dates.
       */
      if (
        month === "" ||
        year === ""
      ) {
        return [];
      }


      const maxDay =
        daysInMonth(
          Number(year),
          Number(month)
        );


      return Array.from(
        {
          length:
            maxDay,
        },
        (_, index) =>
          index + 1
      ).filter(
        (candidateDay) => {

          if (
            !isDateAvailable
          ) {
            return true;
          }


          const candidateDate =
            buildDate(
              candidateDay,
              Number(month),
              Number(year)
            );


          return isDateAvailable(
            candidateDate
          );
        }
      );

    }, [
      birthDate,
      month,
      year,
      isDateAvailable,
    ]);


  /* -------------------------------------------------------
     UPDATE PARENT DATE
  ------------------------------------------------------- */

  function emitDate(
    nextDay,
    nextMonth,
    nextYear
  ) {

    /*
     * Do not construct the date until all
     * three values have been chosen.
     */
    if (
      nextDay === "" ||
      nextMonth === "" ||
      nextYear === ""
    ) {
      return;
    }


    const candidate =
      buildDate(
        nextDay,
        nextMonth,
        nextYear
      );


    if (!candidate) {
      return;
    }


    /*
     * For consultation dates, make sure
     * the chosen date is actually available.
     */
    if (
      !birthDate &&
      isDateAvailable &&
      !isDateAvailable(
        candidate
      )
    ) {
      return;
    }


    onChange(
      candidate
    );
  }


  /* -------------------------------------------------------
     DAY
  ------------------------------------------------------- */

  function handleDay(
    event
  ) {

    const nextDay =
      event.target.value === ""
        ? ""
        : Number(
            event.target.value
          );


    /*
     * Make sure a user cannot select
     * February 31, etc. once month/year
     * are already known.
     */
    if (
      nextDay !== "" &&
      month !== "" &&
      year !== ""
    ) {

      const maxDay =
        daysInMonth(
          Number(year),
          Number(month)
        );


      if (
        nextDay > maxDay
      ) {
        setDay(
          maxDay
        );

        emitDate(
          maxDay,
          month,
          year
        );

        return;
      }
    }


    setDay(
      nextDay
    );


    emitDate(
      nextDay,
      month,
      year
    );
  }


  /* -------------------------------------------------------
     MONTH
  ------------------------------------------------------- */

  function handleMonth(
    event
  ) {

    const nextMonth =
      event.target.value === ""
        ? ""
        : Number(
            event.target.value
          );


    let nextDay =
      day;


    /*
     * If the currently selected day
     * doesn't exist in the new month,
     * automatically move it to the last
     * valid day.
     */
    if (
      nextMonth !== "" &&
      year !== "" &&
      nextDay !== ""
    ) {

      const maxDay =
        daysInMonth(
          Number(year),
          nextMonth
        );


      if (
        Number(nextDay) >
        maxDay
      ) {
        nextDay =
          maxDay;

        setDay(
          maxDay
        );
      }
    }


    setMonth(
      nextMonth
    );


    emitDate(
      nextDay,
      nextMonth,
      year
    );
  }


  /* -------------------------------------------------------
     YEAR
  ------------------------------------------------------- */

  function handleYear(
    event
  ) {

    const nextYear =
      event.target.value === ""
        ? ""
        : Number(
            event.target.value
          );


    let nextDay =
      day;


    /*
     * Handle leap years and month lengths.
     */
    if (
      nextYear !== "" &&
      month !== "" &&
      nextDay !== ""
    ) {

      const maxDay =
        daysInMonth(
          nextYear,
          Number(month)
        );


      if (
        Number(nextDay) >
        maxDay
      ) {
        nextDay =
          maxDay;

        setDay(
          maxDay
        );
      }
    }


    setYear(
      nextYear
    );


    emitDate(
      nextDay,
      month,
      nextYear
    );
  }


  return (
    <div className="booking-date-selector">

      <div className="booking-date-selector-label">
        {label}
      </div>


      <div className="booking-date-selector-grid">


        {/* DAY */}

        <div className="booking-selector-wrap">

          <span>
            DAY
          </span>

          <select
            value={
              day === ""
                ? ""
                : day
            }
            disabled={
              disabled
            }
            onChange={
              handleDay
            }
          >

            <option value="">
              Day
            </option>

            {availableDayList.map(
              (candidateDay) => (

                <option
                  key={
                    candidateDay
                  }
                  value={
                    candidateDay
                  }
                >
                  {pad(
                    candidateDay
                  )}
                </option>

              )
            )}

          </select>

        </div>


        {/* MONTH */}

        <div className="booking-selector-wrap">

          <span>
            MONTH
          </span>

          <select
            value={
              month === ""
                ? ""
                : month
            }
            disabled={
              disabled
            }
            onChange={
              handleMonth
            }
          >

            <option value="">
              Month
            </option>

            {MONTHS.map(
              (
                monthName,
                index
              ) => (

                <option
                  key={
                    monthName
                  }
                  value={
                    index
                  }
                >
                  {
                    monthName
                  }
                </option>

              )
            )}

          </select>

        </div>


        {/* YEAR */}

        <div className="booking-selector-wrap">

          <span>
            YEAR
          </span>

          <select
            value={
              year === ""
                ? ""
                : year
            }
            disabled={
              disabled
            }
            onChange={
              handleYear
            }
          >

            <option value="">
              Year
            </option>

            {years.map(
              (candidateYear) => (

                <option
                  key={
                    candidateYear
                  }
                  value={
                    candidateYear
                  }
                >
                  {
                    candidateYear
                  }
                </option>

              )
            )}

          </select>

        </div>

      </div>


      {value && (
        <div className="booking-selector-preview">
          {formatDate(value)}
        </div>
      )}

    </div>
  );
}


/* =========================================================
   TIME SELECTOR
========================================================= */

function TimeSelector({
  value,
  onChange,
  disabled = false,
}) {
  const parts =
    timeToParts(
      value
    );


  const hours =
    Array.from(
      {
        length:
          12,
      },
      (_, index) =>
        index + 1
    );


  const minutes =
    Array.from(
      {
        length:
          12,
      },
      (_, index) =>
        index * 5
    );


  function updateTime(
    hour,
    minute,
    period
  ) {

    const result =
      partsToTime(
        hour,
        minute,
        period
      );


    onChange(
      result
    );
  }


  return (
    <div className="booking-time-selector">

      <div className="booking-time-grid">


        {/* HOUR */}

        <div className="booking-selector-wrap">

          <span>
            HOUR
          </span>

          <select
            value={
              parts.hour === ""
                ? ""
                : parts.hour
            }
            disabled={
              disabled
            }
            onChange={(event) =>
              updateTime(
                event.target.value,
                parts.minute,
                parts.period
              )
            }
          >

            <option value="">
              Hour
            </option>

            {hours.map(
              (hour) => (

                <option
                  key={
                    hour
                  }
                  value={
                    hour
                  }
                >
                  {
                    pad(
                      hour
                    )
                  }
                </option>

              )
            )}

          </select>

        </div>


        {/* MINUTES */}

        <div className="booking-selector-wrap">

          <span>
            MINUTES
          </span>

          <select
            value={
              parts.minute === ""
                ? ""
                : parts.minute
            }
            disabled={
              disabled
            }
            onChange={(event) =>
              updateTime(
                parts.hour,
                event.target.value,
                parts.period
              )
            }
          >

            <option value="">
              Minutes
            </option>

            {minutes.map(
              (minute) => (

                <option
                  key={
                    minute
                  }
                  value={
                    minute
                  }
                >
                  {
                    pad(
                      minute
                    )
                  }
                </option>

              )
            )}

          </select>

        </div>


        {/* AM / PM */}

        <div className="booking-selector-wrap">

          <span>
            PERIOD
          </span>

          <select
            value={
              parts.period ||
              ""
            }
            disabled={
              disabled
            }
            onChange={(event) =>
              updateTime(
                parts.hour,
                parts.minute,
                event.target.value
              )
            }
          >

            <option value="">
              AM / PM
            </option>

            <option value="AM">
              AM
            </option>

            <option value="PM">
              PM
            </option>

          </select>

        </div>

      </div>


      {value &&
        !disabled && (
          <div className="booking-selector-preview">

            Birth time:{" "}

            {(() => {

              const [
                hour,
                minute,
              ] =
                value.split(":");


              return new Date(
                2000,
                0,
                1,
                Number(hour),
                Number(minute)
              ).toLocaleTimeString(
                "en-US",
                {
                  hour:
                    "numeric",

                  minute:
                    "2-digit",
                }
              );

            })()}

          </div>
        )}

    </div>
  );
}


/* =========================================================
   BIRTH DETAILS
========================================================= */

function BirthDetails({
  title,
  birth,
  setBirth,
  resetKey,
}) {
  const countries =
    useMemo(
      () =>
        Country.getAllCountries(),
      []
    );


  const regions =
    useMemo(() => {

      if (
        !birth.countryCode
      ) {
        return [];
      }

      return State.getStatesOfCountry(
        birth.countryCode
      );

    }, [
      birth.countryCode,
    ]);


  const cities =
    useMemo(() => {

      if (
        !birth.countryCode ||
        !birth.regionCode
      ) {
        return [];
      }

      return City.getCitiesOfState(
        birth.countryCode,
        birth.regionCode
      );

    }, [
      birth.countryCode,
      birth.regionCode,
    ]);


  function changeCountry(
    code
  ) {

    const country =
      Country.getCountryByCode(
        code
      );


    setBirth(
      (current) => ({
        ...current,

        countryCode:
          code,

        country:
          country?.name || "",

        regionCode:
          "",

        region:
          "",

        city:
          "",

        latitude:
          "",

        longitude:
          "",
      })
    );
  }


  function changeRegion(
    code
  ) {

    const region =
      State.getStateByCodeAndCountry(
        code,
        birth.countryCode
      );


    setBirth(
      (current) => ({
        ...current,

        regionCode:
          code,

        region:
          region?.name || "",

        city:
          "",

        latitude:
          "",

        longitude:
          "",
      })
    );
  }


  function changeCity(
    cityName
  ) {

    const selectedCity =
      cities.find(
        (city) =>
          city.name ===
          cityName
      );


    setBirth(
      (current) => ({
        ...current,

        city:
          cityName,

        latitude:
          selectedCity?.latitude ||
          "",

        longitude:
          selectedCity?.longitude ||
          "",
      })
    );
  }


  return (
    <div className="booking-birth-section">

      <div className="booking-subheading">
        {title}
      </div>


      {/* DATE */}

      <DateSelector
        key={
          `${resetKey}-date`
        }
        value={
          birth.date
        }
        onChange={(value) =>
          setBirth(
            (current) => ({
              ...current,

              date:
                value,

              /*
               * Keep these fields synchronized
               * whenever a complete date exists.
               */
              ...(value
                ? dateToParts(
                    value
                  )
                : {}),
            })
          )
        }
        label="Date of birth"
        birthDate
        resetKey={
          resetKey
        }
      />


      {/* TIME */}

      <div className="booking-time-area">

        <div className="booking-date-selector-label">
          Birth time
        </div>


        <TimeSelector
          value={
            birth.time
          }
          onChange={(value) =>
            setBirth(
              (current) => ({
                ...current,

                time:
                  value,
              })
            )
          }
          disabled={
            !birth.timeKnown
          }
        />

      </div>


      {/* UNKNOWN TIME */}

      <label className="booking-check-row">

        <input
          type="checkbox"
          checked={
            !birth.timeKnown
          }
          onChange={(event) =>
            setBirth(
              (current) => ({
                ...current,

                timeKnown:
                  !event.target
                    .checked,

                time:
                  event.target
                    .checked
                    ? ""
                    : current.time,
              })
            )
          }
        />

        <span>
          I don't know my exact birth time
        </span>

      </label>


      {/* LOCATION */}

      <div className="booking-location-heading">
        Birth location
      </div>


      <div className="booking-grid-3">


        {/* COUNTRY */}

        <label className="booking-field">

          <span>
            Country
          </span>

          <select
            value={
              birth.countryCode
            }
            onChange={(event) =>
              changeCountry(
                event.target
                  .value
              )
            }
          >

            <option value="">
              Select country
            </option>

            {countries.map(
              (country) => (

                <option
                  key={
                    country.isoCode
                  }
                  value={
                    country.isoCode
                  }
                >
                  {
                    country.name
                  }
                </option>

              )
            )}

          </select>

        </label>


        {/* REGION */}

        <label className="booking-field">

          <span>
            Region / State / Province
          </span>

          <select
            value={
              birth.regionCode
            }
            disabled={
              !birth.countryCode
            }
            onChange={(event) =>
              changeRegion(
                event.target
                  .value
              )
            }
          >

            <option value="">
              Select region
            </option>

            {regions.map(
              (region) => (

                <option
                  key={
                    region.isoCode
                  }
                  value={
                    region.isoCode
                  }
                >
                  {
                    region.name
                  }
                </option>

              )
            )}

          </select>

        </label>


        {/* CITY */}

        <label className="booking-field">

          <span>
            City / Town
          </span>

          <select
            value={
              birth.city
            }
            disabled={
              !birth.regionCode
            }
            onChange={(event) =>
              changeCity(
                event.target
                  .value
              )
            }
          >

            <option value="">
              Select city / town
            </option>

            {cities.map(
              (city) => (

                <option
                  key={`${city.name}-${city.latitude}-${city.longitude}`}
                  value={
                    city.name
                  }
                >
                  {
                    city.name
                  }
                </option>

              )
            )}

          </select>

        </label>

      </div>


      {birth.city && (

        <div className="booking-location-confirmed">

          {birth.city}

          {birth.region
            ? `, ${birth.region}`
            : ""}

          {birth.country
            ? `, ${birth.country}`
            : ""}

        </div>

      )}

    </div>
  );
}


/* =========================================================
   BOOKING PAGE
========================================================= */

export default function Booking() {
  const navigate =
    useNavigate();


  /* =======================================================
     USER
  ======================================================= */

  const [
    currentUser,
    setCurrentUser,
  ] = useState(null);


  const [
    userLoading,
    setUserLoading,
  ] = useState(true);


  /* =======================================================
     SERVICE
  ======================================================= */

  const [
    serviceId,
    setServiceId,
  ] = useState("");


  const service =
    BOOKING_SERVICES[
      serviceId
    ];


  /* =======================================================
     CLIENT BIRTH
  ======================================================= */

  const [
    clientBirth,
    setClientBirth,
  ] = useState(
    emptyBirthDetails()
  );


  /* =======================================================
     PARTNER
  ======================================================= */

  const [
    hasPartner,
    setHasPartner,
  ] = useState("");


  const [
    partnerName,
    setPartnerName,
  ] = useState("");


  const [
    relationshipStatus,
    setRelationshipStatus,
  ] = useState("");


  const [
    partnerBirth,
    setPartnerBirth,
  ] = useState(
    emptyBirthDetails()
  );


  /* =======================================================
     BOOKING
  ======================================================= */

  const [
    preferredDate,
    setPreferredDate,
  ] = useState("");


  const [
    contactMethod,
    setContactMethod,
  ] = useState("");


  const [
    contactDetails,
    setContactDetails,
  ] = useState("");


  const [
    message,
    setMessage,
  ] = useState("");


  /* =======================================================
     AVAILABILITY
  ======================================================= */

  const [
    availability,
    setAvailability,
  ] = useState([]);


  const [
    blockedDates,
    setBlockedDates,
  ] = useState([]);


  const [
    availabilityLoading,
    setAvailabilityLoading,
  ] = useState(true);


  /* =======================================================
     STATUS
  ======================================================= */

  const [
    loading,
    setLoading,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  const [
    success,
    setSuccess,
  ] = useState("");


  /* =======================================================
     USER
  ======================================================= */

  useEffect(() => {

    let mounted = true;


    async function loadUser() {

      try {

        const {
          data,
          error:
            userError,
        } =
          await supabase.auth
            .getUser();


        if (userError) {
          throw userError;
        }


        if (!mounted) {
          return;
        }


        setCurrentUser(
          data?.user ||
          null
        );

      } catch (
        userError
      ) {

        console.error(
          "Booking user error:",
          userError
        );

      } finally {

        if (mounted) {
          setUserLoading(
            false
          );
        }
      }
    }


    loadUser();


    return () => {
      mounted = false;
    };

  }, []);


  /* =======================================================
     AVAILABILITY
  ======================================================= */

  useEffect(() => {

    let mounted = true;


    async function loadAvailability() {

      setAvailabilityLoading(
        true
      );


      try {

        const {
          data:
            scheduleData,
          error:
            scheduleError,
        } =
          await supabase
            .from(
              "availability_schedule"
            )
            .select(
              "day_of_week, is_available"
            );


        if (scheduleError) {
          throw scheduleError;
        }


        const {
          data:
            blockedData,
          error:
            blockedError,
        } =
          await supabase
            .from(
              "blocked_dates"
            )
            .select(
              "blocked_date"
            );


        if (blockedError) {
          throw blockedError;
        }


        if (!mounted) {
          return;
        }


        setAvailability(
          scheduleData ||
          []
        );


        setBlockedDates(
          (
            blockedData ||
            []
          ).map(
            (item) =>
              item.blocked_date
          )
        );

      } catch (
        availabilityError
      ) {

        console.error(
          "Availability error:",
          availabilityError
        );

      } finally {

        if (mounted) {
          setAvailabilityLoading(
            false
          );
        }
      }
    }


    loadAvailability();


    return () => {
      mounted = false;
    };

  }, []);


  /* =======================================================
     RESET SERVICE
  ======================================================= */

  useEffect(() => {

    setClientBirth(
      emptyBirthDetails()
    );

    setPartnerBirth(
      emptyBirthDetails()
    );

    setHasPartner("");
    setPartnerName("");
    setRelationshipStatus("");

    setPreferredDate("");
    setContactMethod("");
    setContactDetails("");
    setMessage("");

    setError("");
    setSuccess("");

  }, [
    serviceId,
  ]);


  /* =======================================================
     AVAILABILITY DAYS
  ======================================================= */

  const availableDays =
    useMemo(
      () =>
        new Set(
          availability
            .filter(
              (item) =>
                item.is_available
            )
            .map(
              (item) =>
                Number(
                  item.day_of_week
                )
            )
        ),
      [
        availability,
      ]
    );


  const isAvailableDate =
    useMemo(
      () =>
        (dateString) => {

          if (
            !dateString
          ) {
            return false;
          }


          if (
            blockedDates.includes(
              dateString
            )
          ) {
            return false;
          }


          const date =
            new Date(
              `${dateString}T00:00:00`
            );


          if (
            Number.isNaN(
              date.getTime()
            )
          ) {
            return false;
          }


          return availableDays.has(
            date.getDay()
          );

        },
      [
        availableDays,
        blockedDates,
      ]
    );


  /* =======================================================
     CONTACT VALIDATION
  ======================================================= */

  function validateContact() {

    if (!contactMethod) {

      return (
        "Please select how you would like us to be contacted."
      );
    }


    if (
      contactMethod ===
      "email"
    ) {
      return "";
    }


    if (
      !contactDetails.trim()
    ) {

      return `Please enter your ${
        getContactLabel(
          contactMethod
        ).toLowerCase()
      }.`;

    }


    return "";
  }


  /* =======================================================
     BIRTH VALIDATION
  ======================================================= */

  function validateBirth(
    birth,
    label
  ) {

    if (
      !birth.date
    ) {

      return `${label}: please select the complete date of birth.`;

    }


    if (
      birth.timeKnown &&
      !birth.time
    ) {

      return `${label}: please select the complete birth time.`;

    }


    if (
      !birth.countryCode
    ) {

      return `${label}: please select the country.`;
    }


    if (
      !birth.regionCode
    ) {

      return `${label}: please select the region.`;
    }


    if (
      !birth.city
    ) {

      return `${label}: please select the city or town.`;
    }


    return "";
  }


  /* =======================================================
     SUBMIT
  ======================================================= */

  async function handleSubmit(
    event
  ) {

    event.preventDefault();

    setError("");
    setSuccess("");


    if (!service) {

      setError(
        "Please select a consultation."
      );

      return;
    }


    if (!currentUser) {

      navigate(
        "/login"
      );

      return;
    }


    if (!preferredDate) {

      setError(
        "Please select your preferred consultation date."
      );

      return;
    }


    if (
      !isAvailableDate(
        preferredDate
      )
    ) {

      setError(
        "That date is not available. Please select another date."
      );

      return;
    }


    const contactError =
      validateContact();


    if (contactError) {

      setError(
        contactError
      );

      return;
    }


    if (
      service.needsBirthDetails
    ) {

      const birthError =
        validateBirth(
          clientBirth,
          "Your birth details"
        );


      if (birthError) {

        setError(
          birthError
        );

        return;
      }
    }


    if (
      service.needsPartner
    ) {

      if (!hasPartner) {

        setError(
          "Please tell us whether you currently have a partner."
        );

        return;
      }


      if (
        hasPartner ===
        "yes"
      ) {

        if (
          !partnerName.trim()
        ) {

          setError(
            "Please enter your partner's name."
          );

          return;
        }


        if (
          !relationshipStatus
        ) {

          setError(
            "Please select your relationship status."
          );

          return;
        }


        const partnerError =
          validateBirth(
            partnerBirth,
            "Partner birth details"
          );


        if (partnerError) {

          setError(
            partnerError
          );

          return;
        }
      }
    }


    setLoading(true);


    try {

      const finalContact =
        contactMethod ===
        "email"
          ? currentUser.email
          : contactDetails.trim();


      const consultationData = {

        user_id:
          currentUser.id,

        service_name:
          service.name,

        consultation_type:
          service.id,

        status:
          "pending",

        preferred_date:
          preferredDate,

        contact_method:
          contactMethod,

        contact_details:
          finalContact,

        consultation_message:
          message.trim() ||
          null,


        /* CLIENT */

        client_birth_date:
          service.needsBirthDetails
            ? clientBirth.date
            : null,

        client_birth_time:
          service.needsBirthDetails &&
          clientBirth.timeKnown
            ? clientBirth.time
            : null,

        client_birth_time_known:
          service.needsBirthDetails
            ? clientBirth.timeKnown
            : null,

        client_birth_country:
          service.needsBirthDetails
            ? clientBirth.country
            : null,

        client_birth_region:
          service.needsBirthDetails
            ? clientBirth.region
            : null,

        client_birth_city:
          service.needsBirthDetails
            ? clientBirth.city
            : null,

        client_birth_latitude:
          service.needsBirthDetails
            ? clientBirth.latitude
            : null,

        client_birth_longitude:
          service.needsBirthDetails
            ? clientBirth.longitude
            : null,


        /* RELATIONSHIP */

        relationship_status:
          service.needsPartner &&
          hasPartner === "yes"
            ? relationshipStatus
            : null,


        /* PARTNER */

        partner_name:
          service.needsPartner &&
          hasPartner === "yes"
            ? partnerName.trim()
            : null,

        partner_birth_date:
          service.needsPartner &&
          hasPartner === "yes"
            ? partnerBirth.date
            : null,

        partner_birth_time:
          service.needsPartner &&
          hasPartner === "yes" &&
          partnerBirth.timeKnown
            ? partnerBirth.time
            : null,

        partner_birth_time_known:
          service.needsPartner &&
          hasPartner === "yes"
            ? partnerBirth.timeKnown
            : null,

        partner_birth_country:
          service.needsPartner &&
          hasPartner === "yes"
            ? partnerBirth.country
            : null,

        partner_birth_region:
          service.needsPartner &&
          hasPartner === "yes"
            ? partnerBirth.region
            : null,

        partner_birth_city:
          service.needsPartner &&
          hasPartner === "yes"
            ? partnerBirth.city
            : null,

        partner_birth_latitude:
          service.needsPartner &&
          hasPartner === "yes"
            ? partnerBirth.latitude
            : null,

        partner_birth_longitude:
          service.needsPartner &&
          hasPartner === "yes"
            ? partnerBirth.longitude
            : null,
      };


      const {
        error:
          insertError,
      } =
        await supabase
          .from(
            "consultations"
          )
          .insert(
            consultationData
          );


      if (insertError) {
        throw insertError;
      }


      setSuccess(
        "Your consultation request has been submitted successfully."
      );


      setPreferredDate("");
      setContactMethod("");
      setContactDetails("");
      setMessage("");


    } catch (
      submitError
    ) {

      console.error(
        "Booking submission error:",
        submitError
      );


      setError(
        submitError?.message ||
        "Unable to submit your consultation request."
      );


    } finally {

      setLoading(
        false
      );
    }
  }


  /* =======================================================
     LOADING
  ======================================================= */

  if (
    userLoading
  ) {

    return (
      <main className="booking-page">

        <div className="booking-card">

          <div className="booking-header">

            <div className="booking-symbol">
              ✦
            </div>

            <div className="booking-kicker">
              ASTERISM ASTRO
            </div>

            <h1>
              Loading
            </h1>

            <p>
              Preparing your consultation form...
            </p>

          </div>

        </div>

      </main>
    );
  }


  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <main className="booking-page">

      <div className="booking-card">


        {/* HEADER */}

        <div className="booking-header">

          <div className="booking-symbol">
            ✦
          </div>

          <div className="booking-kicker">
            ASTERISM ASTRO
          </div>

          <h1>
            Book a Consultation
          </h1>

          <p>
            Choose your consultation and
            provide the information needed
            to prepare for your reading.
          </p>

        </div>


        <form
          className="booking-form"
          onSubmit={
            handleSubmit
          }
        >


          {/* CONSULTATION */}

          <label className="booking-field">

            <span>
              Consultation
            </span>

            <select
              value={
                serviceId
              }
              onChange={(event) =>
                setServiceId(
                  event.target.value
                )
              }
              disabled={
                loading
              }
              required
            >

              <option value="">
                Select a consultation
              </option>

              {Object.values(
                BOOKING_SERVICES
              ).map(
                (item) => (

                  <option
                    key={
                      item.id
                    }
                    value={
                      item.id
                    }
                  >
                    {
                      item.name
                    }
                  </option>

                )
              )}

            </select>

          </label>


          {service && (
            <>


              {/* PALM READING */}

              {service.id ===
                "palmistry" && (

                <div className="booking-instruction-card">

                  <strong>
                    Palm photographs
                  </strong>

                  <p>
                    After you submit your
                    request, you will receive
                    an email explaining how to
                    send clear photographs of
                    your palms.
                  </p>

                </div>

              )}


              {/* CLIENT BIRTH DETAILS */}

              {service.needsBirthDetails && (

                <BirthDetails
                  title="Your birth details"
                  birth={
                    clientBirth
                  }
                  setBirth={
                    setClientBirth
                  }
                  resetKey={
                    serviceId
                  }
                />

              )}


              {/* PARTNER */}

              {service.needsPartner && (

                <div className="booking-relationship-section">

                  <div className="booking-subheading">
                    Relationship details
                  </div>


                  <label className="booking-field">

                    <span>
                      {service.id ===
                        "marriage"
                        ? "Are you currently married or in a committed relationship?"
                        : "Do you currently have a partner?"}
                    </span>


                    <select
                      value={
                        hasPartner
                      }
                      onChange={(event) =>
                        setHasPartner(
                          event.target.value
                        )
                      }
                      disabled={
                        loading
                      }
                    >

                      <option value="">
                        Select an option
                      </option>

                      <option value="yes">
                        Yes
                      </option>

                      <option value="no">
                        No
                      </option>

                    </select>

                  </label>


                  {hasPartner ===
                    "yes" && (

                    <>

                      <label className="booking-field">

                        <span>
                          Partner's full name
                        </span>

                        <input
                          type="text"
                          value={
                            partnerName
                          }
                          onChange={(event) =>
                            setPartnerName(
                              event.target.value
                            )
                          }
                          placeholder="Partner's name"
                          disabled={
                            loading
                          }
                        />

                      </label>


                      <label className="booking-field">

                        <span>
                          Relationship status
                        </span>

                        <select
                          value={
                            relationshipStatus
                          }
                          onChange={(event) =>
                            setRelationshipStatus(
                              event.target.value
                            )
                          }
                          disabled={
                            loading
                          }
                        >

                          <option value="">
                            Select relationship status
                          </option>

                          <option value="dating">
                            Dating
                          </option>

                          <option value="engaged">
                            Engaged
                          </option>

                          <option value="married">
                            Married
                          </option>

                          <option value="long-distance">
                            Long-distance
                          </option>

                          <option value="complicated">
                            Complicated
                          </option>

                          <option value="other">
                            Other
                          </option>

                        </select>

                      </label>


                      <BirthDetails
                        title="Partner's birth details"
                        birth={
                          partnerBirth
                        }
                        setBirth={
                          setPartnerBirth
                        }
                        resetKey={
                          `${serviceId}-partner`
                        }
                      />

                    </>
                  )}

                </div>

              )}


              {/* CONSULTATION DATE */}

              <div className="booking-date-section">

                <div className="booking-subheading">
                  Preferred consultation date
                </div>

                <p className="booking-small-text">
                  Choose a date from the
                  consultation days currently
                  available. We will contact you
                  to arrange the actual time.
                </p>


                {availabilityLoading ? (

                  <div className="booking-loading">
                    Checking availability...
                  </div>

                ) : availability.length ===
                  0 ? (

                  <div className="booking-unavailable">
                    Consultation dates are
                    currently unavailable.
                  </div>

                ) : (

                  <DateSelector
                    value={
                      preferredDate
                    }
                    onChange={
                      setPreferredDate
                    }
                    label="Preferred date"
                    isDateAvailable={
                      isAvailableDate
                    }
                    resetKey={
                      serviceId
                    }
                  />

                )}

              </div>


              {/* CONTACT */}

              <div className="booking-contact-section">

                <div className="booking-subheading">
                  How should we contact you?
                </div>


                <div className="booking-contact-options">

                  <label>

                    <input
                      type="radio"
                      name="contact_method"
                      value="whatsapp"
                      checked={
                        contactMethod ===
                        "whatsapp"
                      }
                      onChange={() => {

                        setContactMethod(
                          "whatsapp"
                        );

                        setContactDetails(
                          ""
                        );
                      }}
                    />

                    <span>
                      WhatsApp
                    </span>

                  </label>


                  <label>

                    <input
                      type="radio"
                      name="contact_method"
                      value="telegram"
                      checked={
                        contactMethod ===
                        "telegram"
                      }
                      onChange={() => {

                        setContactMethod(
                          "telegram"
                        );

                        setContactDetails(
                          ""
                        );
                      }}
                    />

                    <span>
                      Telegram
                    </span>

                  </label>


                  <label>

                    <input
                      type="radio"
                      name="contact_method"
                      value="instagram"
                      checked={
                        contactMethod ===
                        "instagram"
                      }
                      onChange={() => {

                        setContactMethod(
                          "instagram"
                        );

                        setContactDetails(
                          ""
                        );
                      }}
                    />

                    <span>
                      Instagram
                    </span>

                  </label>


                  <label>

                    <input
                      type="radio"
                      name="contact_method"
                      value="email"
                      checked={
                        contactMethod ===
                        "email"
                      }
                      onChange={() => {

                        setContactMethod(
                          "email"
                        );

                        setContactDetails(
                          ""
                        );
                      }}
                    />

                    <span>
                      Email
                    </span>

                  </label>

                </div>


                {contactMethod ===
                  "email" ? (

                  <div className="booking-email-confirmed">

                    <span>
                      Email address
                    </span>

                    <strong>
                      {
                        currentUser?.email ||
                        "Your account email"
                      }
                    </strong>

                    <small>
                      We'll use the email
                      associated with your
                      Asterism Astro account.
                    </small>

                  </div>

                ) : contactMethod ? (

                  <label className="booking-field">

                    <span>
                      {
                        getContactLabel(
                          contactMethod
                        )
                      }
                    </span>

                    <input
                      type={
                        contactMethod ===
                        "whatsapp"
                          ? "tel"
                          : "text"
                      }
                      value={
                        contactDetails
                      }
                      onChange={(event) =>
                        setContactDetails(
                          event.target.value
                        )
                      }
                      placeholder={
                        getContactPlaceholder(
                          contactMethod
                        )
                      }
                      disabled={
                        loading
                      }
                    />

                  </label>

                ) : null}

              </div>


              {/* QUESTION */}

              <label className="booking-field">

                <span>
                  {
                    getQuestionLabel(
                      service.id
                    )
                  }
                </span>

                <textarea
                  value={
                    message
                  }
                  onChange={(event) =>
                    setMessage(
                      event.target.value
                    )
                  }
                  rows={6}
                  placeholder="Please provide any context that may help us understand what you are looking for."
                  disabled={
                    loading
                  }
                />

              </label>


              {/* SUBMISSION NOTE */}

              <div className="booking-submit-note">

                <span>
                  ✦
                </span>

                <p>
                  Your request is reviewed
                  personally. We will contact
                  you using the method you
                  selected above.
                </p>

              </div>


              {/* ERROR */}

              {error && (

                <div
                  className="auth-message auth-error"
                  role="alert"
                >
                  {
                    error
                  }
                </div>

              )}


              {/* SUCCESS */}

              {success && (

                <div
                  className="auth-message auth-success"
                  role="status"
                >

                  {success}

                  <button
                    type="button"
                    className="booking-success-link"
                    onClick={() =>
                      navigate(
                        "/account"
                      )
                    }
                  >
                    View My Consultations →
                  </button>

                </div>

              )}


              {/* SUBMIT */}

              <button
                type="submit"
                className="btn btn-gold booking-submit"
                disabled={
                  loading ||
                  availabilityLoading
                }
              >

                {loading
                  ? "Submitting..."
                  : "Submit Consultation Request"}

              </button>


              <button
                type="button"
                className="booking-back"
                onClick={() =>
                  navigate("/")
                }
                disabled={
                  loading
                }
              >
                ← Back to Home
              </button>

            </>
          )}

        </form>

      </div>

    </main>
  );
}