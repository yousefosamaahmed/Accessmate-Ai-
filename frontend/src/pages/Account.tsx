// src/pages/Account.tsx

import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useState,
} from "react";

import { motion } from "framer-motion";

import {
  Bell,
  Camera,
  CheckCircle2,
  ChevronDown,
  KeyRound,
  LogOut,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  User,
} from "lucide-react";

import {
  api,
  getApiError,
  unwrapResponse,
} from "../lib/api";

import {
  getUser,
  removeToken,
} from "../lib/storage";


type AccountData = {
  id?: string;
  full_name?: string;
  email?: string;
  phone_number?: string;
  avatar_url?: string;
  telegram_chat_id?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};


const AVATAR_KEY =
  "accessmate_avatar";


function formatDate(
  value?: string
) {
  if (!value) {
    return "Not available";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Not available";
  }

  return date.toLocaleString();
}


export default function Account() {
  const [
    account,
    setAccount,
  ] =
    useState<AccountData | null>(
      getUser<AccountData>()
    );

  const [
    fullName,
    setFullName,
  ] =
    useState(
      account?.full_name || ""
    );

  const [
    phoneNumber,
    setPhoneNumber,
  ] =
    useState(
      account?.phone_number || ""
    );

  const [
    avatarUrl,
    setAvatarUrl,
  ] =
    useState(
      localStorage.getItem(
        AVATAR_KEY
      ) ||
      account?.avatar_url ||
      ""
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    resettingPassword,
    setResettingPassword,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState("");


  useEffect(() => {
    void loadAccount();
  }, []);


  function clearAlerts() {
    setMessage("");
    setError("");
  }


  async function loadAccount() {
    setLoading(true);
    clearAlerts();

    try {
      const response =
        await api.get(
          "/account/me"
        );

      const payload =
        unwrapResponse<AccountData>(
          response
        );

      setAccount(payload);

      setFullName(
        payload.full_name || ""
      );

      setPhoneNumber(
        payload.phone_number || ""
      );

      if (
        payload.avatar_url
      ) {
        setAvatarUrl(
          payload.avatar_url
        );

        localStorage.setItem(
          AVATAR_KEY,
          payload.avatar_url
        );
      }

      localStorage.setItem(
        "accessmate_user",
        JSON.stringify(
          payload
        )
      );
    } catch (err) {
      setError(
        getApiError(err)
      );
    } finally {
      setLoading(false);
    }
  }


  function handleAvatarChange(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      setError(
        "Please choose an image file."
      );
      return;
    }

    const reader =
      new FileReader();

    reader.onload =
      () => {
        const result =
          String(
            reader.result || ""
          );

        setAvatarUrl(result);

        localStorage.setItem(
          AVATAR_KEY,
          result
        );

        setMessage(
          "Profile image selected. Press Save Profile to keep it."
        );

        setError("");
      };

    reader.readAsDataURL(file);
  }


  async function saveProfile(
    event: FormEvent
  ) {
    event.preventDefault();

    setSaving(true);
    clearAlerts();

    try {
      const response =
        await api.patch(
          "/account/me",
          {
            full_name:
              fullName.trim(),

            phone_number:
              phoneNumber.trim(),

            avatar_url:
              avatarUrl || null,
          }
        );

      const payload =
        unwrapResponse<AccountData>(
          response
        );

      const updated = {
        ...payload,
        avatar_url:
          avatarUrl ||
          payload.avatar_url,
      };

      setAccount(updated);

      localStorage.setItem(
        "accessmate_user",
        JSON.stringify(
          updated
        )
      );

      if (avatarUrl) {
        localStorage.setItem(
          AVATAR_KEY,
          avatarUrl
        );
      }

      window.dispatchEvent(
        new Event(
          "accessmate-avatar-updated"
        )
      );

      setMessage(
        "Profile saved successfully."
      );
    } catch (err) {
      setError(
        getApiError(err)
      );
    } finally {
      setSaving(false);
    }
  }


  async function sendPasswordReset() {
    if (
      !account?.email ||
      resettingPassword
    ) {
      return;
    }

    setResettingPassword(true);
    clearAlerts();

    try {
      await api.post(
        "/auth/password-reset/request",
        {
          email:
            account.email,
        }
      );

      setMessage(
        "Password reset code sent to your email."
      );
    } catch (err) {
      setError(
        getApiError(err)
      );
    } finally {
      setResettingPassword(false);
    }
  }


  function handleLogout() {
    removeToken();

    localStorage.removeItem(
      "accessmate_user"
    );

    window.location.href =
      "/auth?mode=login";
  }


  return (
    <main
      data-voice-region="Account"
      aria-label="Account"
      className="
        account-page
        relative
        h-full
        min-h-0
        overflow-y-auto
        bg-[#000912]
        text-[#EDF3F6]
      "
    >
      <div
        className="
          pointer-events-none
          fixed
          inset-0
          bg-[#000912]
        "
      />

      <div
        className="
          pointer-events-none
          fixed
          right-[-180px]
          top-[-150px]
          h-[560px]
          w-[560px]
          rounded-full
          bg-[#00B8DB]/[0.035]
          blur-[180px]
        "
      />

      <section
        className="
          relative
          z-10
          min-h-full
          w-full
          max-w-none
          px-4
          py-2.5
          lg:px-5
          lg:py-2.5
        "
      >
        {/* =================================================
            HEADER
            ================================================= */}

        <header
          data-voice-region="Account header"
          className="
            flex
            flex-col
            gap-3
            lg:flex-row
            lg:items-start
            lg:justify-between
          "
        >
          <div>
            <span
              className="
                inline-flex
                items-center
                gap-2
                rounded-full
                border
                border-[#00B8DB]/55
                bg-[#05202C]
                px-3
                py-1
                text-[9px]
                font-black
                uppercase
                tracking-[0.12em]
                text-[#00B8DB]
              "
            >
              <User className="h-4 w-4" />
              Account Center
            </span>

            <h1
              className="
                mt-2.5
                text-[30px]
                font-black
                leading-none
                tracking-[-0.045em]
                text-[#F3F7F9]
                sm:text-[32px]
              "
            >
              Account
            </h1>

            <p
              className="
                mt-1.5
                max-w-3xl
                text-[12px]
                leading-5
                text-[#8C9AA3]
              "
            >
              Manage your identity, contact details, profile image, and account security.
            </p>
          </div>


          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                className="
                  relative
                  flex
                  h-[36px]
                  w-[36px]
                  items-center
                  justify-center
                  rounded-[11px]
                  border
                  border-[#15313D]
                  bg-[#07111B]
                  text-[#D7E2E7]
                "
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell className="h-5 w-5" />
                <span
                  className="
                    absolute
                    -right-1
                    -top-1
                    flex
                    h-5
                    min-w-5
                    items-center
                    justify-center
                    rounded-full
                    bg-[#0EA5E9]
                    px-1
                    text-[9px]
                    font-black
                    text-white
                  "
                >
                  1
                </span>
              </button>

              <div
                className="
                  flex
                  min-w-[205px]
                  items-center
                  gap-3
                  rounded-[12px]
                  border
                  border-[#15313D]
                  bg-[#07111B]
                  px-3
                  py-1.5
                "
              >
                <span
                  className="
                    flex
                    h-[32px]
                    w-[32px]
                    shrink-0
                    items-center
                    justify-center
                    overflow-hidden
                    rounded-full
                    border
                    border-[#1E4150]
                    bg-[#0A1B27]
                  "
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-5 w-5 text-[#00B8DB]" />
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span
                    className="
                      block
                      truncate
                      text-[12px]
                      font-black
                      text-[#F2F6F8]
                    "
                  >
                    {fullName ||
                      account?.full_name ||
                      "Your Account"}
                  </span>

                  <span
                    className="
                      block
                      truncate
                      text-[9px]
                      text-[#7F8D96]
                    "
                  >
                    Primary Caregiver
                  </span>
                </span>

                <ChevronDown className="h-4 w-4 shrink-0 text-[#A8B4BB]" />
              </div>
            </div>


            <div className="flex items-center gap-3">
              <StatusChip
                label="Account"
                value={
                  account?.is_active ===
                  false
                    ? "Inactive"
                    : "Active"
                }
                positive={
                  account?.is_active !==
                  false
                }
              />

              <StatusChip
                label="Email"
                value={
                  account?.email
                    ? "Verified"
                    : "Unavailable"
                }
                positive={
                  Boolean(
                    account?.email
                  )
                }
              />
            </div>
          </div>
        </header>


        {/* =================================================
            NOTICES
            ================================================= */}

        <div
          aria-live="polite"
          className="mt-2"
        >
          {loading && (
            <div
              className="
                rounded-[11px]
                border
                border-[#15313D]
                bg-[#07111B]
                px-4
                py-2
                text-[12px]
                text-[#8C9AA3]
              "
            >
              Loading account data...
            </div>
          )}

          {message && (
            <div
              className="
                flex
                items-center
                gap-2
                rounded-[11px]
                border
                border-[#00B8DB]/25
                bg-[#00B8DB]/[0.055]
                px-4
                py-2
                text-[12px]
                text-[#8DE8F4]
              "
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {message}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="
                flex
                items-center
                gap-3
                rounded-[11px]
                border
                border-red-500/45
                bg-red-500/[0.075]
                px-4
                py-2
                text-[12px]
                font-semibold
                leading-5
                text-red-200
              "
            >
              <span
                className="
                  flex
                  h-5
                  w-5
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  border
                  border-red-400
                  text-[10px]
                  font-black
                  text-red-400
                "
              >
                !
              </span>
              {error}
            </div>
          )}
        </div>


        {/* =================================================
            CONTENT
            ================================================= */}

        <div
          className="
            account-cyan-scroll
            mt-2
            grid
            w-full
            gap-2.5
            pb-6
            xl:grid-cols-[250px_minmax(0,1fr)]
          "
        >
          {/* PROFILE SUMMARY */}

          <motion.aside
            initial={{
              opacity: 0,
              x: -12,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            transition={{
              duration: 0.35,
            }}
            className="
              rounded-[14px]
              border
              border-[#15313D]
              bg-[#07111B]
              p-2.5
              shadow-[0_18px_50px_rgba(0,0,0,0.18)]
            "
            data-voice-region="Account profile summary"
          >
            <div className="flex flex-col items-center text-center">
              <div
                className="
                  relative
                  flex
                  h-[86px]
                  w-[86px]
                  items-center
                  justify-center
                  rounded-full
                  border
                  border-[#00B8DB]/80
                  bg-[#030A12]
                  shadow-[0_0_30px_rgba(0,184,219,0.10)]
                "
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="
                      h-[78px]
                      w-[78px]
                      rounded-full
                      object-cover
                    "
                  />
                ) : (
                  <div
                    className="
                      flex
                      h-[78px]
                      w-[78px]
                      items-center
                      justify-center
                      rounded-full
                      bg-[#05202C]
                      text-[#00B8DB]
                    "
                  >
                    <User className="h-8 w-8" />
                  </div>
                )}

                <label
                  className="
                    absolute
                    bottom-[-2px]
                    right-[-2px]
                    flex
                    h-8
                    w-8
                    cursor-pointer
                    items-center
                    justify-center
                    rounded-full
                    border
                    border-[#00B8DB]/70
                    bg-[#006C93]
                    text-white
                    shadow-[0_0_18px_rgba(0,184,219,0.20)]
                    transition
                    hover:bg-[#007FA9]
                  "
                  aria-label="Change profile photo"
                  data-voice-label="Change profile photo"
                >
                  <Camera className="h-4 w-4" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={
                      handleAvatarChange
                    }
                  />
                </label>
              </div>

              <h2
                className="
                  mt-2.5
                  max-w-full
                  truncate
                  text-[16px]
                  font-black
                  text-[#F0F5F7]
                "
              >
                {fullName ||
                  account?.full_name ||
                  "Your Account"}
              </h2>

              <p
                className="
                  mt-1
                  text-[12px]
                  font-semibold
                  text-[#00B8DB]
                "
              >
                Primary Caregiver
              </p>

              <p
                className="
                  mt-1.5
                  max-w-full
                  truncate
                  text-[10px]
                  text-[#89969F]
                "
              >
                {account?.email ||
                  "Email unavailable"}
              </p>
            </div>


            <div className="mt-2.5 space-y-1.5">
              <SummaryRow
                icon={Mail}
                label="Email"
                value={
                  account?.email ||
                  "Not available"
                }
              />

              <SummaryRow
                icon={Phone}
                label="Phone"
                value={
                  phoneNumber ||
                  "Not added"
                }
              />

              <SummaryRow
                icon={ShieldCheck}
                label="Status"
                value={
                  account?.is_active ===
                  false
                    ? "Inactive"
                    : "Active"
                }
              />
            </div>


            <div
              className="
                mt-2.5
                border-t
                border-[#15313D]
                pt-2.5
              "
            >
              <p
                className="
                  text-[9px]
                  font-black
                  uppercase
                  tracking-[0.10em]
                  text-[#00B8DB]
                "
              >
                Account details
              </p>

              <div className="mt-2 space-y-1.5">
                <TinyInfo
                  label="Created"
                  value={
                    formatDate(
                      account?.created_at
                    )
                  }
                />

                <TinyInfo
                  label="Updated"
                  value={
                    formatDate(
                      account?.updated_at
                    )
                  }
                />
              </div>
            </div>
          </motion.aside>


          {/* MAIN ACCOUNT PANELS */}

          <motion.section
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.35,
            }}
            className="
              min-w-0
              w-full
              space-y-2
            "
          >
            <section
              data-voice-region="Profile information"
              className="
                rounded-[14px]
                border
                border-[#15313D]
                bg-[#07111B]
                p-3
                shadow-[0_18px_50px_rgba(0,0,0,0.18)]
              "
            >
              <SectionHeading
                icon={User}
                title="Profile Information"
                description="Update your personal information used across AccessMate."
              />

              <form
                onSubmit={
                  saveProfile
                }
                className="mt-2.5">
                <div
                  className="
                    grid
                    gap-2
                    md:grid-cols-2
                  "
                >
                  <AccountField
                    label="Full Name"
                    icon={User}
                  >
                    <input
                      value={fullName}
                      onChange={(
                        event
                      ) =>
                        setFullName(
                          event.target.value
                        )
                      }
                      placeholder="Your full name"
                      aria-label="Full name"
                      data-voice-label="Full name"
                    />
                  </AccountField>

                  <AccountField
                    label="Email"
                    icon={Mail}
                  >
                    <input
                      value={
                        account?.email ||
                        ""
                      }
                      disabled
                      placeholder="Email"
                      aria-label="Email address"
                      data-voice-label="Email address"
                    />
                  </AccountField>

                  <AccountField
                    label="Phone Number"
                    icon={Phone}
                  >
                    <input
                      value={phoneNumber}
                      onChange={(
                        event
                      ) =>
                        setPhoneNumber(
                          event.target.value
                        )
                      }
                      placeholder="Phone number"
                      aria-label="Phone number"
                      data-voice-label="Phone number"
                    />
                  </AccountField>

                  <div
                    className="
                      rounded-[10px]
                      border
                      border-[#15313D]
                      bg-[#06131D]
                      px-3.5
                      py-2
                    "
                  >
                    <p
                      className="
                        text-[9px]
                        font-black
                        uppercase
                        tracking-[0.08em]
                        text-[#83919A]
                      "
                    >
                      Account status
                    </p>

                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className="
                          h-2
                          w-2
                          rounded-full
                          bg-[#00B8DB]
                          shadow-[0_0_10px_rgba(0,184,219,0.70)]
                        "
                      />

                      <span
                        className="
                          text-[12px]
                          font-semibold
                          text-[#E7EEF2]
                        "
                      >
                        {account?.is_active ===
                        false
                          ? "Inactive"
                          : "Active"}
                      </span>
                    </div>
                  </div>
                </div>


                <div className="mt-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="
                      inline-flex
                      min-h-[38px]
                      items-center
                      justify-center
                      gap-2
                      rounded-[9px]
                      border
                      border-[#20BCE6]/80
                      bg-gradient-to-r
                      from-[#0580B8]
                      via-[#079DD2]
                      to-[#0AADE0]
                      px-4
                      text-[10px]
                      font-black
                      text-white
                      shadow-[0_0_22px_rgba(0,184,219,0.15)]
                      transition
                      hover:-translate-y-0.5
                      hover:brightness-110
                      disabled:cursor-not-allowed
                      disabled:opacity-50
                    "
                    data-voice-label="Save profile"
                  >
                    <Save className="h-4 w-4" />
                    {saving
                      ? "Saving..."
                      : "Save Profile"}
                  </button>
                </div>
              </form>
            </section>


            <section
              data-voice-region="Account security"
              className="
                rounded-[14px]
                border
                border-[#15313D]
                bg-[#07111B]
                p-3
                shadow-[0_18px_50px_rgba(0,0,0,0.18)]
              "
            >
              <SectionHeading
                icon={ShieldCheck}
                title="Security"
                description="Password recovery and authenticated session controls."
              />

              <div
                className="
                  mt-3
                  grid
                  gap-2
                  md:grid-cols-3
                "
              >
                <SecurityInfo
                  icon={Mail}
                  label="Login verification"
                  value="Email OTP enabled"
                />

                <SecurityInfo
                  icon={KeyRound}
                  label="Password recovery"
                  value="Email reset code"
                />

                <SecurityInfo
                  icon={ShieldCheck}
                  label="Session"
                  value="Authenticated"
                />
              </div>


              <div
                className="
                  mt-2.5
                  flex
                  flex-col
                  gap-3
                  sm:flex-row
                  sm:items-center
                  sm:justify-between
                "
              >
                <button
                  type="button"
                  onClick={() =>
                    void sendPasswordReset()
                  }
                  disabled={
                    resettingPassword ||
                    !account?.email
                  }
                  className="
                    inline-flex
                    min-h-[38px]
                    items-center
                    justify-center
                    gap-2
                    rounded-[9px]
                    border
                    border-[#00B8DB]/40
                    bg-[#05202C]
                    px-4
                    text-[11px]
                    font-bold
                    text-[#50CFF2]
                    transition
                    hover:border-[#00B8DB]/70
                    hover:bg-[#073043]
                    disabled:opacity-50
                  "
                  data-voice-label="Send password reset code"
                >
                  <KeyRound className="h-4 w-4" />
                  {resettingPassword
                    ? "Sending..."
                    : "Send Password Reset Code"}
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="
                    inline-flex
                    min-h-[38px]
                    items-center
                    justify-center
                    gap-2
                    rounded-[9px]
                    border
                    border-red-500/40
                    bg-red-500/[0.045]
                    px-4
                    text-[11px]
                    font-bold
                    text-red-400
                    transition
                    hover:border-red-400/65
                    hover:bg-red-500/[0.09]
                    hover:text-red-300
                  "
                  data-voice-label="Logout from AccessMate"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </section>
          </motion.section>
        </div>
      </section>


      <style>
        {`
        .account-page {
          scrollbar-width: thin;
          scrollbar-color: rgba(0, 184, 219, 0.22) transparent;
        }

        .account-page::-webkit-scrollbar,
        .account-cyan-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .account-page::-webkit-scrollbar-track,
        .account-cyan-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .account-page::-webkit-scrollbar-thumb,
        .account-cyan-scroll::-webkit-scrollbar-thumb {
          background: rgba(0, 184, 219, 0.20);
          border-radius: 999px;
        }

        .account-field-input input {
          width: 100%;
          min-width: 0;
          min-height: 48px;
          border: 0 !important;
          outline: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          color: #eef4f7 !important;
          font-size: 12px;
          font-weight: 600;
        }

        .account-field-input input::placeholder {
          color: #667781;
        }

        .account-field-input input:disabled {
          color: #b9c6cc !important;
          cursor: not-allowed;
          opacity: 1;
        }

        /*
         * Desktop compact mode:
         * keeps the Account page correctly proportioned at browser zoom 100%
         * on common laptop / 1080p viewport heights.
         */
        @media (min-width: 1280px) and (max-height: 980px) {
          .account-page {
            font-size: 13px;
          }

          .account-page .account-cyan-scroll {
            margin-top: 8px;
            gap: 8px;
          }
        }

        @media (min-width: 1280px) and (max-height: 820px) {
          .account-page > section {
            padding-top: 8px !important;
            padding-bottom: 8px !important;
          }

          .account-page .account-cyan-scroll {
            margin-top: 6px;
            gap: 7px;
          }

          .account-field-input,
          .account-field-input input {
            min-height: 36px !important;
          }

          .account-page header {
            gap: 6px;
          }
        }

        @media (min-width: 1280px) and (max-height: 740px) {
          .account-page > section {
            padding-top: 6px !important;
            padding-bottom: 6px !important;
          }

          .account-page .account-cyan-scroll {
            margin-top: 5px;
            gap: 6px;
          }
        }
        `}
      </style>
    </main>
  );
}


function StatusChip({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive: boolean;
}) {
  return (
    <div
      className="
        min-w-[106px]
        rounded-[10px]
        border
        border-[#15313D]
        bg-[#07111B]
        px-3
        py-1.5
      "
    >
      <p
        className="
          text-[9.5px]
          font-semibold
          uppercase
          tracking-[0.08em]
          text-[#82909A]
        "
      >
        {label}
      </p>

      <div className="mt-2 flex items-center gap-2">
        <span
          className={`
            h-2
            w-2
            rounded-full
            ${
              positive
                ? "bg-[#00B8DB] shadow-[0_0_9px_rgba(0,184,219,0.72)]"
                : "bg-red-400"
            }
          `}
        />

        <span
          className="
            text-[12px]
            font-semibold
            text-[#E2EAEE]
          "
        >
          {value}
        </span>
      </div>
    </div>
  );
}


function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon:
    React.ComponentType<{
      className?: string;
    }>;
  label: string;
  value: string;
}) {
  return (
    <div
      className="
        flex
        items-center
        gap-3
        rounded-[10px]
        border
        border-[#15313D]
        bg-[#06131D]
        px-3
        py-2
      "
    >
      <span
        className="
          flex
          h-8
          w-8
          shrink-0
          items-center
          justify-center
          rounded-[9px]
          border
          border-[#00B8DB]/30
          bg-[#05202C]
          text-[#00B8DB]
        "
      >
        <Icon className="h-4 w-4" />
      </span>

      <span className="min-w-0 flex-1">
        <span
          className="
            block
            text-[9px]
            font-semibold
            uppercase
            tracking-[0.08em]
            text-[#84919A]
          "
        >
          {label}
        </span>

        <span
          className="
            mt-1
            block
            truncate
            text-[11px]
            font-semibold
            text-[#E2E9ED]
          "
          title={value}
        >
          {value}
        </span>
      </span>
    </div>
  );
}


function TinyInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className="
        flex
        items-start
        justify-between
        gap-3
        text-[10.5px]
      "
    >
      <span className="text-[#82909A]">
        {label}
      </span>

      <span
        className="
          max-w-[180px]
          text-right
          text-[#C2CDD3]
        "
      >
        {value}
      </span>
    </div>
  );
}


function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon:
    React.ComponentType<{
      className?: string;
    }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="
          flex
          h-8
          w-8
          shrink-0
          items-center
          justify-center
          rounded-[10px]
          border
          border-[#00B8DB]/30
          bg-[#05202C]
          text-[#00B8DB]
        "
      >
        <Icon className="h-5 w-5" />
      </span>

      <div>
        <h2
          className="
            text-[15px]
            font-black
            text-[#F0F4F6]
          "
        >
          {title}
        </h2>

        <p
          className="
            mt-0.5
            text-[10px]
            leading-4
            text-[#7F8C95]
          "
        >
          {description}
        </p>
      </div>
    </div>
  );
}


function AccountField({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon:
    React.ComponentType<{
      className?: string;
    }>;
  children:
    React.ReactNode;
}) {
  return (
    <label className="block">
      <span
        className="
          mb-2
          block
          text-[10px]
          font-black
          uppercase
          tracking-[0.07em]
          text-[#95A2AA]
        "
      >
        {label}
      </span>

      <div
        className="
          account-field-input
          flex
          min-h-[38px]
          items-center
          gap-2.5
          rounded-[9px]
          border
          border-[#15313D]
          bg-[#06131D]
          px-3.5
          transition
          focus-within:border-[#00B8DB]/60
          focus-within:shadow-[0_0_0_3px_rgba(0,184,219,0.04)]
        "
      >
        <Icon
          className="
            h-4
            w-4
            shrink-0
            text-[#00B8DB]
          "
        />
        {children}
      </div>
    </label>
  );
}


function SecurityInfo({
  icon: Icon,
  label,
  value,
}: {
  icon:
    React.ComponentType<{
      className?: string;
    }>;
  label: string;
  value: string;
}) {
  return (
    <div
      className="
        rounded-[10px]
        border
        border-[#15313D]
        bg-[#06131D]
        p-2
      "
    >
      <span
        className="
          flex
          h-8
          w-8
          items-center
          justify-center
          rounded-[9px]
          border
          border-[#00B8DB]/30
          bg-[#05202C]
          text-[#00B8DB]
        "
      >
        <Icon className="h-4 w-4" />
      </span>

      <p
        className="
          mt-3
          text-[9px]
          font-black
          uppercase
          tracking-[0.07em]
          text-[#84919A]
        "
      >
        {label}
      </p>

      <p
        className="
          mt-1
          text-[12px]
          font-semibold
          text-[#E2E9ED]
        "
      >
        {value}
      </p>
    </div>
  );
}
