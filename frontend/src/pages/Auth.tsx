// src/pages/Auth.tsx
import {
  type FormEvent,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  AudioLines,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { api, getApiError, unwrapResponse } from "../lib/api";
import { AuthContext } from "../contexts/AuthContext";

import logoImage from "../assets/Logo.jpeg";
import backgroundImage from "../assets/wellpaper.jpg";
import heroVisual from "../assets/VISION ARTIFICIAL.jpg";

type AuthMode = "login" | "register" | "otp" | "forgot" | "reset";

type LoginResponse = {
  access_token?: string;
  token_type?: string;
  requires_email_otp?: boolean;
  email_verification_token?: string;
  user?: unknown;
};

type ResetRequestResponse = {
  password_reset_token?: string;
  reset_token?: string;
  token?: string;
};

function pickToken(payload: any): string {
  return (
    payload?.access_token ||
    payload?.token ||
    payload?.jwt ||
    payload?.data?.access_token ||
    ""
  );
}

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const authContext = useContext(AuthContext);

  if (!authContext) {
    throw new Error("Auth must be rendered inside AuthProvider.");
  }

  const { login } = authContext;

  const initialMode = useMemo<AuthMode>(
    () => (searchParams.get("mode") === "register" ? "register" : "login"),
    [searchParams]
  );

  const [mode, setMode] = useState<AuthMode>(initialMode);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [otpCode, setOtpCode] = useState("");
  const [emailVerificationToken, setEmailVerificationToken] = useState("");
  const [passwordResetToken, setPasswordResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingPassword, setPendingPassword] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (resendCooldown <= 0) return;

    const interval = window.setInterval(() => {
      setResendCooldown((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [resendCooldown]);

  const clearFeedback = () => {
    setError("");
    setMessage("");
  };

  const goMode = (nextMode: AuthMode) => {
    clearFeedback();
    setMode(nextMode);
  };

  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

  const handleRegister = async (event: FormEvent) => {
    event.preventDefault();
    clearFeedback();

    if (!firstName.trim()) return setError("First name is required.");
    if (!lastName.trim()) return setError("Last name is required.");
    if (!email.trim()) return setError("Email is required.");
    if (!phoneNumber.trim()) return setError("Phone number is required.");
    if (!password.trim()) return setError("Password is required.");
    if (password !== confirmPassword) return setError("Passwords do not match.");

    setLoading(true);

    try {
      await api.post("/auth/register", {
        full_name: fullName,
        email: email.trim(),
        password,
        phone_number: phoneNumber.trim(),
      });

      const loginResponse = await api.post("/auth/login", {
        email: email.trim(),
        password,
      });

      const loginPayload = unwrapResponse<LoginResponse>(loginResponse);

      if (
        loginPayload.requires_email_otp ||
        loginPayload.email_verification_token
      ) {
        setEmailVerificationToken(
          loginPayload.email_verification_token || ""
        );
        setPendingEmail(email.trim());
        setPendingPassword(password);
        setOtpCode("");
        setMessage(
          "Account created successfully. Verification code sent to your email."
        );
        setMode("otp");
        return;
      }

      const token = pickToken(loginPayload);

      if (token) {
        login(token, loginPayload.user);
        navigate("/dashboard", { replace: true });
        return;
      }

      setMessage("Account created successfully. Please login.");
      setMode("login");
    } catch (err) {
      console.error("[Registration Error]", err);
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (event?: FormEvent) => {
    event?.preventDefault();
    clearFeedback();

    if (!email.trim()) return setError("Email is required.");
    if (!password.trim()) return setError("Password is required.");

    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        email: email.trim(),
        password,
      });

      const payload = unwrapResponse<LoginResponse>(response);

      if (payload.requires_email_otp || payload.email_verification_token) {
        setEmailVerificationToken(payload.email_verification_token || "");
        setPendingEmail(email.trim());
        setPendingPassword(password);
        setMessage("Verification code sent to your email.");
        setMode("otp");
        return;
      }

      const token = pickToken(payload);

      if (token) {
        login(token, payload.user);
        navigate("/dashboard", { replace: true });
        return;
      }

      setError("Login response did not include token or OTP token.");
    } catch (err) {
      console.error("[Login Error]", err);
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event: FormEvent) => {
    event.preventDefault();
    clearFeedback();

    if (!emailVerificationToken) {
      return setError("Verification session is missing. Please login again.");
    }
    if (!otpCode.trim()) return setError("OTP code is required.");

    setLoading(true);

    try {
      const response = await api.post("/auth/email-otp/verify-login", {
        email_verification_token: emailVerificationToken,
        code: otpCode.trim(),
      });

      const payload = unwrapResponse<any>(response);
      const token = pickToken(payload);

      if (!token) {
        return setError(
          "Verification succeeded but no access token was returned."
        );
      }

      login(token, payload.user);
      setPendingEmail("");
      setPendingPassword("");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("[OTP Error]", err);
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    clearFeedback();
    if (resendCooldown > 0) return;

    const loginEmail = pendingEmail || email;
    const loginPassword = pendingPassword || password;

    if (!loginEmail || !loginPassword) {
      return setError(
        "Please go back to login and enter your email and password again."
      );
    }

    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        email: loginEmail.trim(),
        password: loginPassword,
      });

      const payload = unwrapResponse<LoginResponse>(response);

      if (!payload.email_verification_token) {
        return setError("Backend did not return a new verification token.");
      }

      setEmailVerificationToken(payload.email_verification_token);
      setOtpCode("");
      setResendCooldown(30);
      setMessage("A new OTP code has been sent to your email.");
    } catch (err) {
      console.error("[Resend OTP Error]", err);
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordResetRequest = async (event: FormEvent) => {
    event.preventDefault();
    clearFeedback();

    if (!email.trim()) return setError("Email is required.");

    setLoading(true);

    try {
      const response = await api.post("/auth/password-reset/request", {
        email: email.trim(),
      });

      const payload = unwrapResponse<ResetRequestResponse>(response);

      const token =
        payload.password_reset_token ||
        payload.reset_token ||
        payload.token ||
        "";

      if (!token) {
        return setError(
          "Password reset token was not returned. Make sure this email exists in the local database."
        );
      }

      setPasswordResetToken(token);
      setOtpCode("");
      setNewPassword("");
      setNewPasswordConfirm("");
      setMessage("Password reset code sent to your email.");
      setMode("reset");
    } catch (err) {
      console.error("[Password Reset Request Error]", err);
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordResetConfirm = async (event: FormEvent) => {
    event.preventDefault();
    clearFeedback();

    if (!email.trim()) return setError("Email is required.");
    if (!passwordResetToken) {
      return setError(
        "Password reset token is missing. Please request a new reset code."
      );
    }
    if (!otpCode.trim()) return setError("Reset code is required.");
    if (!newPassword.trim()) return setError("New password is required.");
    if (newPassword !== newPasswordConfirm) {
      return setError("Passwords do not match.");
    }

    setLoading(true);

    try {
      await api.post("/auth/password-reset/confirm", {
        email: email.trim(),
        code: otpCode.trim(),
        new_password: newPassword,
        password_reset_token: passwordResetToken,
      });

      setMessage(
        "Password reset successfully. Please login with your new password."
      );
      setOtpCode("");
      setNewPassword("");
      setNewPasswordConfirm("");
      setPasswordResetToken("");
      setPassword(newPassword);
      setMode("login");
    } catch (err) {
      console.error("[Password Reset Confirm Error]", err);
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const title =
    mode === "register"
      ? "Create Your Account"
      : mode === "otp"
      ? "Verify Your Email"
      : mode === "forgot"
      ? "Reset Password"
      : mode === "reset"
      ? "Create New Password"
      : "Welcome Back";

  const subtitle =
    mode === "register"
      ? "Join AccessMate AI and start your accessibility journey"
      : mode === "login"
      ? "Sign in to your AccessMate AI account"
      : mode === "otp"
      ? "Enter the OTP code sent to your email."
      : mode === "forgot"
      ? "Enter your email to receive a reset code."
      : "Enter the reset code and your new password.";

  const passwordChecks = [
    { label: "8+ characters", ok: password.length >= 8 },
    { label: "One uppercase", ok: /[A-Z]/.test(password) },
    { label: "One number", ok: /\d/.test(password) },
    { label: "One special char", ok: /[^A-Za-z0-9]/.test(password) },
  ];

  return (
    <main
      className="relative min-h-[100dvh] w-full overflow-x-hidden bg-[#02080D] text-[#F4F9FC]"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="pointer-events-none fixed inset-0 z-0 bg-[#02080D]/96" />

      <div className="relative z-10 mx-auto min-h-[100dvh] w-full max-w-[1680px] p-[6px] sm:p-[10px] lg:p-[12px]">
        <div className="relative min-h-[calc(100dvh-12px)] overflow-hidden border border-[#15313D]/90 bg-[#020A11]/94 shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
          <div className="grid min-h-[calc(100dvh-24px)] lg:grid-cols-[0.62fr_0.38fr]">
            <motion.section
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.65, ease: "easeOut" }}
              className="relative hidden min-h-[720px] overflow-hidden border-r border-[#102B35] lg:block"
            >
              <img
                src={heroVisual}
                alt="AccessMate AI adaptive intelligence"
                className="absolute inset-0 h-full w-full object-cover object-center"
                style={{
                  filter:
                    "grayscale(1) sepia(1) hue-rotate(142deg) saturate(6.4) brightness(0.56) contrast(1.32)",
                }}
              />

              <div className="absolute inset-0 bg-[#00BDE8]/[0.06] mix-blend-screen" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#020A11]/98 via-[#020A11]/62 to-[#020A11]/16" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#020A11]/92 via-transparent to-[#020A11]/40" />

              <div className="relative z-10 flex h-full min-h-[720px] flex-col px-8 py-6 xl:px-10 2xl:px-[44px]">
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="group flex w-fit items-center gap-3 text-start"
                >
                  <span className="flex h-[44px] w-[44px] items-center justify-center rounded-full border border-[#00D9F5]/40 bg-[#03131A]">
                    <img
                      src={logoImage}
                      alt="AccessMate AI"
                      className="h-[34px] w-[34px] rounded-full object-cover"
                      style={{
                        filter:
                          "grayscale(1) sepia(1) hue-rotate(135deg) saturate(7) brightness(1.18) contrast(1.18)",
                      }}
                    />
                  </span>
                  <span>
                    <span className="block text-[16px] font-bold text-[#F5F9FB]">
                      AccessMate AI
                    </span>
                    <span className="block text-[9px] text-[#82939E]">
                      Adaptive AI for Accessibility
                    </span>
                  </span>
                </button>

                <div className="mt-[5vh] max-w-[520px]">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#00D9F5]/45 bg-[#00171F]/72 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.10em] text-[#00D9F5]">
                    <Sparkles className="h-[14px] w-[14px]" />
                    AI Powered Accessibility
                  </div>

                  <h1 className="mt-6 text-[42px] font-black leading-[0.98] tracking-[-0.05em] text-[#F5F7FA] xl:text-[52px]">
                    Accessibility
                    <br />
                    <span className="bg-gradient-to-r from-[#00A8E8] via-[#00C7EE] to-[#00E1EF] bg-clip-text text-transparent">
                      Without Limits
                    </span>
                  </h1>

                  <p className="mt-4 max-w-[460px] text-[12px] leading-6 text-[#9AABB5]">
                    AccessMate AI adapts to you — making information,
                    communication, and the digital world simple, safe, and
                    inclusive.
                  </p>

                  <div className="mt-5 grid max-w-[410px] gap-3">
                    <AuthBenefit
                      icon={Sparkles}
                      title="Smart & Adaptive"
                      text="AI that understands your needs and adapts in real time."
                    />
                    <AuthBenefit
                      icon={ShieldCheck}
                      title="Safe & Secure"
                      text="Your privacy and data security are always our priority."
                    />
                    <AuthBenefit
                      icon={AudioLines}
                      title="Always Accessible"
                      text="Available anytime, anywhere, across all your devices."
                    />
                  </div>
                </div>

                <div className="mt-auto max-w-[420px] rounded-[12px] border border-[#17323D] bg-[#061018]/84 px-5 py-4">
                  <div className="flex items-start gap-3">
                    <span className="text-[38px] font-black leading-none text-[#00D9F5]">
                      “
                    </span>
                    <div>
                      <p className="text-[12px] leading-5 text-[#D1DCE2]">
                        “Technology should adapt to people, not the other way around.”
                      </p>
                      <p className="mt-2 text-[10px] font-semibold text-[#00D9F5]">
                        AccessMate AI
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.65, delay: 0.05 }}
              className="relative flex min-h-[100dvh] items-center justify-center px-5 py-6 sm:px-8 lg:min-h-0 lg:px-6 xl:px-7"
            >
              <button
                type="button"
                onClick={() => navigate("/")}
                className="absolute left-5 top-5 inline-flex items-center gap-2 text-[11px] text-[#738691] hover:text-[#00D9F5] lg:hidden"
              >
                <ArrowLeft className="h-4 w-4" />
                Back home
              </button>

              <div className="w-full max-w-[520px] rounded-[16px] border border-[#17323D] bg-[#061018]/90 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.38)] backdrop-blur-2xl xl:p-6">
                <div className="text-center">
                  <h2 className="text-[30px] font-black tracking-[-0.035em] text-[#F5F7FA]">
                    {title}
                  </h2>
                  <p className="mt-2 text-[13px] leading-6 text-[#8FA0AA]">
                    {subtitle}
                  </p>
                </div>

                {error && (
                  <div className="mt-4 rounded-[9px] border border-red-400/25 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
                    {error}
                  </div>
                )}

                {message && (
                  <div className="mt-4 rounded-[9px] border border-[#00D9F5]/25 bg-[#00212B]/60 px-3 py-2 text-[11px] text-[#76E9F7]">
                    {message}
                  </div>
                )}

                {mode === "login" && (
                  <form onSubmit={handleLogin} className="mt-7">
                    <AuthLabel text="Email Address" />
                    <AuthField>
                      <Mail className="auth-ref-icon h-[16px] w-[16px]" />
                      <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        type="email"
                        autoComplete="email"
                        className="auth-ref-input"
                      />
                    </AuthField>

                    <div className="mt-5">
                      <AuthLabel text="Password" />
                      <AuthField>
                        <Lock className="auth-ref-icon h-[16px] w-[16px]" />
                        <input
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          className="auth-ref-input pr-12"
                        />
                        <PasswordToggle
                          visible={showPassword}
                          onClick={() => setShowPassword((value) => !value)}
                        />
                      </AuthField>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-4">
                      <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[#8FA0AA]">
                        <input
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          type="checkbox"
                          className="h-3.5 w-3.5 accent-[#00BFD8]"
                        />
                        Remember me
                      </label>

                      <button
                        type="button"
                        onClick={() => goMode("forgot")}
                        className="text-[12px] text-[#00D9F5] hover:text-[#7CEBF8]"
                      >
                        Forgot Password?
                      </button>
                    </div>

                    <button
                      disabled={loading}
                      className="auth-ref-primary mt-5"
                      type="submit"
                    >
                      {loading ? "Please wait..." : "Login"}
                      <ArrowRight className="h-[15px] w-[15px]" />
                    </button>

                    <p className="mt-6 text-center text-[12px] text-[#81929D]">
                      Don&apos;t have an account?{" "}
                      <button
                        type="button"
                        onClick={() => goMode("register")}
                        className="font-semibold text-[#00D9F5]"
                      >
                        Create Account
                      </button>
                    </p>
                  </form>
                )}

                {mode === "register" && (
                  <form onSubmit={handleRegister} className="mt-5 space-y-3">
                    <div>
                      <AuthLabel text="Full Name" />
                      <div className="grid grid-cols-2 gap-2">
                        <AuthField>
                          <input
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="First name"
                            className="auth-ref-input auth-ref-no-icon"
                          />
                        </AuthField>
                        <AuthField>
                          <input
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Last name"
                            className="auth-ref-input auth-ref-no-icon"
                          />
                        </AuthField>
                      </div>
                    </div>

                    <div>
                      <AuthLabel text="Email Address" />
                      <AuthField>
                        <Mail className="auth-ref-icon h-[16px] w-[16px]" />
                        <input
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your email"
                          type="email"
                          className="auth-ref-input"
                        />
                      </AuthField>
                    </div>

                    <div>
                      <AuthLabel text="Phone Number" />
                      <AuthField>
                        <input
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="Enter your phone number"
                          className="auth-ref-input auth-ref-no-icon"
                        />
                      </AuthField>
                    </div>

                    <div>
                      <AuthLabel text="Password" />
                      <AuthField>
                        <Lock className="auth-ref-icon h-[16px] w-[16px]" />
                        <input
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Create a strong password"
                          type={showPassword ? "text" : "password"}
                          className="auth-ref-input pr-11"
                        />
                        <PasswordToggle
                          visible={showPassword}
                          onClick={() => setShowPassword((value) => !value)}
                        />
                      </AuthField>

                      <div className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-4">
                        {passwordChecks.map((check) => (
                          <div
                            key={check.label}
                            className={`flex items-center gap-1 text-[9.5px] ${
                              check.ok ? "text-[#53DFEF]" : "text-[#61747F]"
                            }`}
                          >
                            <span
                              className={`h-[6px] w-[6px] rounded-full border ${
                                check.ok
                                  ? "border-[#00D9F5] bg-[#00D9F5]"
                                  : "border-[#50636E]"
                              }`}
                            />
                            {check.label}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <AuthLabel text="Confirm Password" />
                      <AuthField>
                        <Lock className="auth-ref-icon h-[16px] w-[16px]" />
                        <input
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm your password"
                          type={showConfirmPassword ? "text" : "password"}
                          className="auth-ref-input pr-11"
                        />
                        <PasswordToggle
                          visible={showConfirmPassword}
                          onClick={() =>
                            setShowConfirmPassword((value) => !value)
                          }
                        />
                      </AuthField>
                    </div>

                    <button
                      disabled={loading}
                      className="auth-ref-primary mt-2"
                      type="submit"
                    >
                      <UserPlus className="h-[15px] w-[15px]" />
                      {loading ? "Creating..." : "Create Account"}
                      <ArrowRight className="h-[15px] w-[15px]" />
                    </button>

                    <p className="pt-1 text-center text-[12px] text-[#81929D]">
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() => goMode("login")}
                        className="font-semibold text-[#00D9F5]"
                      >
                        Login
                      </button>
                    </p>
                  </form>
                )}

                {mode === "otp" && (
                  <form onSubmit={handleVerifyOtp} className="mt-6 space-y-3">
                    <AuthLabel text="Verification Code" />
                    <AuthField>
                      <input
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="OTP code"
                        inputMode="numeric"
                        className="auth-ref-input auth-ref-no-icon text-center tracking-[0.32em]"
                      />
                    </AuthField>

                    <button
                      disabled={loading}
                      className="auth-ref-primary"
                      type="submit"
                    >
                      <ShieldCheck className="h-[16px] w-[16px]" />
                      {loading ? "Verifying..." : "Verify"}
                    </button>

                    <button
                      type="button"
                      disabled={loading || resendCooldown > 0}
                      onClick={handleResendOtp}
                      className="auth-ref-secondary"
                    >
                      {resendCooldown > 0
                        ? `Resend code in ${resendCooldown}s`
                        : "Resend code"}
                    </button>

                    <button
                      type="button"
                      onClick={() => goMode("login")}
                      className="auth-ref-link"
                    >
                      Back to login
                    </button>
                  </form>
                )}

                {mode === "forgot" && (
                  <form
                    onSubmit={handlePasswordResetRequest}
                    className="mt-6 space-y-3"
                  >
                    <AuthLabel text="Email Address" />
                    <AuthField>
                      <Mail className="auth-ref-icon h-[16px] w-[16px]" />
                      <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        type="email"
                        className="auth-ref-input"
                      />
                    </AuthField>

                    <button
                      disabled={loading}
                      className="auth-ref-primary"
                      type="submit"
                    >
                      <Mail className="h-[16px] w-[16px]" />
                      {loading ? "Sending..." : "Send reset code"}
                    </button>

                    <button
                      type="button"
                      onClick={() => goMode("login")}
                      className="auth-ref-link"
                    >
                      Back to login
                    </button>
                  </form>
                )}

                {mode === "reset" && (
                  <form
                    onSubmit={handlePasswordResetConfirm}
                    className="mt-6 space-y-3"
                  >
                    <AuthLabel text="Reset Code" />
                    <AuthField>
                      <input
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="Reset code"
                        inputMode="numeric"
                        className="auth-ref-input auth-ref-no-icon text-center tracking-[0.32em]"
                      />
                    </AuthField>

                    <div>
                      <AuthLabel text="New Password" />
                      <AuthField>
                        <Lock className="auth-ref-icon h-[16px] w-[16px]" />
                        <input
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="New password"
                          type={showPassword ? "text" : "password"}
                          className="auth-ref-input pr-12"
                        />
                        <PasswordToggle
                          visible={showPassword}
                          onClick={() => setShowPassword((value) => !value)}
                        />
                      </AuthField>
                    </div>

                    <div>
                      <AuthLabel text="Confirm New Password" />
                      <AuthField>
                        <Lock className="auth-ref-icon h-[16px] w-[16px]" />
                        <input
                          value={newPasswordConfirm}
                          onChange={(e) =>
                            setNewPasswordConfirm(e.target.value)
                          }
                          placeholder="Confirm new password"
                          type={showConfirmPassword ? "text" : "password"}
                          className="auth-ref-input pr-12"
                        />
                        <PasswordToggle
                          visible={showConfirmPassword}
                          onClick={() =>
                            setShowConfirmPassword((value) => !value)
                          }
                        />
                      </AuthField>
                    </div>

                    <button
                      disabled={loading}
                      className="auth-ref-primary"
                      type="submit"
                    >
                      <Lock className="h-[16px] w-[16px]" />
                      {loading ? "Resetting..." : "Reset password"}
                    </button>
                  </form>
                )}
              </div>
            </motion.section>
          </div>
        </div>
      </div>

      <style>{`
        .auth-ref-label {
          display: block;
          margin-bottom: 7px;
          color: #c1ccd2;
          font-size: 13px;
          font-weight: 600;
        }

        .auth-ref-field {
          position: relative;
          display: flex;
          width: 100%;
          min-height: 50px;
          align-items: center;
          border-radius: 8px;
          border: 1px solid #17323d;
          background: rgba(2, 10, 17, 0.72);
          transition: 0.2s ease;
        }

        .auth-ref-field:focus-within {
          border-color: rgba(0, 217, 245, 0.60);
          box-shadow: 0 0 0 3px rgba(0,217,245,.05);
        }

        .auth-ref-icon {
          position: absolute;
          left: 13px;
          color: #647681;
          pointer-events: none;
        }

        .auth-ref-input {
          width: 100%;
          min-height: 50px;
          border: 0 !important;
          outline: 0 !important;
          background: transparent !important;
          padding: 0 41px;
          color: #f4f9fc !important;
          box-shadow: none !important;
          font-size: 12px;
          font-weight: 500;
        }

        .auth-ref-input.auth-ref-no-icon {
          padding-left: 13px;
          padding-right: 13px;
        }

        .auth-ref-input::placeholder {
          color: #667985 !important;
        }

        .auth-ref-primary {
          display: inline-flex;
          width: 100%;
          min-height: 50px;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border-radius: 8px;
          border: 1px solid rgba(0,217,245,.75);
          background: linear-gradient(90deg,#087f9e,#009ebd,#07a9c4);
          color: white;
          font-size: 13px;
          font-weight: 700;
          box-shadow: 0 0 22px rgba(0,201,230,.12);
          transition: .2s ease;
        }

        .auth-ref-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          filter: brightness(1.08);
        }

        .auth-ref-primary:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .auth-ref-secondary {
          display: inline-flex;
          width: 100%;
          min-height: 48px;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          border: 1px solid #17323d;
          background: rgba(4,16,24,.78);
          color: #cbd7dc;
          font-size: 13px;
          font-weight: 600;
        }

        .auth-ref-link {
          width: 100%;
          padding: 7px;
          color: #00d9f5;
          font-size: 13px;
          font-weight: 600;
        }

        @media (max-width: 1023px) {
          main { overflow-y: auto !important; }
        }
      `}</style>
    </main>
  );
}

function AuthBenefit({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Sparkles;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border border-[#00D9F5]/38 bg-[#00212B]/78 text-[#00D9F5]">
        <Icon className="h-[17px] w-[17px]" />
      </span>
      <div>
        <p className="text-[12px] font-bold text-[#EAF2F5]">{title}</p>
        <p className="mt-1 max-w-[285px] text-[10px] leading-5 text-[#83949E]">
          {text}
        </p>
      </div>
    </div>
  );
}

function AuthLabel({ text }: { text: string }) {
  return <span className="auth-ref-label">{text}</span>;
}

function AuthField({ children }: { children: ReactNode }) {
  return <div className="auth-ref-field">{children}</div>;
}

function PasswordToggle({
  visible,
  onClick,
}: {
  visible: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-[#697B86] transition hover:text-[#00D9F5]"
      aria-label={visible ? "Hide password" : "Show password"}
    >
      {visible ? (
        <EyeOff className="h-[16px] w-[16px]" />
      ) : (
        <Eye className="h-[16px] w-[16px]" />
      )}
    </button>
  );
}
