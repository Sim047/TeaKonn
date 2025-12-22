import React, { useState } from "react";
import api from "../utils/axios";
import GoogleLoginButton from "../components/GoogleLoginButton";
import Logo from "../assets/teakonn-logo.png";

// Use centralized axios instance with normalized baseURL

export default function Register({ onSuccess, switchToLogin }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister(e) {
    e.preventDefault();
    setError("");

    try {
      const res = await api.post("/auth/register", {
        username,
        email,
        password,
      });

      const { token, user } = res.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      onSuccess({ token, user });
    } catch (err) {
      setError("Registration failed — email may already exist.");
    }
  }

  return (
    <div className="min-h-screen themed-page flex items-center justify-center px-4">
      <div className="w-full max-w-md relative themed-card rounded-2xl p-6">

        {/* LOGO */}
        <div className="flex justify-center mb-6">
          <img src={Logo} alt="TeaKonn Logo" className="h-16 w-auto object-contain drop-shadow-lg" />
        </div>

        {/* Title */}
        <h2 className="text-3xl font-extrabold text-center mb-6 gradient-text">
          Create Your Account
        </h2>

        {/* Error */}
        {error && (
          <div className="text-red-400 text-center mb-4">{error}</div>
        )}

        <form onSubmit={handleRegister} className="flex flex-col gap-6">

          {/* USERNAME */}
          <div className="relative">
            <label className={`absolute left-3 top-3 text-theme-secondary transition-all pointer-events-none ${username ? "text-xs -top-2" : ""}`}>
              Username
            </label>
            <input
              className="input w-full pt-6"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          {/* EMAIL */}
          <div className="relative">
            <label className={`absolute left-3 top-3 text-theme-secondary transition-all pointer-events-none ${email ? "text-xs -top-2" : ""}`}>
              Email
            </label>
            <input
              type="email"
              className="input w-full pt-6"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* PASSWORD */}
          <div className="relative">
            <label className={`absolute left-3 top-3 text-theme-secondary transition-all pointer-events-none ${password ? "text-xs -top-2" : ""}`}>
              Password
            </label>

            <input
              type={showPass ? "text" : "password"}
              className="input w-full pt-6"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {/* Show / Hide */}
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-[18px] text-sm text-theme-secondary hover:underline"
            >
              {showPass ? "Hide" : "Show"}
            </button>
          </div>

          {/* SUBMIT */}
          <button
            type="submit"
            className="btn w-full p-3 rounded-lg text-slate-900 font-bold text-lg mt-2"
          >
            Register
          </button>
        </form>

        {/* Or divider */}
        <div className="my-6 flex items-center gap-3 opacity-80">
          <div className="h-px flex-1" style={{ backgroundColor: 'var(--border)' }} />
          <span className="text-sm text-theme-secondary">OR</span>
          <div className="h-px flex-1" style={{ backgroundColor: 'var(--border)' }} />
        </div>

        {/* Google Sign-Up (same as login) */}
        <GoogleLoginButton onSuccess={onSuccess} className="flex justify-center" />

        <p className="mt-6 text-sm text-center text-theme-secondary">
          Already have an account?{" "}
          <button
            onClick={switchToLogin}
            className="hover:underline"
          >
            Log In
          </button>
        </p>

      </div>
    </div>
  );
}
