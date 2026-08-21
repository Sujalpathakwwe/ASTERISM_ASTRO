import React, {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  supabase,
} from "./lib/supabase";


const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];


function getDefaultSchedule() {
  return DAYS.map((day) => ({
    day_of_week: day.value,
    label: day.label,
    is_available: false,
    start_time: "10:00",
    end_time: "18:00",
  }));
}


export default function AdminAvailability({
  session,
}) {
  const navigate = useNavigate();

  const [schedule, setSchedule] = useState(
    getDefaultSchedule()
  );

  const [blockedDates, setBlockedDates] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [newBlockedDate, setNewBlockedDate] =
    useState("");

  const [newBlockedReason, setNewBlockedReason] =
    useState("");

  const [addingBlockedDate, setAddingBlockedDate] =
    useState(false);


  /* =====================================================
     LOAD AVAILABILITY
  ===================================================== */

  useEffect(() => {
    let mounted = true;

    async function loadAvailability() {
      setLoading(true);
      setError("");

      try {
        if (!session?.user?.id) {
          throw new Error(
            "No authenticated user found."
          );
        }

        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", session.user.id)
          .single();

        if (profileError) {
          throw profileError;
        }

        if (!profile?.is_admin) {
          navigate("/account", {
            replace: true,
          });
          return;
        }

        const {
          data: scheduleData,
          error: scheduleError,
        } = await supabase
          .from("availability_schedule")
          .select(
            "id, day_of_week, start_time, end_time, is_available"
          )
          .order("day_of_week", {
            ascending: true,
          });

        if (scheduleError) {
          throw scheduleError;
        }

        const {
          data: blockedData,
          error: blockedError,
        } = await supabase
          .from("blocked_dates")
          .select(
            "id, blocked_date, reason"
          )
          .order("blocked_date", {
            ascending: true,
          });

        if (blockedError) {
          throw blockedError;
        }

        if (!mounted) {
          return;
        }

        const mergedSchedule =
          getDefaultSchedule().map((day) => {
            const existing =
              scheduleData?.find(
                (item) =>
                  item.day_of_week ===
                  day.day_of_week
              );

            if (!existing) {
              return day;
            }

            return {
              ...day,
              is_available:
                existing.is_available,
              start_time:
                existing.start_time?.slice(0, 5) ||
                "10:00",
              end_time:
                existing.end_time?.slice(0, 5) ||
                "18:00",
            };
          });

        setSchedule(mergedSchedule);
        setBlockedDates(blockedData || []);

      } catch (loadError) {
        console.error(
          "Availability load error:",
          loadError
        );

        if (!mounted) {
          return;
        }

        setError(
          loadError?.message ||
            "Unable to load availability."
        );

      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadAvailability();

    return () => {
      mounted = false;
    };
  }, [session, navigate]);


  /* =====================================================
     UPDATE DAY
  ===================================================== */

  function updateDay(dayValue, changes) {
    setSchedule((current) =>
      current.map((day) =>
        day.day_of_week === dayValue
          ? {
              ...day,
              ...changes,
            }
          : day
      )
    );

    setError("");
    setSuccess("");
  }


  /* =====================================================
     SAVE WEEKLY SCHEDULE
  ===================================================== */

  async function saveSchedule() {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      for (const day of schedule) {
        await supabase
          .from("availability_schedule")
          .delete()
          .eq(
            "day_of_week",
            day.day_of_week
          );

        if (!day.is_available) {
          continue;
        }

        if (
          day.end_time <=
          day.start_time
        ) {
          throw new Error(
            `${day.label}: end time must be later than start time.`
          );
        }

        const {
          error: insertError,
        } = await supabase
          .from("availability_schedule")
          .insert({
            day_of_week:
              day.day_of_week,
            start_time:
              day.start_time,
            end_time:
              day.end_time,
            is_available: true,
          });

        if (insertError) {
          throw insertError;
        }
      }

      setSuccess(
        "Weekly availability saved successfully."
      );

    } catch (saveError) {
      console.error(
        "Availability save error:",
        saveError
      );

      setError(
        saveError?.message ||
          "Unable to save availability."
      );

    } finally {
      setSaving(false);
    }
  }


  /* =====================================================
     ADD BLOCKED DATE
  ===================================================== */

  async function addBlockedDate(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!newBlockedDate) {
      setError(
        "Please select a date to block."
      );
      return;
    }

    setAddingBlockedDate(true);

    try {
      const {
        data,
        error: insertError,
      } = await supabase
        .from("blocked_dates")
        .insert({
          blocked_date:
            newBlockedDate,
          reason:
            newBlockedReason.trim() ||
            null,
        })
        .select(
          "id, blocked_date, reason"
        )
        .single();

      if (insertError) {
        if (
          insertError.code ===
          "23505"
        ) {
          throw new Error(
            "That date is already blocked."
          );
        }

        throw insertError;
      }

      setBlockedDates((current) =>
        [...current, data].sort(
          (a, b) =>
            a.blocked_date.localeCompare(
              b.blocked_date
            )
        )
      );

      setNewBlockedDate("");
      setNewBlockedReason("");

      setSuccess(
        "Blocked date added."
      );

    } catch (insertError) {
      console.error(
        "Blocked date error:",
        insertError
      );

      setError(
        insertError?.message ||
          "Unable to block that date."
      );

    } finally {
      setAddingBlockedDate(false);
    }
  }


  /* =====================================================
     REMOVE BLOCKED DATE
  ===================================================== */

  async function removeBlockedDate(id) {
    setError("");
    setSuccess("");

    try {
      const {
        error: deleteError,
      } = await supabase
        .from("blocked_dates")
        .delete()
        .eq("id", id);

      if (deleteError) {
        throw deleteError;
      }

      setBlockedDates((current) =>
        current.filter(
          (item) =>
            item.id !== id
        )
      );

      setSuccess(
        "Blocked date removed."
      );

    } catch (deleteError) {
      console.error(
        "Blocked date removal error:",
        deleteError
      );

      setError(
        deleteError?.message ||
          "Unable to remove the blocked date."
      );
    }
  }


  function formatBlockedDate(dateString) {
    if (!dateString) {
      return "—";
    }

    const date =
      new Date(
        `${dateString}T00:00:00`
      );

    return new Intl.DateTimeFormat(
      "en-IN",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    ).format(date);
  }


  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <main className="admin-page">
        <div className="admin-card admin-loading">

          <div className="admin-symbol">
            ◷
          </div>

          <div className="admin-kicker">
            ASTERISM ASTRO
          </div>

          <h1>
            Loading availability
          </h1>

          <p>
            Please wait...
          </p>

        </div>
      </main>
    );
  }


  /* =====================================================
     PAGE
  ===================================================== */

  return (
    <main className="admin-page">

      <div className="admin-dashboard">

        <header className="admin-header">

          <div>
            <div className="admin-kicker">
              ASTERISM ASTRO
            </div>

            <h1>
              Availability
            </h1>

            <p>
              Control when clients can
              request consultations.
            </p>
          </div>

          <div className="admin-header-actions">

            <button
              type="button"
              className="admin-outline-button"
              onClick={() =>
                navigate("/admin")
              }
            >
              ← Admin Dashboard
            </button>

          </div>

        </header>


        {error && (
          <div
            className="auth-message auth-error"
            role="alert"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            className="auth-message auth-success"
            role="status"
          >
            {success}
          </div>
        )}


        {/* =================================================
            WEEKLY SCHEDULE
        ================================================= */}

        <section className="admin-section">

          <div className="admin-section-heading">

            <div>
              <div className="admin-section-kicker">
                WEEKLY SCHEDULE
              </div>

              <h2>
                Regular availability
              </h2>
            </div>

          </div>


          <div className="availability-list">

            {schedule.map((day) => (

              <div
                key={day.day_of_week}
                className={
                  `availability-row ${
                    day.is_available
                      ? "availability-row-active"
                      : ""
                  }`
                }
              >

                <div className="availability-day">

                  <strong>
                    {day.label}
                  </strong>

                  <span>
                    {day.is_available
                      ? "Available"
                      : "Unavailable"}
                  </span>

                </div>


                <label className="availability-switch">

                  <input
                    type="checkbox"
                    checked={
                      day.is_available
                    }
                    onChange={(event) =>
                      updateDay(
                        day.day_of_week,
                        {
                          is_available:
                            event.target.checked,
                        }
                      )
                    }
                  />

                  <span className="availability-switch-track" />

                </label>


                {day.is_available && (

                  <div className="availability-times">

                    <input
                      type="time"
                      value={
                        day.start_time
                      }
                      onChange={(event) =>
                        updateDay(
                          day.day_of_week,
                          {
                            start_time:
                              event.target.value,
                          }
                        )
                      }
                    />

                    <span>
                      to
                    </span>

                    <input
                      type="time"
                      value={
                        day.end_time
                      }
                      onChange={(event) =>
                        updateDay(
                          day.day_of_week,
                          {
                            end_time:
                              event.target.value,
                          }
                        )
                      }
                    />

                  </div>

                )}

              </div>

            ))}

          </div>


          <div className="availability-save-row">

            <button
              type="button"
              className="btn btn-gold"
              onClick={saveSchedule}
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : "Save Availability"}
            </button>

          </div>

        </section>


        {/* =================================================
            BLOCKED DATES
        ================================================= */}

        <section className="admin-section">

          <div className="admin-section-heading">

            <div>
              <div className="admin-section-kicker">
                BLOCKED DATES
              </div>

              <h2>
                Days you are unavailable
              </h2>
            </div>

          </div>


          <form
            className="blocked-date-form"
            onSubmit={addBlockedDate}
          >

            <label>

              <span>
                Date
              </span>

              <input
                type="date"
                value={
                  newBlockedDate
                }
                min={
                  new Date()
                    .toISOString()
                    .split("T")[0]
                }
                onChange={(event) =>
                  setNewBlockedDate(
                    event.target.value
                  )
                }
              />

            </label>


            <label>

              <span>
                Reason
              </span>

              <input
                type="text"
                value={
                  newBlockedReason
                }
                onChange={(event) =>
                  setNewBlockedReason(
                    event.target.value
                  )
                }
                placeholder="Holiday, personal day..."
              />

            </label>


            <button
              type="submit"
              className="btn btn-gold"
              disabled={
                addingBlockedDate
              }
            >
              {addingBlockedDate
                ? "Adding..."
                : "Block Date"}
            </button>

          </form>


          <div className="blocked-date-list">

            {blockedDates.length === 0 ? (

              <div className="blocked-date-empty">
                No blocked dates.
              </div>

            ) : (

              blockedDates.map((item) => (

                <div
                  key={item.id}
                  className="blocked-date-item"
                >

                  <div>

                    <strong>
                      {
                        formatBlockedDate(
                          item.blocked_date
                        )
                      }
                    </strong>

                    <span>
                      {
                        item.reason ||
                        "Unavailable"
                      }
                    </span>

                  </div>


                  <button
                    type="button"
                    className="blocked-date-remove"
                    onClick={() =>
                      removeBlockedDate(
                        item.id
                      )
                    }
                  >
                    Remove
                  </button>

                </div>

              ))

            )}

          </div>

        </section>

      </div>

    </main>
  );
}