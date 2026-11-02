import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabase";

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatStatus(value) {
  if (!value) return "Pending";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function AdminClients({ session, onBack }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");

  function goBack() {
    if (typeof onBack === "function") {
      onBack();
      return;
    }
    navigate("/admin");
  }

  useEffect(() => {
    let mounted = true;

    async function loadPaidBookings() {
      setLoading(true);
      setError("");

      try {
        const userId = session?.user?.id;

        if (!userId) {
          navigate("/login", { replace: true });
          return;
        }

        const { data: adminProfile, error: adminError } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", userId)
          .single();

        if (adminError) throw adminError;

        if (!adminProfile?.is_admin) {
          navigate("/account", { replace: true });
          return;
        }

        const { data: consultationData, error: consultationError } = await supabase
          .from("consultations")
          .select(
            "id, user_id, service_name, status, payment_status, payment_provider, payment_amount, payment_currency, scheduled_at, preferred_date, created_at"
          )
          .eq("payment_status", "paid")
          .order("created_at", { ascending: false });

        if (consultationError) throw consultationError;

        const paidBookings = consultationData || [];
        const userIds = [
          ...new Set(paidBookings.map((item) => item.user_id).filter(Boolean)),
        ];

        let profileMap = new Map();

        if (userIds.length > 0) {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("id, full_name, email, is_admin")
            .in("id", userIds);

          if (profileError) throw profileError;

          profileMap = new Map(
            (profileData || [])
              .filter((profile) => profile.is_admin !== true)
              .map((profile) => [profile.id, profile])
          );
        }

        const rows = paidBookings
          .map((booking) => ({
            ...booking,
            client: booking.user_id ? profileMap.get(booking.user_id) || null : null,
          }))
          .filter((booking) => {
            if (!booking.user_id) return true;
            return Boolean(booking.client);
          });

        if (!mounted) return;
        setBookings(rows);
      } catch (loadError) {
        console.error("Admin paid bookings error:", loadError);
        if (!mounted) return;
        setError(loadError?.message || "Unable to load paid bookings.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadPaidBookings();

    return () => {
      mounted = false;
    };
  }, [session, navigate]);

  if (loading) {
    return (
      <main className="admin-page">
        <div className="admin-card admin-loading">
          <div className="admin-symbol">✦</div>
          <div className="admin-kicker">ASTERISM ASTRO</div>
          <h1>Loading paid bookings</h1>
          <p>Please wait...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="admin-page">
        <div className="admin-card">
          <div className="admin-symbol">✦</div>
          <div className="admin-kicker">ASTERISM ASTRO</div>
          <h1>Unable to load paid bookings</h1>
          <p>{error}</p>
          <button type="button" className="btn btn-gold" onClick={goBack}>
            ← Admin Dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <div className="admin-dashboard">
        <header className="admin-header">
          <div>
            <div className="admin-kicker">ASTERISM ASTRO</div>
            <h1>Client Accounts</h1>
            <p>Every consultation with a confirmed paid payment.</p>
          </div>

          <div className="admin-header-actions">
            <button
              type="button"
              className="admin-outline-button"
              onClick={goBack}
            >
              ← Admin Dashboard
            </button>
          </div>
        </header>

        <section className="admin-section">
          <div className="admin-section-heading">
            <div>
              <div className="admin-section-kicker">PAID BOOKINGS</div>
              <h2>Customers & bookings</h2>
              <p style={{ margin: "6px 0 0", opacity: 0.7 }}>
                Each row represents one paid consultation, including pending,
                confirmed and completed bookings.
              </p>
            </div>

            <div
              style={{
                padding: "8px 14px",
                border: "1px solid rgba(177, 131, 24, 0.25)",
                borderRadius: "999px",
                fontSize: "13px",
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              {bookings.length} paid booking{bookings.length === 1 ? "" : "s"}
            </div>
          </div>

          {bookings.length === 0 ? (
            <div className="admin-card" style={{ marginTop: "22px" }}>
              <div className="admin-symbol">◌</div>
              <h2>No paid bookings yet</h2>
              <p>Successful paid consultations will appear here.</p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "14px",
                marginTop: "22px",
              }}
            >
              {bookings.map((booking) => {
                const name = booking.client?.full_name || "Client";
                const email = booking.client?.email || "Email unavailable";
                const initial = (name || email || "C").charAt(0).toUpperCase();
                const bookingDate =
                  booking.scheduled_at || booking.preferred_date || booking.created_at;

                return (
                  <article
                    key={booking.id}
                    className="paid-booking-row"
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "56px minmax(0, 1.3fr) minmax(160px, 0.8fr) minmax(130px, 0.6fr) minmax(130px, 0.6fr)",
                      gap: "18px",
                      alignItems: "center",
                      padding: "18px 20px",
                      border: "1px solid rgba(120, 94, 45, 0.18)",
                      borderRadius: "16px",
                      background: "rgba(255,255,255,0.42)",
                      boxShadow: "0 8px 24px rgba(45, 34, 15, 0.04)",
                    }}
                  >
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        border: "1px solid rgba(177, 131, 24, 0.3)",
                        fontFamily: "Georgia, serif",
                        fontSize: "20px",
                        fontWeight: 700,
                      }}
                    >
                      {initial}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <strong
                        style={{
                          display: "block",
                          fontFamily: "Georgia, serif",
                          fontSize: "19px",
                          lineHeight: 1.25,
                          marginBottom: "5px",
                        }}
                      >
                        {name}
                      </strong>
                      <span
                        style={{
                          display: "block",
                          fontSize: "14px",
                          opacity: 0.76,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {email}
                      </span>
                    </div>

                    <div>
                      <span className="paid-booking-label">SERVICE</span>
                      <strong style={{ display: "block", fontSize: "14px" }}>
                        {booking.service_name || "Consultation"}
                      </strong>
                      <div style={{ fontSize: "12px", opacity: 0.65, marginTop: "4px" }}>
                        {formatDate(bookingDate)}
                      </div>
                    </div>

                    <div>
                      <span className="paid-booking-label">BOOKING STATUS</span>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "6px 10px",
                          borderRadius: "999px",
                          border: "1px solid rgba(177, 131, 24, 0.22)",
                          background: "rgba(177, 131, 24, 0.08)",
                          fontSize: "12px",
                          fontWeight: 700,
                        }}
                      >
                        {formatStatus(booking.status)}
                      </span>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span className="paid-booking-label">PAYMENT</span>
                      <strong style={{ display: "block", fontSize: "14px" }}>
                        {booking.payment_currency || ""}{" "}
                        {booking.payment_amount ?? "Paid"}
                      </strong>
                      <div style={{ fontSize: "11px", opacity: 0.55, marginTop: "4px" }}>
                        {booking.payment_provider || "payment"}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <style>{`
        .paid-booking-label {
          display: block;
          font-size: 10px;
          letter-spacing: 0.16em;
          font-weight: 700;
          opacity: 0.58;
          margin-bottom: 6px;
        }

        @media (max-width: 900px) {
          .paid-booking-row {
            grid-template-columns: 48px minmax(0, 1fr) !important;
          }

          .paid-booking-row > div:nth-child(3),
          .paid-booking-row > div:nth-child(4),
          .paid-booking-row > div:nth-child(5) {
            grid-column: 2;
            text-align: left !important;
          }
        }
      `}</style>
    </main>
  );
}
