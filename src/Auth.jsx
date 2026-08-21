import React, { useState } from "react";
import { supabase } from "./lib/supabase";

export default function Auth() {
  const [mode, setMode] = useState("login");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isLogin = mode === "login";


  /* =======================================================
     EMAIL LOGIN / SIGNUP
  ======================================================= */

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const cleanEmail = email.trim();

      if (!cleanEmail) {
        throw new Error(
          "Please enter your email address."
        );
      }

      if (!password) {
        throw new Error(
          "Please enter your password."
        );
      }

      if (
        !isLogin &&
        !fullName.trim()
      ) {
        throw new Error(
          "Please enter your full name."
        );
      }


      /* =================================================
         LOGIN
      ================================================= */

      if (isLogin) {
        const {
          error: loginError,
        } =
          await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });

        if (loginError) {
          throw loginError;
        }

        setMessage(
          "Login successful."
        );

        return;
      }


      /* =================================================
         SIGNUP
      ================================================= */

      const {
        data,
        error: signupError,
      } =
        await supabase.auth.signUp({
          email: cleanEmail,
          password,

          options: {
            data: {
              full_name:
                fullName.trim(),
            },

            emailRedirectTo:
              `${window.location.origin}/auth/confirm`,
          },
        });

      if (signupError) {
        throw signupError;
      }


      if (
        data.user &&
        !data.session
      ) {
        setMessage(
          "Account created. Please check your email to confirm your account."
        );
      } else {
        setMessage(
          "Account created successfully."
        );
      }


      setFullName("");
      setEmail("");
      setPassword("");

    } catch (err) {
      console.error(
        "Authentication error:",
        err
      );

      setError(
        err?.message ||
          "Something went wrong. Please try again."
      );

    } finally {
      setLoading(false);
    }
  }


  /* =======================================================
     GOOGLE LOGIN
  ======================================================= */

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setMessage("");
    setError("");

    try {
      const {
        error: googleError,
      } =
        await supabase.auth.signInWithOAuth({
          provider: "google",

          options: {
            redirectTo:
              `${window.location.origin}/account`,
          },
        });

      if (googleError) {
        throw googleError;
      }

    } catch (err) {
      console.error(
        "Google authentication error:",
        err
      );

      setError(
        err?.message ||
          "Unable to continue with Google."
      );

      setGoogleLoading(false);
    }
  }


  /* =======================================================
     SWITCH LOGIN / SIGNUP
  ======================================================= */

  function switchMode() {
    setMode(
      isLogin
        ? "signup"
        : "login"
    );

    setError("");
    setMessage("");
  }


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className="auth-page">

      <div className="auth-card">

        {/* Logo */}

        <div className="auth-mark">
          ✧
        </div>


        {/* Brand */}

        <div className="auth-kicker">
          ASTERISM ASTRO
        </div>


        {/* Heading */}

        <h1>
          {isLogin
            ? "Welcome back"
            : "Create your account"}
        </h1>


        {/* Subtitle */}

        <p className="auth-subtitle">
          {isLogin
            ? "Sign in to access your Asterism Astro account."
            : "Create an account to manage your consultations and readings."}
        </p>


        {/* =================================================
            EMAIL FORM
        ================================================= */}

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >

          {!isLogin && (
            <label>
              Full name

              <input
                type="text"
                value={fullName}
                onChange={(event) =>
                  setFullName(
                    event.target.value
                  )
                }
                placeholder="Your name"
                autoComplete="name"
                disabled={
                  loading ||
                  googleLoading
                }
                required
              />
            </label>
          )}


          <label>
            Email

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              placeholder="you@example.com"
              autoComplete="email"
              disabled={
                loading ||
                googleLoading
              }
              required
            />
          </label>


          <label>
            Password

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              placeholder="••••••••"
              autoComplete={
                isLogin
                  ? "current-password"
                  : "new-password"
              }
              minLength={6}
              disabled={
                loading ||
                googleLoading
              }
              required
            />
          </label>


          <button
            type="submit"
            className="btn btn-gold auth-submit"
            disabled={
              loading ||
              googleLoading
            }
          >
            {loading
              ? "Please wait..."
              : isLogin
              ? "Log In"
              : "Create Account"}
          </button>

        </form>


        {/* =================================================
            DIVIDER
        ================================================= */}

        <div className="auth-divider">
          <span />
          <span className="auth-divider-text">
            OR
          </span>
          <span />
        </div>


        {/* =================================================
            GOOGLE
        ================================================= */}

        <button
          type="button"
          className="google-auth-button"
          onClick={
            handleGoogleLogin
          }
          disabled={
            loading ||
            googleLoading
          }
        >

          <span className="google-icon">
            G
          </span>

          <span>
            {googleLoading
              ? "Connecting..."
              : "Continue with Google"}
          </span>

        </button>


        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div
            className="auth-message auth-error"
            role="alert"
          >
            {error}
          </div>
        )}


        {/* =================================================
            SUCCESS
        ================================================= */}

        {message && (
          <div
            className="auth-message auth-success"
            role="status"
          >
            {message}
          </div>
        )}


        {/* =================================================
            SWITCH
        ================================================= */}

        <div className="auth-switch">

          <span>
            {isLogin
              ? "Don't have an account?"
              : "Already have an account?"}
          </span>

          <button
            type="button"
            onClick={switchMode}
            disabled={
              loading ||
              googleLoading
            }
          >
            {isLogin
              ? "Create one"
              : "Log in"}
          </button>

        </div>

      </div>

    </main>
  );
}