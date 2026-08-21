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

export default function AuthConfirm() {
  const navigate = useNavigate();

  const [status, setStatus] =
    useState("confirming");

  const [message, setMessage] =
    useState(
      "Please wait while we confirm your email."
    );

  useEffect(() => {
    let mounted = true;

    async function confirmEmail() {
      try {
        const url =
          new URL(
            window.location.href
          );

        const code =
          url.searchParams.get(
            "code"
          );

        /*
         * Current Supabase email signups may return
         * an Auth Code to the redirect URL during PKCE.
         *
         * Exchange that code for the user's session.
         */
        if (code) {
          const {
            error,
          } =
            await supabase.auth
              .exchangeCodeForSession(
                code
              );

          if (error) {
            throw error;
          }
        }

        /*
         * After exchanging the code, get the
         * resulting authenticated session.
         */
        const {
          data,
          error,
        } =
          await supabase.auth
            .getSession();

        if (error) {
          throw error;
        }

        if (
          !mounted
        ) {
          return;
        }

        if (data.session) {
          setStatus(
            "success"
          );

          setMessage(
            "Your email has been confirmed successfully."
          );

          window.setTimeout(
            () => {
              if (mounted) {
                navigate(
                  "/account",
                  {
                    replace: true,
                  }
                );
              }
            },
            1200
          );

          return;
        }

        /*
         * Some confirmation links can return
         * authentication information in the hash.
         * Give Supabase a moment to process it.
         */
        await new Promise(
          (resolve) =>
            window.setTimeout(
              resolve,
              700
            )
        );

        const {
          data:
            retryData,
          error:
            retryError,
        } =
          await supabase.auth
            .getSession();

        if (retryError) {
          throw retryError;
        }

        if (
          !mounted
        ) {
          return;
        }

        if (
          retryData.session
        ) {
          setStatus(
            "success"
          );

          setMessage(
            "Your email has been confirmed successfully."
          );

          window.setTimeout(
            () => {
              if (mounted) {
                navigate(
                  "/account",
                  {
                    replace: true,
                  }
                );
              }
            },
            1200
          );

          return;
        }

        throw new Error(
          "No authenticated session was created."
        );

      } catch (error) {
        console.error(
          "Email confirmation error:",
          error
        );

        if (
          !mounted
        ) {
          return;
        }

        setStatus(
          "error"
        );

        setMessage(
          error?.message ||
            "We could not confirm your email."
        );
      }
    }

    confirmEmail();

    return () => {
      mounted = false;
    };
  }, [
    navigate,
  ]);


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className="auth-page">

      <div className="auth-card">

        <div className="auth-mark">
          ✧
        </div>

        <div className="auth-kicker">
          ASTERISM ASTRO
        </div>


        {status ===
          "confirming" && (
          <>
            <h1>
              Confirming your email
            </h1>

            <p className="auth-subtitle">
              {message}
            </p>
          </>
        )}


        {status ===
          "success" && (
          <>
            <h1>
              Email confirmed
            </h1>

            <p className="auth-subtitle">
              {message}
            </p>

            <div className="auth-message auth-success">
              Taking you to your account...
            </div>
          </>
        )}


        {status ===
          "error" && (
          <>
            <h1>
              Confirmation issue
            </h1>

            <p className="auth-subtitle">
              {message}
            </p>

            <button
              type="button"
              className="btn btn-gold auth-submit"
              onClick={() =>
                navigate(
                  "/login"
                )
              }
            >
              Back to Login
            </button>
          </>
        )}

      </div>

    </main>
  );
}