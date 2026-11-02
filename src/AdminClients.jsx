import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabase";

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatStatus(value) {
  if (!value) return "Pending";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function DetailItem({ label, value }) {
  return (
    <div className="consultation-detail-item">
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

export default function AdminClients({ session, onBack }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [error, setError] = useState("");

  function goBack() {
    if (selectedBooking) {
      setSelectedBooking(null);
      return;
    }

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
            "id, user_id, service_name, consultation_type, status, payment_status, payment_provider, payment_amount, payment_currency, payment_id, payment_checkout_id, scheduled_at, preferred_date, created_at, contact_method, contact_details, consultation_message, client_birth_date, client_birth_time, client_birth_time_known, client_birth_country, client_birth_region, client_birth_city, relationship_status, partner_name, partner_birth_date, partner_birth_time, partner_birth_time_known, partner_birth_country, partner_birth_region, partner_birth_city"
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

  if (selectedBooking) {
    const booking = selectedBooking;
    const name = booking.client?.full_name || "Client";
    const email = booking.client?.email || booking.contact_details || "Email unavailable";

    return (
      <main className="admin-page">
        <div className="admin-dashboard">
          <header className="admin-header">
            <div>
              <div className="admin-kicker">ASTERISM ASTRO</div>
              <h1>Consultation Details</h1>
              <p>{booking.service_name || "Consultation"} for {name}</p>
            </div>

            <div className="admin-header-actions">
              <button type="button" className="admin-outline-button" onClick={goBack}>
                ← Paid Bookings
              </button>
            </div>
          </header>

          <section className="admin-section consultation-detail-panel">
            <div className="consultation-detail-hero">
              <div className="consultation-detail-avatar">
                {(name || email || "C").charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="admin-section-kicker">CLIENT</div>
                <h2>{name}</h2>
                <p>{email}</p>
              </div>
              <div className="consultation-detail-badges">
                <span>{formatStatus(booking.status)}</span>
                <span>Paid</span>
              </div>
            </div>

            <div className="consultation-detail-section">
              <h3>Booking</h3>
              <div className="consultation-detail-grid">
                <DetailItem label="Service" value={booking.service_name} />
                <DetailItem label="Booking status" value={formatStatus(booking.status)} />
                <DetailItem label="Preferred date" value={formatDate(booking.preferred_date)} />
                <DetailItem label="Scheduled time" value={formatDateTime(booking.scheduled_at)} />
                <DetailItem label="Booked on" value={formatDateTime(booking.created_at)} />
                <DetailItem label="Booking ID" value={booking.id} />
              </div>
            </div>

            <div className="consultation-detail-section">
              <h3>Contact</h3>
              <div className="consultation-detail-grid">
                <DetailItem label="Email" value={email} />
                <DetailItem label="Contact method" value={booking.contact_method} />
                <DetailItem label="Contact details" value={booking.contact_details} />
                <DetailItem label="User ID" value={booking.user_id} />
              </div>
            </div>

            <div className="consultation-detail-section">
              <h3>Client birth details</h3>
              <div className="consultation-detail-grid">
                <DetailItem label="Birth date" value={booking.client_birth_date} />
                <DetailItem
                  label="Birth time"
                  value={booking.client_birth_time_known === false ? "Unknown" : booking.client_birth_time}
                />
                <DetailItem label="Birth city" value={booking.client_birth_city} />
                <DetailItem label="Birth region" value={booking.client_birth_region} />
                <DetailItem label="Birth country" value={booking.client_birth_country} />
                <DetailItem label="Relationship status" value={booking.relationship_status} />
              </div>
            </div>

            {(booking.partner_name || booking.partner_birth_date || booking.partner_birth_city) && (
              <div className="consultation-detail-section">
                <h3>Partner details</h3>
                <div className="consultation-detail-grid">
                  <DetailItem label="Partner name" value={booking.partner_name} />
                  <DetailItem label="Birth date" value={booking.partner_birth_date} />
                  <DetailItem
                    label="Birth time"
                    value={booking.partner_birth_time_known === false ? "Unknown" : booking.partner_birth_time}
                  />
                  <DetailItem label="Birth city" value={booking.partner_birth_city} />
                  <DetailItem label="Birth region" value={booking.partner_birth_region} />
                  <DetailItem label="Birth country" value={booking.partner_birth_country} />
                </div>
              </div>
            )}

            <div className="consultation-detail-section">
              <h3>Payment</h3>
              <div className="consultation-detail-grid">
                <DetailItem
                  label="Amount"
                  value={`${booking.payment_currency || ""} ${booking.payment_amount ?? ""}`.trim()}
                />
                <DetailItem label="Provider" value={booking.payment_provider} />
                <DetailItem label="Payment ID" value={booking.payment_id} />
                <DetailItem label="Checkout ID" value={booking.payment_checkout_id} />
              </div>
            </div>

            {booking.consultation_message && (
              <div className="consultation-detail-section">
                <h3>Client message</h3>
                <div className="consultation-message-box">
                  {booking.consultation_message}
                </div>
              </div>
            )}
          </section>
        </div>

        <style>{detailStyles}</style>
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
            <button type="button" className="admin-outline-button" onClick={goBack}>
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
                Click any booking to open the full consultation details.
              </p>
            </div>

            <div className="paid-booking-count">
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
            <div className="paid-booking-list">
              {bookings.map((booking) => {
                const name = booking.client?.full_name || "Client";
                const email = booking.client?.email || booking.contact_details || "Email unavailable";
                const initial = (name || email || "C").charAt(0).toUpperCase();
                const bookingDate = booking.scheduled_at || booking.preferred_date || booking.created_at;

                return (
                  <button
                    key={booking.id}
                    type="button"
                    className="paid-booking-row"
                    onClick={() => setSelectedBooking(booking)}
                  >
                    <div className="paid-booking-avatar">{initial}</div>

                    <div className="paid-booking-client">
                      <strong>{name}</strong>
                      <span>{email}</span>
                    </div>

                    <div>
                      <span className="paid-booking-label">SERVICE</span>
                      <strong>{booking.service_name || "Consultation"}</strong>
                      <div className="paid-booking-subtext">{formatDate(bookingDate)}</div>
                    </div>

                    <div>
                      <span className="paid-booking-label">BOOKING STATUS</span>
                      <span className="paid-booking-status">{formatStatus(booking.status)}</span>
                    </div>

                    <div className="paid-booking-payment">
                      <span className="paid-booking-label">PAYMENT</span>
                      <strong>
                        {booking.payment_currency || ""} {booking.payment_amount ?? "Paid"}
                      </strong>
                      <div className="paid-booking-subtext">{booking.payment_provider || "payment"}</div>
                    </div>

                    <div className="paid-booking-open">View details →</div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <style>{detailStyles}</style>
    </main>
  );
}

const detailStyles = `
  .paid-booking-count {
    padding: 8px 14px;
    border: 1px solid rgba(177, 131, 24, 0.25);
    border-radius: 999px;
    font-size: 13px;
    font-weight: 700;
    white-space: nowrap;
  }

  .paid-booking-list {
    display: grid;
    gap: 14px;
    margin-top: 22px;
  }

  .paid-booking-row {
    width: 100%;
    display: grid;
    grid-template-columns: 56px minmax(0, 1.3fr) minmax(160px, 0.8fr) minmax(130px, 0.6fr) minmax(130px, 0.6fr) auto;
    gap: 18px;
    align-items: center;
    padding: 18px 20px;
    border: 1px solid rgba(120, 94, 45, 0.18);
    border-radius: 16px;
    background: rgba(255,255,255,0.42);
    box-shadow: 0 8px 24px rgba(45, 34, 15, 0.04);
    color: inherit;
    text-align: left;
    cursor: pointer;
    transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
  }

  .paid-booking-row:hover {
    transform: translateY(-2px);
    border-color: rgba(177, 131, 24, 0.38);
    box-shadow: 0 12px 28px rgba(45, 34, 15, 0.08);
  }

  .paid-booking-avatar,
  .consultation-detail-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    border: 1px solid rgba(177, 131, 24, 0.3);
    font-family: Georgia, serif;
    font-size: 20px;
    font-weight: 700;
  }

  .paid-booking-client { min-width: 0; }
  .paid-booking-client strong {
    display: block;
    font-family: Georgia, serif;
    font-size: 19px;
    line-height: 1.25;
    margin-bottom: 5px;
  }
  .paid-booking-client span {
    display: block;
    font-size: 14px;
    opacity: .76;
    overflow-wrap: anywhere;
  }

  .paid-booking-label {
    display: block;
    font-size: 10px;
    letter-spacing: .16em;
    font-weight: 700;
    opacity: .58;
    margin-bottom: 6px;
  }

  .paid-booking-subtext {
    font-size: 12px;
    opacity: .65;
    margin-top: 4px;
  }

  .paid-booking-status {
    display: inline-block;
    padding: 6px 10px;
    border-radius: 999px;
    border: 1px solid rgba(177, 131, 24, 0.22);
    background: rgba(177, 131, 24, 0.08);
    font-size: 12px;
    font-weight: 700;
  }

  .paid-booking-payment { text-align: right; }
  .paid-booking-open {
    font-size: 12px;
    font-weight: 700;
    opacity: .65;
    white-space: nowrap;
  }

  .consultation-detail-panel { display: grid; gap: 24px; }
  .consultation-detail-hero {
    display: grid;
    grid-template-columns: 56px minmax(0, 1fr) auto;
    gap: 16px;
    align-items: center;
    padding-bottom: 22px;
    border-bottom: 1px solid rgba(120, 94, 45, 0.14);
  }
  .consultation-detail-hero h2 { margin: 2px 0 4px; }
  .consultation-detail-hero p { margin: 0; opacity: .7; }
  .consultation-detail-badges { display: flex; gap: 8px; flex-wrap: wrap; }
  .consultation-detail-badges span {
    padding: 7px 11px;
    border-radius: 999px;
    border: 1px solid rgba(177, 131, 24, 0.24);
    background: rgba(177, 131, 24, 0.08);
    font-size: 12px;
    font-weight: 700;
  }

  .consultation-detail-section h3 {
    margin: 0 0 14px;
    font-family: Georgia, serif;
    font-size: 20px;
  }
  .consultation-detail-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }
  .consultation-detail-item {
    padding: 14px 15px;
    border: 1px solid rgba(120, 94, 45, 0.14);
    border-radius: 12px;
    background: rgba(255,255,255,.32);
    min-width: 0;
  }
  .consultation-detail-item span {
    display: block;
    font-size: 10px;
    letter-spacing: .12em;
    text-transform: uppercase;
    opacity: .55;
    margin-bottom: 6px;
    font-weight: 700;
  }
  .consultation-detail-item strong {
    display: block;
    font-size: 14px;
    overflow-wrap: anywhere;
  }
  .consultation-message-box {
    padding: 16px;
    border-left: 3px solid rgba(177, 131, 24, .75);
    border-radius: 10px;
    background: rgba(177, 131, 24, .06);
    line-height: 1.65;
  }

  @media (max-width: 1000px) {
    .paid-booking-row {
      grid-template-columns: 48px minmax(0, 1fr) !important;
    }
    .paid-booking-row > div:nth-child(n+3) {
      grid-column: 2;
      text-align: left !important;
    }
    .consultation-detail-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }

  @media (max-width: 650px) {
    .consultation-detail-grid { grid-template-columns: 1fr; }
    .consultation-detail-hero { grid-template-columns: 48px minmax(0, 1fr); }
    .consultation-detail-badges { grid-column: 2; }
  }
`;