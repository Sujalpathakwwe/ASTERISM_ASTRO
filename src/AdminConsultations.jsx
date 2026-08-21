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


const STATUS_OPTIONS = [
  {
    value: "pending",
    label: "Pending",
  },
  {
    value: "confirmed",
    label: "Confirmed",
  },
  {
    value: "completed",
    label: "Completed",
  },
  {
    value: "cancelled",
    label: "Cancelled",
  },
];


function formatDateTime(value) {
  if (!value) {
    return "Date not set";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Date not set";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  ).format(date);
}


function formatStatus(status) {
  if (!status) {
    return "Pending";
  }

  return (
    status.charAt(0).toUpperCase() +
    status.slice(1)
  );
}


function getDatePart(value) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date
    .toISOString()
    .slice(0, 10);
}


function getTimePart(value) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date
    .toISOString()
    .slice(11, 16);
}


export default function AdminConsultations({
  session,
}) {
  const navigate =
    useNavigate();


  const [
    consultations,
    setConsultations,
  ] = useState([]);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    savingId,
    setSavingId,
  ] = useState(null);


  const [
    error,
    setError,
  ] = useState("");


  const [
    success,
    setSuccess,
  ] = useState("");


  const [
    filter,
    setFilter,
  ] = useState("all");


  const [
    openId,
    setOpenId,
  ] = useState(null);


  const [
    editStatus,
    setEditStatus,
  ] = useState("");


  const [
    editDate,
    setEditDate,
  ] = useState("");


  const [
    editTime,
    setEditTime,
  ] = useState("");


  /* =======================================================
     LOAD CONSULTATIONS
  ======================================================= */

  useEffect(() => {
    let mounted = true;


    async function loadConsultations() {
      setLoading(true);
      setError("");


      try {
        if (!session?.user?.id) {
          throw new Error(
            "No authenticated user found."
          );
        }


        /* -----------------------------------------------
           VERIFY ADMIN
        ----------------------------------------------- */

        const {
          data: adminProfile,
          error:
            adminError,
        } =
          await supabase
            .from("profiles")
            .select("is_admin")
            .eq(
              "id",
              session.user.id
            )
            .single();


        if (adminError) {
          throw adminError;
        }


        if (
          !adminProfile?.is_admin
        ) {
          navigate(
            "/account",
            {
              replace: true,
            }
          );

          return;
        }


        /* -----------------------------------------------
           CONSULTATIONS
        ----------------------------------------------- */

        const {
          data:
            consultationData,
          error:
            consultationError,
        } =
          await supabase
            .from("consultations")
            .select(
              "id, user_id, service_name, status, scheduled_at, notes, created_at"
            )
            .order(
              "created_at",
              {
                ascending: false,
              }
            );


        if (consultationError) {
          throw consultationError;
        }


        /* -----------------------------------------------
           LOAD CLIENT PROFILES
        ----------------------------------------------- */

        const userIds = [
          ...new Set(
            (
              consultationData ||
              []
            )
              .map(
                (item) =>
                  item.user_id
              )
              .filter(Boolean)
          ),
        ];


        let profileMap =
          new Map();


        if (userIds.length > 0) {

          const {
            data:
              profileData,
            error:
              profileError,
          } =
            await supabase
              .from("profiles")
              .select(
                "id, full_name, email"
              )
              .in(
                "id",
                userIds
              );


          if (profileError) {
            throw profileError;
          }


          profileMap =
            new Map(
              (
                profileData ||
                []
              ).map(
                (profile) => [
                  profile.id,
                  profile,
                ]
              )
            );
        }


        const combined =
          (
            consultationData ||
            []
          ).map(
            (consultation) => ({
              ...consultation,

              client:
                profileMap.get(
                  consultation.user_id
                ) || null,
            })
          );


        if (!mounted) {
          return;
        }


        setConsultations(
          combined
        );


      } catch (loadError) {

        console.error(
          "Admin consultations error:",
          loadError
        );


        if (!mounted) {
          return;
        }


        setError(
          loadError?.message ||
            "Unable to load consultations."
        );

      } finally {

        if (mounted) {
          setLoading(false);
        }
      }
    }


    loadConsultations();


    return () => {
      mounted = false;
    };

  }, [
    session,
    navigate,
  ]);


  /* =======================================================
     OPEN EDITOR
  ======================================================= */

  function openEditor(
    consultation
  ) {
    setOpenId(
      consultation.id
    );

    setEditStatus(
      consultation.status ||
      "pending"
    );

    setEditDate(
      getDatePart(
        consultation.scheduled_at
      )
    );

    setEditTime(
      getTimePart(
        consultation.scheduled_at
      )
    );

    setError("");
    setSuccess("");
  }


  function closeEditor() {
    setOpenId(null);

    setEditStatus("");
    setEditDate("");
    setEditTime("");
  }


  /* =======================================================
     SAVE CONSULTATION
  ======================================================= */

  async function saveConsultation(
    consultationId
  ) {
    setSavingId(
      consultationId
    );

    setError("");
    setSuccess("");


    try {
      let scheduledAt =
        null;


      if (
        editDate &&
        editTime
      ) {
        scheduledAt =
          new Date(
            `${editDate}T${editTime}`
          ).toISOString();
      }


      const {
        data,
        error:
          updateError,
      } =
        await supabase
          .from("consultations")
          .update({
            status:
              editStatus,

            scheduled_at:
              scheduledAt,
          })
          .eq(
            "id",
            consultationId
          )
          .select(
            "id, user_id, service_name, status, scheduled_at, notes, created_at"
          )
          .single();


      if (updateError) {
        throw updateError;
      }


      const existing =
        consultations.find(
          (item) =>
            item.id ===
            consultationId
        );


      setConsultations(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              consultationId
                ? {
                    ...item,
                    ...data,
                    client:
                      existing?.client ||
                      null,
                  }
                : item
          )
      );


      setSuccess(
        "Consultation updated successfully."
      );


      closeEditor();

    } catch (updateError) {

      console.error(
        "Consultation update error:",
        updateError
      );


      setError(
        updateError?.message ||
          "Unable to update the consultation."
      );

    } finally {

      setSavingId(null);
    }
  }


  /* =======================================================
     FILTER
  ======================================================= */

  const filteredConsultations =
    consultations.filter(
      (consultation) =>
        filter === "all" ||
        consultation.status ===
          filter
    );


  const counts = {
    all:
      consultations.length,

    pending:
      consultations.filter(
        (item) =>
          item.status ===
          "pending"
      ).length,

    confirmed:
      consultations.filter(
        (item) =>
          item.status ===
          "confirmed"
      ).length,

    completed:
      consultations.filter(
        (item) =>
          item.status ===
          "completed"
      ).length,

    cancelled:
      consultations.filter(
        (item) =>
          item.status ===
          "cancelled"
      ).length,
  };


  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {

    return (
      <main className="admin-page">

        <div className="admin-card admin-loading">

          <div className="admin-symbol">
            ◉
          </div>

          <div className="admin-kicker">
            ASTERISM ASTRO
          </div>

          <h1>
            Loading consultations
          </h1>

          <p>
            Please wait...
          </p>

        </div>

      </main>
    );
  }


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className="admin-page">

      <div className="admin-dashboard">


        {/* =================================================
            HEADER
        ================================================= */}

        <header className="admin-header">

          <div>

            <div className="admin-kicker">
              ASTERISM ASTRO
            </div>

            <h1>
              Consultations
            </h1>

            <p>
              Review, confirm and manage
              client consultation requests.
            </p>

          </div>


          <div className="admin-header-actions">

            <button
              type="button"
              className="admin-outline-button"
              onClick={() =>
                navigate(
                  "/admin"
                )
              }
            >
              ← Admin Dashboard
            </button>

          </div>

        </header>


        {/* =================================================
            MESSAGES
        ================================================= */}

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
            FILTERS
        ================================================= */}

        <section className="admin-section">

          <div className="admin-section-heading">

            <div>

              <div className="admin-section-kicker">
                REQUESTS
              </div>

              <h2>
                Consultation requests
              </h2>

            </div>

          </div>


          <div className="consultation-filters">

            {[
              [
                "all",
                "All",
              ],
              [
                "pending",
                "Pending",
              ],
              [
                "confirmed",
                "Confirmed",
              ],
              [
                "completed",
                "Completed",
              ],
              [
                "cancelled",
                "Cancelled",
              ],
            ].map(
              ([
                value,
                label,
              ]) => (

                <button
                  key={value}
                  type="button"
                  className={
                    `consultation-filter ${
                      filter === value
                        ? "consultation-filter-active"
                        : ""
                    }`
                  }
                  onClick={() =>
                    setFilter(
                      value
                    )
                  }
                >
                  {label}

                  <span>
                    {
                      counts[
                        value
                      ]
                    }
                  </span>

                </button>

              )
            )}

          </div>


          {/* =================================================
              EMPTY
          ================================================= */}

          {filteredConsultations.length ===
          0 ? (

            <div className="account-empty-card">

              <div className="account-empty-symbol">
                ◉
              </div>

              <h3>
                No consultation requests
              </h3>

              <p>
                There are no requests in
                this category yet.
              </p>

            </div>

          ) : (

            <div className="admin-consultation-list">

              {filteredConsultations.map(
                (
                  consultation
                ) => (

                  <article
                    key={
                      consultation.id
                    }
                    className="admin-consultation-card"
                  >

                    {/* CARD HEADER */}

                    <div className="admin-consultation-top">

                      <div>

                        <div className="admin-consultation-kicker">
                          {
                            consultation.service_name ||
                            "CONSULTATION"
                          }
                        </div>

                        <h3>
                          {
                            consultation.client?.full_name ||
                            "Client"
                          }
                        </h3>

                        <p className="admin-consultation-email">
                          {
                            consultation.client?.email ||
                            "Email unavailable"
                          }
                        </p>

                      </div>


                      <span
                        className={
                          `admin-consultation-status admin-consultation-status-${consultation.status}`
                        }
                      >
                        {
                          formatStatus(
                            consultation.status
                          )
                        }
                      </span>

                    </div>


                    {/* DETAILS */}

                    <div className="admin-consultation-details">

                      <div>

                        <span>
                          PREFERRED TIME
                        </span>

                        <strong>
                          {
                            formatDateTime(
                              consultation.scheduled_at
                            )
                          }
                        </strong>

                      </div>


                      <div>

                        <span>
                          REQUESTED
                        </span>

                        <strong>
                          {
                            formatDateTime(
                              consultation.created_at
                            )
                          }
                        </strong>

                      </div>

                    </div>


                    {/* NOTES */}

                    {consultation.notes && (

                      <div className="admin-consultation-notes">

                        <span>
                          CLIENT MESSAGE
                        </span>

                        <p>
                          {
                            consultation.notes
                          }
                        </p>

                      </div>

                    )}


                    {/* EDITOR */}

                    {openId ===
                    consultation.id ? (

                      <div className="admin-consultation-editor">

                        <div className="admin-editor-field">

                          <span>
                            STATUS
                          </span>

                          <select
                            value={
                              editStatus
                            }
                            onChange={(
                              event
                            ) =>
                              setEditStatus(
                                event.target
                                  .value
                              )
                            }
                          >

                            {STATUS_OPTIONS.map(
                              (
                                option
                              ) => (

                                <option
                                  key={
                                    option.value
                                  }
                                  value={
                                    option.value
                                  }
                                >
                                  {
                                    option.label
                                  }
                                </option>

                              )
                            )}

                          </select>

                        </div>


                        <div className="admin-editor-field">

                          <span>
                            DATE
                          </span>

                          <input
                            type="date"
                            value={
                              editDate
                            }
                            onChange={(
                              event
                            ) =>
                              setEditDate(
                                event.target
                                  .value
                              )
                            }
                          />

                        </div>


                        <div className="admin-editor-field">

                          <span>
                            TIME
                          </span>

                          <input
                            type="time"
                            value={
                              editTime
                            }
                            onChange={(
                              event
                            ) =>
                              setEditTime(
                                event.target
                                  .value
                              )
                            }
                          />

                        </div>


                        <div className="admin-editor-actions">

                          <button
                            type="button"
                            className="btn btn-gold"
                            disabled={
                              savingId ===
                              consultation.id
                            }
                            onClick={() =>
                              saveConsultation(
                                consultation.id
                              )
                            }
                          >
                            {savingId ===
                            consultation.id
                              ? "Saving..."
                              : "Save Changes"}
                          </button>


                          <button
                            type="button"
                            className="admin-outline-button"
                            onClick={
                              closeEditor
                            }
                          >
                            Cancel
                          </button>

                        </div>

                      </div>

                    ) : (

                      <div className="admin-consultation-actions">

                        <button
                          type="button"
                          className="admin-consultation-edit-button"
                          onClick={() =>
                            openEditor(
                              consultation
                            )
                          }
                        >
                          Manage Request
                        </button>

                      </div>

                    )}

                  </article>

                )
              )}

            </div>

          )}

        </section>

      </div>

    </main>
  );
}