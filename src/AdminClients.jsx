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

export default function AdminClients({ session, onBack }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
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

    async function loadClients() {
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
            "id, user_id, service_name, status, payment_status, scheduled_at, created_at"
          )
          .eq("payment_status", "paid")
          .eq("status", "completed")
          .order("created_at", { ascending: false });

        if (consultationError) throw consultationError;

        const completed = (consultationData || []).filter(
          (item) => item.user_id
        );

        const userIds = [...new Set(completed.map((item) => item.user_id))];
        let profileMap = new Map();

        if (userIds.length > 0) {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("id, full_name, email, created_at, is_admin")
            .in("id", userIds);

          if (profileError) throw profileError;

          profileMap = new Map(
            (profileData || [])
              .filter((profile) => profile.is_admin !== true)
              .map((profile) => [profile.id, profile])
          );
        }

        const grouped = new Map();

        completed.forEach((booking) => {
          const profile = profileMap.get(booking.user_id);
          if (!profile) return;

          const existing = grouped.get(booking.user_id);

          if (!existing) {
            grouped.set(booking.user_id, {
              ...profile,
              completedBookings: 1,
              lastService: booking.service_name || "Consultation",
              lastBookingDate:
                booking.scheduled_at || booking.created_at || null,
            });
            return;
          }

          existing.completedBookings += 1;
        });

        const clientList = Array.from(grouped.values()).sort((a, b) => {
          const aTime = a.lastBookingDate
            ? new Date(a.lastBookingDate).getTime()
            : 0;
          const bTime = b.lastBookingDate
            ? new Date(b.lastBookingDate).getTime()
            : 0;
          return bTime - aTime;
        });

        if (!mounted) return;
        setClients(clientList);
      } catch (loadError) {
        console.error("Admin clients error:", loadError);
        if (!mounted) return;
        setError(
          loadError?.message || "Unable to load completed client accounts."
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadClients();

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
          <h1>Loading clients</h1>
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
          <h1>Unable to load clients</h1>
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
            <p>Clients with paid and completed consultations.</p>
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
              <div className="admin-section-kicker">CLIENTS</div>
              <h2>Completed customers</h2>
              <p style={{ margin: "6px 0 0", opacity: 0.7 }}>
                Only customers whose payment is paid and booking status is completed.
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
              {clients.length} client{clients.length === 1 ? "" : "s"}
            </div>
          </div>

          {clients.length === 0 ? (
            <div className="admin-card" style={{ marginTop: "22px" }}>
              <div className="admin-symbol">◌</div>
              <h2>No completed clients yet</h2>
              <p>
                A client will appear here after payment is marked paid and the
                consultation is marked completed.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "14px",
                marginTop: "22px",
              }}
            >
              {clients.map((client) => {
                const initial = (
                  client.full_name || client.email || "C"
                )
                  .charAt(0)
                  .toUpperCase();

                return (
                  <article
                    key={client.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "56px minmax(0, 1.4fr) minmax(170px, 0.8fr) minmax(150px, 0.7fr)",
                      gap: "18px",
                      alignItems: "center",
                      padding: "18px 20px",
                      border: "1px solid rgba(120, 94, 45, 0.18)",
                      borderRadius: "16px",
                      background: "rgba(255,255,255,0.38)",
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
                        {client.full_name || "Unnamed Client"}
                      </strong>
                      <span
                        style={{
                          display: "block",
                          fontSize: "14px",
                          opacity: 0.76,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {client.email || "Email unavailable"}
                      </span>
                    </div>

                    <div>
                      <span
                        style={{
                          display: "block",
                          fontSize: "10px",
                          letterSpacing: "0.16em",
                          fontWeight: 700,
                          opacity: 0.6,
                          marginBottom: "5px",
                        }}
                      >
                        LAST SERVICE
                      </span>
                      <strong style={{ fontSize: "14px" }}>
                        {client.lastService}
                      </strong>
                      <div style={{ fontSize: "12px", opacity: 0.65, marginTop: "4px" }}>
                        {formatDate(client.lastBookingDate)}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "7px 11px",
                          borderRadius: "999px",
                          background: "rgba(177, 131, 24, 0.1)",
                          border: "1px solid rgba(177, 131, 24, 0.22)",
                          fontSize: "12px",
                          fontWeight: 700,
                        }}
                      >
                        {client.completedBookings} completed
                      </span>
                      <div
                        style={{
                          fontSize: "11px",
                          opacity: 0.48,
                          marginTop: "8px",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {client.id}
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
        @media (max-width: 850px) {
          .admin-dashboard article {
            grid-template-columns: 48px minmax(0, 1fr) !important;
          }
          .admin-dashboard article > div:nth-child(3),
          .admin-dashboard article > div:nth-child(4) {
            grid-column: 2;
            text-align: left !important;
          }
        }
      `}</style>
    </main>
  );
}
