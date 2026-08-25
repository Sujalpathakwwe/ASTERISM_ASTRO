import React, {
  useEffect,
  useState,
} from "react";

import {
  createRoot,
} from "react-dom/client";

import {
  BrowserRouter,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { pages } from "./pages";

import Auth from "./Auth.jsx";
import AuthConfirm from "./AuthConfirm.jsx";
import Booking from "./Booking.jsx";
import AdminDashboard from "./AdminDashboard.jsx";
import AdminAvailability from "./AdminAvailability.jsx";
import AdminConsultations from "./AdminConsultations.jsx";
import ZodiacWheel from "./ZodiacWheel.jsx";

import { supabase } from "./lib/supabase";

import "./styles.css";


/* =========================================================
   STATIC PAGES
========================================================= */

const files = new Set(
  Object.keys(pages)
);


/* =========================================================
   PATH HELPERS
========================================================= */

function normalizePath(pathname) {
  if (!pathname) {
    return "/";
  }

  const value =
    pathname.replace(
      /\/+$/,
      ""
    );

  return value || "/";
}


function getPageFile(pathname) {
  const path =
    normalizePath(pathname).replace(
      /^\/+/,
      ""
    );

  if (
    path === "" ||
    path === "index.html"
  ) {
    return "index.html";
  }

  if (files.has(path)) {
    return path;
  }

  if (
    files.has(`${path}.html`)
  ) {
    return `${path}.html`;
  }

  return "index.html";
}


/* =========================================================
   HELPERS
========================================================= */

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
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


/* =========================================================
   PASSWORD INPUT
========================================================= */

function PasswordInput({
  value,
  onChange,
  placeholder,
  disabled,
  autoComplete,
}) {
  const [
    visible,
    setVisible,
  ] = useState(false);

  return (
    <div className="password-input-wrap">

      <input
        type={
          visible
            ? "text"
            : "password"
        }
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
      />

      <button
        type="button"
        className="password-visibility-button"
        onClick={() =>
          setVisible(
            (current) =>
              !current
          )
        }
        disabled={disabled}
        aria-label={
          visible
            ? "Hide password"
            : "Show password"
        }
      >
        {visible ? "Hide" : "Show"}
      </button>

    </div>
  );
}


/* =========================================================
   ACCOUNT PAGE
========================================================= */

function AccountPage({
  session,
}) {
  const navigate =
    useNavigate();

  const [
    profile,
    setProfile,
  ] = useState(null);

  const [
    consultations,
    setConsultations,
  ] = useState([]);

  const [
    savedReadings,
    setSavedReadings,
  ] = useState([]);

  const [
    isAdmin,
    setIsAdmin,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    editingProfile,
    setEditingProfile,
  ] = useState(false);

  const [
    profileName,
    setProfileName,
  ] = useState("");

  const [
    profileSaving,
    setProfileSaving,
  ] = useState(false);

  const [
    profileMessage,
    setProfileMessage,
  ] = useState("");

  const [
    profileError,
    setProfileError,
  ] = useState("");

  const [
    changingPassword,
    setChangingPassword,
  ] = useState(false);

  const [
    newPassword,
    setNewPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    passwordSaving,
    setPasswordSaving,
  ] = useState(false);

  const [
    passwordMessage,
    setPasswordMessage,
  ] = useState("");

  const [
    passwordError,
    setPasswordError,
  ] = useState("");

  const [
    signingOut,
    setSigningOut,
  ] = useState(false);


  const hasEmailIdentity =
    Array.isArray(
      session?.user?.identities
    )
      ? session.user.identities.some(
          (identity) =>
            identity.provider ===
            "email"
        )
      : true;


  /* =======================================================
     LOAD ACCOUNT
  ======================================================= */

  useEffect(() => {

    let mounted = true;

    async function loadAccountData() {

      setLoading(true);
      setError("");

      try {

        const userId =
          session?.user?.id;

        if (!userId) {
          throw new Error(
            "No authenticated user found."
          );
        }


        const {
          data: profileData,
          error: profileError,
        } =
          await supabase
            .from("profiles")
            .select(
              "id, full_name, email, created_at, is_admin"
            )
            .eq(
              "id",
              userId
            )
            .maybeSingle();


        if (profileError) {
          throw profileError;
        }


        const {
          data: consultationData,
          error: consultationError,
        } =
          await supabase
            .from("consultations")
            .select(
              "id, service_name, status, scheduled_at, preferred_date, notes, consultation_message, created_at"
            )
            .eq(
              "user_id",
              userId
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


        const {
          data: readingData,
          error: readingError,
        } =
          await supabase
            .from("saved_readings")
            .select(
              "id, title, reading_type, content, created_at"
            )
            .eq(
              "user_id",
              userId
            )
            .order(
              "created_at",
              {
                ascending: false,
              }
            );


        if (readingError) {
          throw readingError;
        }


        if (!mounted) {
          return;
        }


        setProfile(
          profileData
        );

        setIsAdmin(
          profileData?.is_admin === true
        );

        setConsultations(
          consultationData || []
        );

        setSavedReadings(
          readingData || []
        );

        setProfileName(
          profileData?.full_name ||
          session?.user?.user_metadata
            ?.full_name ||
          ""
        );

      } catch (loadError) {

        console.error(
          "Account data error:",
          loadError
        );

        if (!mounted) {
          return;
        }

        setError(
          loadError?.message ||
          "Unable to load your account data."
        );

      } finally {

        if (mounted) {
          setLoading(false);
        }
      }
    }


    loadAccountData();


    return () => {
      mounted = false;
    };

  }, [session]);


  /* =======================================================
     PROFILE
  ======================================================= */

  function startProfileEdit() {

    setEditingProfile(true);

    setProfileName(
      profile?.full_name ||
      session?.user?.user_metadata
        ?.full_name ||
      ""
    );

    setProfileMessage("");
    setProfileError("");
  }


  function cancelProfileEdit() {

    setEditingProfile(false);

    setProfileName(
      profile?.full_name ||
      session?.user?.user_metadata
        ?.full_name ||
      ""
    );

    setProfileMessage("");
    setProfileError("");
  }


  async function saveProfile() {

    const cleanName =
      profileName.trim();

    setProfileMessage("");
    setProfileError("");


    if (!cleanName) {

      setProfileError(
        "Please enter your name."
      );

      return;
    }


    setProfileSaving(true);


    try {

      const {
        data,
        error: updateError,
      } =
        await supabase
          .from("profiles")
          .update({
            full_name:
              cleanName,
          })
          .eq(
            "id",
            session.user.id
          )
          .select(
            "id, full_name, email, created_at, is_admin"
          )
          .single();


      if (updateError) {
        throw updateError;
      }


      setProfile(
        data
      );

      setIsAdmin(
        data?.is_admin === true
      );

      setProfileName(
        data.full_name || ""
      );

      setProfileMessage(
        "Profile updated successfully."
      );

      setEditingProfile(
        false
      );

    } catch (updateError) {

      console.error(
        "Profile update error:",
        updateError
      );

      setProfileError(
        updateError?.message ||
        "Unable to update your profile."
      );

    } finally {

      setProfileSaving(false);
    }
  }


  /* =======================================================
     PASSWORD
  ======================================================= */

  function startPasswordChange() {

    setChangingPassword(true);

    setNewPassword("");
    setConfirmPassword("");

    setPasswordMessage("");
    setPasswordError("");
  }


  function cancelPasswordChange() {

    setChangingPassword(false);

    setNewPassword("");
    setConfirmPassword("");

    setPasswordMessage("");
    setPasswordError("");
  }


  async function saveNewPassword() {

    setPasswordMessage("");
    setPasswordError("");


    if (!newPassword) {

      setPasswordError(
        "Please enter a new password."
      );

      return;
    }


    if (
      newPassword.length < 8
    ) {

      setPasswordError(
        "Your password must be at least 8 characters."
      );

      return;
    }


    if (
      newPassword !==
      confirmPassword
    ) {

      setPasswordError(
        "The passwords do not match."
      );

      return;
    }


    setPasswordSaving(true);


    try {

      const {
        error: updateError,
      } =
        await supabase.auth
          .updateUser({
            password:
              newPassword,
          });


      if (updateError) {
        throw updateError;
      }


      setPasswordMessage(
        "Your password has been updated successfully."
      );

      setNewPassword("");
      setConfirmPassword("");

      setChangingPassword(
        false
      );

    } catch (updateError) {

      console.error(
        "Password update error:",
        updateError
      );

      setPasswordError(
        updateError?.message ||
        "Unable to update your password."
      );

    } finally {

      setPasswordSaving(false);
    }
  }


  /* =======================================================
     LOGOUT
  ======================================================= */

  async function handleSignOut() {

    setSigningOut(true);


    const {
      error: signOutError,
    } =
      await supabase.auth
        .signOut();


    if (signOutError) {

      setSigningOut(false);

      setError(
        signOutError.message ||
        "Unable to sign out."
      );

      return;
    }


    navigate(
      "/",
      {
        replace: true,
      }
    );
  }


  const userEmail =
    session?.user?.email || "";

  const userMetadata =
    session?.user?.user_metadata ||
    {};

  const displayName =
    profile?.full_name ||
    userMetadata.full_name ||
    "Your Account";

  const displayEmail =
    profile?.email ||
    userEmail;


  if (loading) {

    return (
      <main className="account-page">

        <div className="account-card">

          <div className="auth-mark">
            ✧
          </div>

          <div className="auth-kicker">
            ASTERISM ASTRO
          </div>

          <h1>
            Loading account
          </h1>

          <p className="auth-subtitle">
            Please wait while we load
            your account information.
          </p>

        </div>

      </main>
    );
  }


  return (
    <main className="account-page">

      <div className="account-dashboard">

        <div className="account-dashboard-header">

          <div>

            <div className="auth-kicker">
              ASTERISM ASTRO
            </div>

            <h1>
              My Account
            </h1>

            <p className="account-welcome">
              Welcome, {displayName}.
            </p>

          </div>


          <button
            type="button"
            className="account-back"
            onClick={() =>
              navigate("/")
            }
          >
            ← Home
          </button>

        </div>


        <div className="account-stats">

          <div className="account-stat">

            <span className="account-stat-label">
              CONSULTATIONS
            </span>

            <strong className="account-stat-value">
              {consultations.length}
            </strong>

            <span className="account-stat-sub">
              {consultations.length === 1
                ? "consultation"
                : "consultations"}
            </span>

          </div>


          <div className="account-stat">

            <span className="account-stat-label">
              SAVED READINGS
            </span>

            <strong className="account-stat-value">
              {savedReadings.length}
            </strong>

            <span className="account-stat-sub">
              {savedReadings.length === 1
                ? "saved reading"
                : "saved readings"}
            </span>

          </div>


          <div className="account-stat">

            <span className="account-stat-label">
              ACCOUNT
            </span>

            <strong className="account-stat-value">
              ✓
            </strong>

            <span className="account-stat-sub">
              Active
            </span>

          </div>

        </div>


        {error && (
          <div
            className="auth-message auth-error"
            role="alert"
          >
            {error}
          </div>
        )}


        <section className="account-section">

          <div className="account-section-heading">

            <div>

              <div className="account-section-kicker">
                PROFILE
              </div>

              <h2>
                Your details
              </h2>

            </div>


            {!editingProfile && (
              <button
                type="button"
                className="account-edit-button"
                onClick={
                  startProfileEdit
                }
              >
                Edit Profile
              </button>
            )}

          </div>


          {editingProfile ? (

            <div className="account-profile-edit">

              <label className="account-edit-field">

                <span>
                  Full name
                </span>

                <input
                  type="text"
                  value={
                    profileName
                  }
                  onChange={(
                    event
                  ) =>
                    setProfileName(
                      event.target.value
                    )
                  }
                  disabled={
                    profileSaving
                  }
                />

              </label>


              <div className="account-profile-readonly">

                <span>
                  Email
                </span>

                <strong>
                  {displayEmail}
                </strong>

              </div>


              <div className="account-edit-actions">

                <button
                  type="button"
                  className="btn btn-gold"
                  onClick={
                    saveProfile
                  }
                  disabled={
                    profileSaving
                  }
                >
                  {profileSaving
                    ? "Saving..."
                    : "Save Changes"}
                </button>


                <button
                  type="button"
                  className="account-cancel-button"
                  onClick={
                    cancelProfileEdit
                  }
                  disabled={
                    profileSaving
                  }
                >
                  Cancel
                </button>

              </div>


              {profileError && (
                <div
                  className="auth-message auth-error"
                  role="alert"
                >
                  {profileError}
                </div>
              )}

            </div>

          ) : (

            <div className="account-profile-grid">

              <div className="account-profile-item">

                <span>
                  Full name
                </span>

                <strong>
                  {displayName}
                </strong>

              </div>


              <div className="account-profile-item">

                <span>
                  Email
                </span>

                <strong>
                  {displayEmail}
                </strong>

              </div>


              <div className="account-profile-item">

                <span>
                  Member since
                </span>

                <strong>
                  {formatDate(
                    profile?.created_at ||
                    session?.user?.created_at
                  )}
                </strong>

              </div>


              <div className="account-profile-item">

                <span>
                  Account status
                </span>

                <strong>
                  Active
                </strong>

              </div>

            </div>
          )}


          {profileMessage &&
            !editingProfile && (
              <div
                className="auth-message auth-success"
                role="status"
              >
                {profileMessage}
              </div>
            )}

        </section>


        <section className="account-section">

          <div className="account-section-heading">

            <div>

              <div className="account-section-kicker">
                CONSULTATIONS
              </div>

              <h2>
                My consultations
              </h2>

            </div>

          </div>


          {consultations.length === 0 ? (

            <div className="account-empty-card">

              <div className="account-empty-symbol">
                ✦
              </div>

              <h3>
                No consultations yet
              </h3>

              <p>
                Your consultation requests
                will appear here.
              </p>

              <button
                type="button"
                className="btn btn-gold"
                onClick={() =>
                  navigate(
                    "/book-consultation"
                  )
                }
              >
                Book a Consultation
              </button>

            </div>

          ) : (

            <div className="account-record-list">

              {consultations.map(
                (consultation) => (

                  <article
                    key={
                      consultation.id
                    }
                    className="account-record-card"
                  >

                    <div className="account-record-main">

                      <div className="account-record-kicker">
                        CONSULTATION
                      </div>

                      <h3>
                        {
                          consultation.service_name
                        }
                      </h3>

                      {(
                        consultation.consultation_message ||
                        consultation.notes
                      ) && (
                        <p>
                          {
                            consultation.consultation_message ||
                            consultation.notes
                          }
                        </p>
                      )}

                    </div>


                    <div className="account-record-meta">

                      <span
                        className={
                          `account-status account-status-${consultation.status}`
                        }
                      >
                        {formatStatus(
                          consultation.status
                        )}
                      </span>

                      <span>
                        {consultation.preferred_date
                          ? formatDate(
                              consultation.preferred_date
                            )
                          : consultation.scheduled_at
                          ? formatDate(
                              consultation.scheduled_at
                            )
                          : "Date to be arranged"}
                      </span>

                    </div>

                  </article>

                )
              )}

            </div>

          )}

        </section>


        <section className="account-section">

          <div className="account-section-heading">

            <div>

              <div className="account-section-kicker">
                SAVED READINGS
              </div>

              <h2>
                Your saved readings
              </h2>

            </div>

          </div>


          {savedReadings.length === 0 ? (

            <div className="account-empty-card">

              <div className="account-empty-symbol">
                ✧
              </div>

              <h3>
                No saved readings yet
              </h3>

              <p>
                Readings you choose to save
                will appear here.
              </p>

            </div>

          ) : (

            <div className="account-record-list">

              {savedReadings.map(
                (reading) => (

                  <article
                    key={
                      reading.id
                    }
                    className="account-record-card account-reading-card"
                  >

                    <div className="account-record-main">

                      <div className="account-record-kicker">
                        {
                          reading.reading_type ||
                          "READING"
                        }
                      </div>

                      <h3>
                        {
                          reading.title
                        }
                      </h3>

                      {reading.content && (
                        <p>
                          {
                            reading.content
                          }
                        </p>
                      )}

                    </div>


                    <div className="account-record-meta">

                      <span>
                        {
                          formatDate(
                            reading.created_at
                          )
                        }
                      </span>

                    </div>

                  </article>

                )
              )}

            </div>

          )}

        </section>


        <section className="account-section">

          <div className="account-section-heading">

            <div>

              <div className="account-section-kicker">
                ACCOUNT
              </div>

              <h2>
                Account settings
              </h2>

            </div>

          </div>


          <div className="account-settings-grid">

            <div className="account-setting-card">

              <strong>
                Email address
              </strong>

              <p>
                {displayEmail}
              </p>

            </div>


            <div className="account-setting-card">

              <strong>
                Password
              </strong>


              {hasEmailIdentity ? (

                changingPassword ? (

                  <div className="account-password-editor">

                    <label className="account-edit-field">

                      <span>
                        New password
                      </span>

                      <PasswordInput
                        value={
                          newPassword
                        }
                        onChange={(
                          event
                        ) =>
                          setNewPassword(
                            event.target.value
                          )
                        }
                        placeholder="At least 8 characters"
                        disabled={
                          passwordSaving
                        }
                        autoComplete="new-password"
                      />

                    </label>


                    <label
                      className="account-edit-field"
                      style={{
                        marginTop:
                          "15px",
                      }}
                    >

                      <span>
                        Confirm password
                      </span>

                      <PasswordInput
                        value={
                          confirmPassword
                        }
                        onChange={(
                          event
                        ) =>
                          setConfirmPassword(
                            event.target.value
                          )
                        }
                        placeholder="Enter password again"
                        disabled={
                          passwordSaving
                        }
                        autoComplete="new-password"
                      />

                    </label>


                    <div className="account-password-actions">

                      <button
                        type="button"
                        className="btn btn-gold"
                        onClick={
                          saveNewPassword
                        }
                        disabled={
                          passwordSaving
                        }
                      >
                        {passwordSaving
                          ? "Updating..."
                          : "Update Password"}
                      </button>


                      <button
                        type="button"
                        className="account-cancel-button"
                        onClick={
                          cancelPasswordChange
                        }
                        disabled={
                          passwordSaving
                        }
                      >
                        Cancel
                      </button>

                    </div>


                    {passwordError && (
                      <div
                        className="auth-message auth-error"
                        role="alert"
                      >
                        {passwordError}
                      </div>
                    )}

                  </div>

                ) : (

                  <>
                    <p>
                      Update your password
                      securely from your
                      account.
                    </p>

                    <button
                      type="button"
                      className="account-text-button"
                      onClick={
                        startPasswordChange
                      }
                    >
                      Change password →
                    </button>


                    {passwordMessage && (
                      <div
                        className="auth-message auth-success"
                        role="status"
                      >
                        {
                          passwordMessage
                        }
                      </div>
                    )}

                  </>

                )

              ) : (

                <p>
                  Your account uses
                  Google sign-in.
                  Password management
                  isn't required.
                </p>

              )}

            </div>

          </div>

        </section>


        {isAdmin && (

          <section className="account-section">

            <div className="account-section-heading">

              <div>

                <div className="account-section-kicker">
                  ADMINISTRATION
                </div>

                <h2>
                  Asterism Astro Admin
                </h2>

              </div>

            </div>


            <div className="account-admin-card">

              <div className="account-admin-icon">
                ✦
              </div>


              <div className="account-admin-content">

                <strong>
                  Admin Dashboard
                </strong>

                <p>
                  Manage your availability,
                  blocked dates and
                  consultation requests
                  from one place.
                </p>

              </div>


              <button
                type="button"
                className="account-admin-button"
                onClick={() =>
                  navigate(
                    "/admin"
                  )
                }
              >
                Open Admin →
              </button>

            </div>

          </section>

        )}


        <div className="account-logout-area">

          <button
            type="button"
            className="account-logout-button"
            onClick={
              handleSignOut
            }
            disabled={
              signingOut
            }
          >
            {signingOut
              ? "Signing out..."
              : "Log Out"}
          </button>

        </div>

      </div>

    </main>
  );
}


/* =========================================================
   APP
========================================================= */

function App() {

  const location =
    useLocation();

  const navigate =
    useNavigate();


  const [
    html,
    setHtml,
  ] = useState("");

  const [
    menuOpen,
    setMenuOpen,
  ] = useState(false);

  const [
    session,
    setSession,
  ] = useState(null);

  const [
    sessionLoading,
    setSessionLoading,
  ] = useState(true);


  const currentPath =
    normalizePath(
      location.pathname
    );


  /* =======================================================
     ROUTES
  ======================================================= */

  const isLoginPage =
    currentPath ===
    "/login";

  const isAuthConfirmPage =
    currentPath ===
    "/auth/confirm";

  const isBookingPage =
    currentPath ===
    "/book-consultation";

  const isAccountPage =
    currentPath ===
    "/account";

  const isAdminPage =
    currentPath ===
    "/admin";

  const isAdminAvailabilityPage =
    currentPath ===
    "/admin/availability";

  const isAdminConsultationsPage =
    currentPath ===
    "/admin/consultations";


  const isReactOnlyPage =
    isLoginPage ||
    isAuthConfirmPage ||
    isBookingPage ||
    isAccountPage ||
    isAdminPage ||
    isAdminAvailabilityPage ||
    isAdminConsultationsPage;


  /* =======================================================
     AUTH SESSION
  ======================================================= */

  useEffect(() => {

    let mounted = true;


    async function loadSession() {

      const {
        data,
        error,
      } =
        await supabase.auth
          .getSession();


      if (!mounted) {
        return;
      }


      if (error) {

        console.error(
          "Supabase session error:",
          error
        );

        setSession(null);

      } else {

        setSession(
          data.session
        );
      }


      setSessionLoading(
        false
      );
    }


    loadSession();


    const {
      data: listener,
    } =
      supabase.auth.onAuthStateChange(
        (
          _event,
          nextSession
        ) => {

          if (!mounted) {
            return;
          }


          setSession(
            nextSession
          );

          setSessionLoading(
            false
          );
        }
      );
    const desktopAccountLink =
  document.querySelector(
    ".session-account-link"
  );

if (desktopAccountLink) {

  if (nextSession) {

    desktopAccountLink.href =
      "/account";

    desktopAccountLink.textContent =
      "My Account";

  } else {

    desktopAccountLink.href =
      "/login";

    desktopAccountLink.textContent =
      "Log In";
  }
}

    return () => {

      mounted = false;

      listener
        ?.subscription
        ?.unsubscribe();

    };

  }, []);


  /* =======================================================
     PROTECT ACCOUNT
  ======================================================= */

  useEffect(() => {

    if (sessionLoading) {
      return;
    }


    if (
      isAccountPage &&
      !session
    ) {

      navigate(
        "/login",
        {
          replace: true,
        }
      );
    }

  }, [
    isAccountPage,
    session,
    sessionLoading,
    navigate,
  ]);


  /* =======================================================
     PROTECT ADMIN
  ======================================================= */

  useEffect(() => {

    if (
      !isAdminPage &&
      !isAdminAvailabilityPage &&
      !isAdminConsultationsPage
    ) {
      return;
    }


    if (sessionLoading) {
      return;
    }


    if (!session) {

      navigate(
        "/login",
        {
          replace: true,
        }
      );
    }

  }, [
    isAdminPage,
    isAdminAvailabilityPage,
    isAdminConsultationsPage,
    session,
    sessionLoading,
    navigate,
  ]);


  /* =======================================================
     LOAD STATIC PAGE
     
     IMPORTANT:
     session is intentionally NOT in the dependencies.
  ======================================================= */

  useEffect(() => {

    if (isReactOnlyPage) {

      setHtml("");
      setMenuOpen(false);


      window.scrollTo(
        0,
        0
      );


      if (isLoginPage) {
        document.title =
          "Log In — Asterism Astro";
      }

      if (isAuthConfirmPage) {
        document.title =
          "Confirm Email — Asterism Astro";
      }

      if (isBookingPage) {
        document.title =
          "Book a Consultation — Asterism Astro";
      }

      if (isAccountPage) {
        document.title =
          "My Account — Asterism Astro";
      }

      if (isAdminPage) {
        document.title =
          "Admin Dashboard — Asterism Astro";
      }

      if (isAdminAvailabilityPage) {
        document.title =
          "Availability — Asterism Astro";
      }

      if (isAdminConsultationsPage) {
        document.title =
          "Consultations — Asterism Astro";
      }

      return;
    }


    const file =
      getPageFile(
        currentPath
      );


    const source =
      pages[file];


    if (!source) {

      setHtml("");

      return;
    }


    const doc =
      new DOMParser()
        .parseFromString(
          source,
          "text/html"
        );


    document.title =
      doc.title ||
      "Asterism Astro";


    /* =====================================================
       ACCOUNT / LOGIN LINK
    ===================================================== */

    const actions =
      doc.querySelector(
        ".actions"
      );


    if (actions) {

      const existing =
        actions.querySelector(
          ".session-account-link"
        );


      if (existing) {
        existing.remove();
      }


      const accountLink =
        doc.createElement(
          "a"
        );


      accountLink.className =
        "session-account-link";

      accountLink.href =
        "/login";

      accountLink.textContent =
        "Log In";


      const themeButton =
        actions.querySelector(
          "[data-theme-toggle]"
        );


      if (themeButton) {

        actions.insertBefore(
          accountLink,
          themeButton
        );

      } else {

        actions.prepend(
          accountLink
        );
      }
    }


    /* =====================================================
       ALL BOOK CONSULTATION LINKS
    ===================================================== */

    doc
      .querySelectorAll(
        "a"
      )
      .forEach(
        (anchor) => {

          const text =
            anchor.textContent
              ?.trim()
              .toLowerCase();


          if (
            text ===
              "book a consultation" ||
            text ===
              "book consultation" ||
            text.includes(
              "book a consultation"
            )
          ) {

            anchor.setAttribute(
              "href",
              "/book-consultation"
            );

            anchor.setAttribute(
              "data-book-consultation",
              ""
            );
          }
        }
      );


    /* =====================================================
       HOME PAGE
    ===================================================== */

    if (
      file ===
      "index.html"
    ) {

      const stats =
        doc.querySelector(
          ".stats"
        );


      if (stats) {

        const wheelSection =
          doc.createElement(
            "section"
          );


        wheelSection.className =
          "zodiac-wheel-section";


        wheelSection.innerHTML = `
          <div id="zodiac-wheel-root"></div>
        `;


        stats.parentNode.insertBefore(
          wheelSection,
          stats.nextSibling
        );
      }


      const footer =
        doc.querySelector(
          "footer"
        );


      if (footer) {

        const cta =
          doc.createElement(
            "section"
          );


        cta.className =
          "consultation-cta";


        cta.innerHTML = `
          <div class="container">
            <div class="consultation-cta-inner">

              <div class="consultation-cta-orbit">
                ✦
              </div>

              <div class="consultation-cta-kicker">
                ASTERISM ASTRO
              </div>

              <h2>
                Start with the question
                you actually have.
              </h2>

              <p>
                A thoughtful consultation can help
                you explore the patterns, timing and
                circumstances behind what you are
                trying to understand.
              </p>

              <div class="consultation-cta-actions">

                <a
                  href="/book-consultation"
                  data-book-consultation
                  class="btn btn-gold"
                >
                  Book a Consultation
                </a>

                <a
                  href="services.html"
                  class="consultation-cta-link"
                >
                  Explore Services
                  <span>→</span>
                </a>

              </div>

            </div>
          </div>
        `;


        footer.parentNode.insertBefore(
          cta,
          footer
        );
      }
    }


    setHtml(
      doc.body?.innerHTML ||
      ""
    );


    setMenuOpen(false);


    window.scrollTo(
      0,
      0
    );

  }, [
    currentPath,
    isReactOnlyPage,
  ]);


  /* =======================================================
     UPDATE ACCOUNT LINK
     
     This changes only the link itself.
     It does NOT rebuild homepage HTML.
  ======================================================= */

  useEffect(() => {

    if (
      isReactOnlyPage
    ) {
      return;
    }


    const accountLink =
      document.querySelector(
        ".session-account-link"
      );


    if (!accountLink) {
      return;
    }


    if (session) {

      accountLink.href =
        "/account";

      accountLink.textContent =
        "My Account";

    } else {

      accountLink.href =
        "/login";

      accountLink.textContent =
        "Log In";
    }

  }, [
    session,
    isReactOnlyPage,
    currentPath,
  ]);


  /* =======================================================
     ZODIAC WHEEL
  ======================================================= */

  useEffect(() => {

    if (
      isReactOnlyPage ||
      currentPath !== "/"
    ) {
      return;
    }


    const element =
      document.getElementById(
        "zodiac-wheel-root"
      );


    if (!element) {
      return;
    }


    element.style.width =
      "100%";

    element.style.display =
      "block";

    element.style.position =
      "relative";

    element.style.overflow =
      "visible";


    const wheelRoot =
      createRoot(
        element
      );


    wheelRoot.render(
      <ZodiacWheel />
    );


    return () => {

      wheelRoot.unmount();

    };

  }, [
    html,
    currentPath,
    isReactOnlyPage,
  ]);


  /* =======================================================
     THEME
  ======================================================= */

  function applyTheme(
    theme
  ) {

    const safeTheme =
      theme === "light"
        ? "light"
        : "dark";


    document.documentElement
      .setAttribute(
        "data-theme",
        safeTheme
      );


    document.documentElement
      .classList.toggle(
        "light-mode",
        safeTheme === "light"
      );


    document.documentElement
      .classList.toggle(
        "dark-mode",
        safeTheme === "dark"
      );


    if (document.body) {

      document.body.classList.toggle(
        "light-mode",
        safeTheme === "light"
      );

      document.body.classList.toggle(
        "dark-mode",
        safeTheme === "dark"
      );
    }


    document
      .querySelectorAll(
        "[data-theme-toggle]"
      )
      .forEach(
        (button) => {

          button.textContent =
            safeTheme === "light"
              ? "☾"
              : "☼";


          button.setAttribute(
            "aria-pressed",
            safeTheme === "light"
              ? "true"
              : "false"
          );


          button.setAttribute(
            "title",
            safeTheme === "light"
              ? "Switch to dark mode"
              : "Switch to light mode"
          );
        }
      );


    localStorage.setItem(
      "asterism-theme",
      safeTheme
    );
  }


  useEffect(() => {

    const saved =
      localStorage.getItem(
        "asterism-theme"
      );


    applyTheme(
      saved === "light"
        ? "light"
        : "dark"
    );

  }, [
    currentPath,
  ]);


  /* =======================================================
     GLOBAL CLICK HANDLER
  ======================================================= */

  useEffect(() => {

    function handleClick(event) {

      const target =
        event.target;


      if (
        !(target instanceof Element)
      ) {
        return;
      }


      /* THEME */

      const themeButton =
        target.closest(
          "[data-theme-toggle]"
        );


      if (themeButton) {

        event.preventDefault();
        event.stopPropagation();


        const current =
          document.documentElement
            .getAttribute(
              "data-theme"
            );


        applyTheme(
          current === "light"
            ? "dark"
            : "light"
        );


        return;
      }


      /* MOBILE MENU */

      const menuButton =
        target.closest(
          ".mobile-menu"
        );


      if (menuButton) {

        event.preventDefault();
        event.stopPropagation();


        setMenuOpen(
          (open) => !open
        );


        return;
      }


      /* BOOKING */

      const bookingButton =
        target.closest(
          "[data-book-consultation]"
        );


      if (bookingButton) {

        event.preventDefault();
        event.stopPropagation();


        setMenuOpen(false);


        navigate(
          session
            ? "/book-consultation"
            : "/login"
        );


        return;
      }


      /* MOBILE ROUTES */

      const mobileLink =
        target.closest(
          "[data-mobile-route]"
        );


      if (mobileLink) {

        event.preventDefault();
        event.stopPropagation();


        const route =
          mobileLink.getAttribute(
            "data-mobile-route"
          );


        setMenuOpen(false);


        navigate(
          route
        );


        return;
      }


      /* NORMAL LINK */

      const anchor =
        target.closest(
          "a[href]"
        );


      if (!anchor) {
        return;
      }


      const href =
        anchor.getAttribute(
          "href"
        );


      if (!href) {
        return;
      }


      if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("http://") ||
        href.startsWith("https://")
      ) {
        return;
      }


      /* LOGIN */

      if (
        href === "/login" ||
        href === "login" ||
        href === "login.html"
      ) {

        event.preventDefault();
        event.stopPropagation();

        setMenuOpen(false);

        navigate(
          "/login"
        );

        return;
      }


      /* ACCOUNT */

      if (
        href === "/account"
      ) {

        event.preventDefault();
        event.stopPropagation();

        setMenuOpen(false);

        navigate(
          session
            ? "/account"
            : "/login"
        );

        return;
      }


      /* BOOKING */

      if (
        href === "/book-consultation"
      ) {

        event.preventDefault();
        event.stopPropagation();

        setMenuOpen(false);

        navigate(
          session
            ? "/book-consultation"
            : "/login"
        );

        return;
      }


      /* ADMIN */

      if (
        href === "/admin"
      ) {

        event.preventDefault();
        event.stopPropagation();

        setMenuOpen(false);

        navigate(
          "/admin"
        );

        return;
      }


      /* ADMIN AVAILABILITY */

      if (
        href ===
        "/admin/availability"
      ) {

        event.preventDefault();
        event.stopPropagation();

        setMenuOpen(false);

        navigate(
          "/admin/availability"
        );

        return;
      }


      /* ADMIN CONSULTATIONS */

      if (
        href ===
        "/admin/consultations"
      ) {

        event.preventDefault();
        event.stopPropagation();

        setMenuOpen(false);

        navigate(
          "/admin/consultations"
        );

        return;
      }


      /* AUTH CONFIRM */

      if (
        href ===
        "/auth/confirm"
      ) {

        event.preventDefault();
        event.stopPropagation();

        navigate(
          "/auth/confirm"
        );

        return;
      }


      /* STATIC ROUTES */

      let route =
        null;


      if (
        href === "/" ||
        href === "index.html"
      ) {

        route = "/";

      } else {

        const clean =
          href
            .replace(
              /^\//,
              ""
            )
            .replace(
              /\.html$/,
              ""
            );


        if (
          files.has(
            `${clean}.html`
          )
        ) {

          route =
            `/${clean}`;
        }
      }


      if (!route) {
        return;
      }


      event.preventDefault();
      event.stopPropagation();


      setMenuOpen(false);


      navigate(
        route
      );
    }


    document.addEventListener(
      "click",
      handleClick,
      true
    );


    return () => {

      document.removeEventListener(
        "click",
        handleClick,
        true
      );

    };

  }, [
    navigate,
    session,
  ]);


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>

      {isLoginPage ? (

        <Auth />

      ) : isAuthConfirmPage ? (

        <AuthConfirm />

      ) : isBookingPage ? (

        sessionLoading ? (

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
                  Please wait...
                </p>

              </div>

            </div>

          </main>

        ) : session ? (

          <Booking />

        ) : null

      ) : isAdminConsultationsPage ? (

        sessionLoading ? (

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

        ) : session ? (

          <AdminConsultations
            session={
              session
            }
          />

        ) : null

      ) : isAdminAvailabilityPage ? (

        sessionLoading ? (

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

        ) : session ? (

          <AdminAvailability
            session={
              session
            }
          />

        ) : null

      ) : isAdminPage ? (

        sessionLoading ? (

          <main className="admin-page">

            <div className="admin-card admin-loading">

              <div className="admin-symbol">
                ✦
              </div>

              <div className="admin-kicker">
                ASTERISM ASTRO
              </div>

              <h1>
                Loading admin
              </h1>

              <p>
                Please wait...
              </p>

            </div>

          </main>

        ) : session ? (

          <AdminDashboard
            session={
              session
            }
          />

        ) : null

      ) : isAccountPage ? (

        sessionLoading ? (

          <main className="auth-page">

            <div className="auth-card">

              <div className="auth-mark">
                ✧
              </div>

              <div className="auth-kicker">
                ASTERISM ASTRO
              </div>

              <h1>
                Loading account
              </h1>

              <p className="auth-subtitle">
                Please wait...
              </p>

            </div>

          </main>

        ) : session ? (

          <AccountPage
            session={
              session
            }
          />

        ) : null

      ) : (

        <div
          className="react-site-root"
          dangerouslySetInnerHTML={{
            __html:
              html,
          }}
        />

      )}


      {/* =================================================
          MOBILE MENU
      ================================================= */}

      {menuOpen &&
        !isReactOnlyPage && (

          <>
            <div
              onClick={() =>
                setMenuOpen(false)
              }
              style={{
                position:
                  "fixed",

                inset:
                  0,

                top:
                  "72px",

                zIndex:
                  99998,

                background:
                  "rgba(0,0,0,.15)",
              }}
            />


            <div
              style={{
                position:
                  "fixed",

                top:
                  "72px",

                left:
                  0,

                right:
                  0,

                zIndex:
                  99999,

                background:
                  "#f7f3ea",

                boxShadow:
                  "0 12px 30px rgba(0,0,0,.18)",

                borderTop:
                  "1px solid rgba(0,0,0,.08)",
              }}
            >

              <nav
                style={{
                  padding:
                    "8px 18px 20px",
                }}
              >

                <button
                  type="button"
                  data-mobile-route="/"
                >
                  Home
                </button>


                <button
                  type="button"
                  data-mobile-route="/services"
                >
                  Services
                </button>


                <button
                  type="button"
                  data-mobile-route="/about"
                >
                  About
                </button>


                <button
                  type="button"
                  data-mobile-route="/pricing"
                >
                  Pricing
                </button>


                <button
                  type="button"
                  data-mobile-route="/testimonials"
                >
                  Testimonials
                </button>


                <button
                  type="button"
                  data-mobile-route="/blog"
                >
                  Blog
                </button>


                <button
                  type="button"
                  data-mobile-route="/contact"
                >
                  Contact
                </button>


                <button
                  type="button"
                  data-mobile-route={
                    session
                      ? "/account"
                      : "/login"
                  }
                >
                  {session
                    ? "My Account"
                    : "Log In"}
                </button>


                {session && (
                  <button
                    type="button"
                    data-mobile-route="/admin"
                  >
                    Admin
                  </button>
                )}


                <button
                  type="button"
                  data-book-consultation
                  className="mobile-consultation"
                >
                  Book a Consultation
                </button>

              </nav>
            </div>


            <style>
              {`
                @media (min-width: 768px) {
                  [data-mobile-route] {
                    display: none;
                  }
                }

                [data-mobile-route] {
                  width: 100%;
                  display: block;
                  padding: 15px 8px;
                  border: 0;
                  border-bottom:
                    1px solid
                    rgba(0,0,0,.08);
                  background: transparent;
                  color: #222;
                  font: inherit;
                  font-size: 16px;
                  text-align: left;
                  cursor: pointer;
                }

                [data-mobile-route]:active {
                  background:
                    rgba(0,0,0,.05);
                }

                .mobile-consultation {
                  margin-top: 16px;
                  padding:
                    14px 18px
                    !important;
                  border-radius: 6px;
                  background:
                    #d3a129
                    !important;
                  color:
                    #111
                    !important;
                  text-align:
                    center
                    !important;
                  font-weight:
                    700
                    !important;
                }
              `}
            </style>

          </>

        )}

    </>
  );
}


/* =========================================================
   ROOT
========================================================= */

createRoot(
  document.getElementById(
    "root"
  )
).render(
  <React.StrictMode>

    <BrowserRouter>

      <App />

    </BrowserRouter>

  </React.StrictMode>
);