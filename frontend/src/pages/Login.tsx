import React, { useState } from "react";
import api from "../utils/axios";
import GoogleLoginButton from "../components/GoogleLoginButton";
import Logo from "../assets/teakonn-logo.png";

// Use centralized axios instance with normalized baseURL

export default function Login({ onSuccess, switchToRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setError("");

    try {
      const res = await api.post("/auth/login", { email, password });
      const { token, user } = res.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      onSuccess({ token, user });
    } catch (err) {
      setError("Invalid credentials — try again.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#071229] px-4">
      <div className="bg-slate-800/60 p-10 rounded-xl w-full max-w-md text-slate-100">

        {/* LOGO */}
        <div className="flex justify-center mb-6">
          <img src={Logo} alt="TeaKonn Logo" className="h-16 w-auto object-contain drop-shadow-lg" />
        </div>

        {/* TITLE */}
        <h2 className="text-3xl font-extrabold text-center mb-6 bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
          Log In
        </h2>

        {error && <div className="text-red-400 mb-3 text-center">{error}</div>}

        <form className="flex flex-col gap-4" onSubmit={handleLogin}>
          <input
            placeholder="Email"
            type="email"
            className="p-3 rounded-md bg-slate-900/50 border border-slate-700 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/40 outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            placeholder="Password"
            type="password"
            className="p-3 rounded-md bg-slate-900/50 border border-slate-700 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/40 outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button className="btn w-full mt-2" type="submit">
            Log In
          </button>
        </form>

        {/* Or divider */}
        <div className="my-6 flex items-center gap-3 opacity-70">
          <div className="h-px bg-slate-600 flex-1" />
          <span className="text-sm">OR</span>
          <div className="h-px bg-slate-600 flex-1" />
        </div>

        {/* Google Login */}
        <GoogleLoginButton onSuccess={onSuccess} className="flex justify-center" />

        <p className="mt-6 text-sm text-center opacity-80">
          Don’t have an account?{" "}
          <button onClick={switchToRegister} className="text-cyan-300 hover:underline">
            Register
          </button>
        </p>
      </div>
    </div>
  );
}
