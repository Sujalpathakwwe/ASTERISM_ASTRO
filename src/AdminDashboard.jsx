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


export default function AdminDashboard({
  session,
}) {
  const navigate =
    useNavigate();

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    isAdmin,
    setIsAdmin,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");


  /* =======================================================
     VERIFY ADMIN
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    async function verifyAdmin() {
      try {

        const userId =
          session?.user?.id;


        if (!userId) {
          navigate(
            "/login",
            {
              replace: true,
            }
          );

          return;
        }


        const {
          data,
          error: profileError,
        } =
          await supabase
            .from("profiles")
            .select("is_admin")
            .eq(
              "id",
              userId
            )
            .single();


        if (profileError) {
          throw profileError;
        }


        if (!mounted) {
          return;
        }


        if (!data?.is_admin) {

          setIsAdmin(false);

          navigate(
            "/account",
            {
              replace: true,
            }
          );

          return;
        }


        setIsAdmin(true);

      } catch (adminError) {

        console.error(
          "Admin verification error:",
          adminError
        );


        if (!mounted) {
          return;
        }


        setError(
          "Unable to verify administrator access."
        );

      } finally {

        if (mounted) {
          setLoading(false);
        }
      }
    }


    verifyAdmin();


    return () => {
      mounted = false;
    };

  }, [
    session,
    navigate,
  ]);


  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {

    return (
      <main className="admin-page">

        <div className="admin-card admin-loading">

          <div className="admin-symbol">
            ✦
          </div>

          <div className="admin-kicker">
            ASTERISM ASTRO
          </div>

          <h1>
            Verifying access
          </h1>

          <p>
            Please wait...
          </p>

        </div>

      </main>
    );
  }


  /* =======================================================
     ERROR
  ======================================================= */

  if (error) {

    return (
      <main className="admin-page">

        <div className="admin-card">

          <div className="admin-symbol">
            ✦
          </div>

          <div className="admin-kicker">
            ASTERISM ASTRO
          </div>

          <h1>
            Admin access error
          </h1>

          <p>
            {error}
          </p>

          <button
            type="button"
            className="btn btn-gold"
            onClick={() =>
              navigate(
                "/account"
              )
            }
          >
            Back to Account
          </button>

        </div>

      </main>
    );
  }


  /* =======================================================
     SAFETY CHECK
  ======================================================= */

  if (!isAdmin) {
    return null;
  }


  /* =======================================================
     ADMIN DASHBOARD
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
              Admin Dashboard
            </h1>

            <p>
              Manage consultations,
              availability and your
              client portal.
            </p>

          </div>


          <div className="admin-header-actions">

            <button
              type="button"
              className="admin-outline-button"
              onClick={() =>
                navigate("/")
              }
            >
              ← Website
            </button>


            <button
              type="button"
              className="btn btn-gold"
              onClick={() =>
                navigate(
                  "/account"
                )
              }
            >
              My Account
            </button>

          </div>

        </header>


        {/* =================================================
            CONTROL CENTER
        ================================================= */}

        <section className="admin-section">

          <div className="admin-section-heading">

            <div>

              <div className="admin-section-kicker">
                CONTROL CENTER
              </div>

              <h2>
                Manage Asterism Astro
              </h2>

            </div>

          </div>


          <div className="admin-grid">


            {/* =================================================
                AVAILABILITY
            ================================================= */}

            <button
              type="button"
              className="admin-feature-card"
              onClick={() =>
                navigate(
                  "/admin/availability"
                )
              }
            >

              <div className="admin-feature-icon">
                ◷
              </div>


              <div>

                <span>
                  AVAILABILITY
                </span>

                <strong>
                  Manage Schedule
                </strong>

                <p>
                  Set your weekly
                  consultation hours
                  and block specific
                  dates.
                </p>

              </div>

            </button>


            {/* =================================================
                CONSULTATIONS
            ================================================= */}

            <button
              type="button"
              className="admin-feature-card"
              onClick={() =>
                navigate(
                  "/admin/consultations"
                )
              }
            >

              <div className="admin-feature-icon">
                ◉
              </div>


              <div>

                <span>
                  CONSULTATIONS
                </span>

                <strong>
                  View Requests
                </strong>

                <p>
                  Review and manage
                  consultation requests
                  from clients.
                </p>

              </div>

            </button>


            {/* =================================================
                CLIENTS
            ================================================= */}

            <button
              type="button"
              className="admin-feature-card"
              onClick={() =>
                navigate(
                  "/account"
                )
              }
            >

              <div className="admin-feature-icon">
                ✧
              </div>


              <div>

                <span>
                  CLIENTS
                </span>

                <strong>
                  Client Accounts
                </strong>

                <p>
                  View the account
                  system and client
                  information.
                </p>

              </div>

            </button>

          </div>

        </section>


        {/* =================================================
            SYSTEM STATUS
        ================================================= */}

        <section className="admin-section">

          <div className="admin-section-heading">

            <div>

              <div className="admin-section-kicker">
                SYSTEM
              </div>

              <h2>
                Current status
              </h2>

            </div>

          </div>


          <div className="admin-status-grid">


            <div className="admin-status-card">

              <span>
                AUTHENTICATION
              </span>

              <strong>
                Active
              </strong>

            </div>


            <div className="admin-status-card">

              <span>
                DATABASE
              </span>

              <strong>
                Connected
              </strong>

            </div>


            <div className="admin-status-card">

              <span>
                ADMIN ACCESS
              </span>

              <strong>
                Enabled
              </strong>

            </div>

          </div>

        </section>


      </div>

    </main>
  );
}