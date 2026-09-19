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


export default function AdminClients({
  session,
}) {

  const navigate = useNavigate();

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    clients,
    setClients,
  ] = useState([]);

  const [
    error,
    setError,
  ] = useState("");


  /* =======================================================
     LOAD CLIENTS
  ======================================================= */

  useEffect(() => {

    let mounted = true;


    async function loadClients() {

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


        /* =================================================
           LOAD CLIENT PROFILES
        ================================================= */

        const {
          data,
          error: profilesError,
        } =
          await supabase
            .from("profiles")
            .select(
              "id, full_name, email, created_at"
            )
            .order(
              "created_at",
              {
                ascending: false,
              }
            );


        if (profilesError) {
          throw profilesError;
        }


        if (!mounted) {
          return;
        }


        setClients(
          data || []
        );


      } catch (loadError) {

        console.error(
          "Admin clients error:",
          loadError
        );


        if (!mounted) {
          return;
        }


        setError(
          loadError?.message ||
          "Unable to load client accounts."
        );


      } finally {

        if (mounted) {
          setLoading(false);
        }

      }

    }


    loadClients();


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
            Loading clients
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
            Unable to load clients
          </h1>

          <p>
            {error}
          </p>

          <button
            type="button"
            className="btn btn-gold"
            onClick={() =>
              navigate(
                "/admin"
              )
            }
          >
            ← Admin Dashboard
          </button>

        </div>

      </main>

    );

  }


  /* =======================================================
     CLIENTS PAGE
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
              Client Accounts
            </h1>

            <p>
              View registered client
              accounts and their information.
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
            CLIENT LIST
        ================================================= */}

        <section className="admin-section">

          <div className="admin-section-heading">

            <div>

              <div className="admin-section-kicker">
                CLIENTS
              </div>

              <h2>
                Registered accounts
              </h2>

            </div>


            <div>

              <span>

                {clients.length} client
                {clients.length === 1
                  ? ""
                  : "s"}

              </span>

            </div>

          </div>


          {clients.length === 0 ? (

            <div className="admin-card">

              <div className="admin-symbol">
                ◌
              </div>

              <h2>
                No clients yet
              </h2>

              <p>
                Registered client accounts
                will appear here.
              </p>

            </div>

          ) : (

            <div className="admin-client-list">

              {clients.map(
                (client) => (

                  <div
                    key={client.id}
                    className="admin-client-card"
                  >


                    <div className="admin-client-avatar">

                      {(
                        client.full_name ||
                        client.email ||
                        "C"
                      )
                        .charAt(0)
                        .toUpperCase()}

                    </div>


                    <div className="admin-client-info">

                      <strong>

                        {client.full_name ||
                          "Unnamed Client"}

                      </strong>


                      <span>

                        {client.email ||
                          "No email available"}

                      </span>


                      {client.created_at && (

                        <small>

                          Joined{" "}

                          {new Date(
                            client.created_at
                          ).toLocaleDateString(
                            "en-IN",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )}

                        </small>

                      )}

                    </div>


                    <button
                      type="button"
                      className="admin-outline-button"
                      onClick={() =>
                        navigate(
                          `/admin/clients/${client.id}`
                        )
                      }
                    >
                      View Details →
                    </button>


                  </div>

                )
              )}

            </div>

          )}

        </section>


      </div>

    </main>

  );

}