import React, { useState } from 'react';
import api from '../utils/axios';
import GoogleLoginButton from '../components/GoogleLoginButton';
import Logo from '../assets/teakonn-logo.png';

// Use centralized axios instance with normalized baseURL

export default function Register({ onSuccess, switchToLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  async function handleRegister(e) {
    e.preventDefault();
    setError('');

    try {
      const res = await api.post('/auth/register', {
        name,
        email,
        password,
      });

      const { token, user } = res.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      onSuccess({ token, user });
    } catch (err) {
      setError('Registration failed — email may already exist.');
    }
  }

  return (
    <div className="min-h-screen themed-page flex items-center justify-center px-4">
      <div className="w-full max-w-md relative themed-card rounded-2xl p-6">
        {/* LOGO (match Login page) */}
        <div className="flex justify-center mb-6">
          <img src={Logo} alt="TeaKonn Logo" className="h-16 w-auto object-contain drop-shadow-lg" />
        </div>

        {/* Title */}
        <h2 className="text-3xl font-extrabold text-center mb-6 gradient-text">
          Create Your Account
        </h2>

        {/* Error */}
        {error && <div className="text-red-400 text-center mb-4">{error}</div>}

        <form onSubmit={handleRegister} className="flex flex-col gap-6">
          {/* NAME */}
          <div className="relative">
            <input
              id="reg-name"
              className="input w-full pt-6 peer"
              placeholder=" "
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              autoComplete="name"
            />
            <label
              htmlFor="reg-name"
              className="absolute left-3 top-3 text-theme-secondary transition-all duration-200 pointer-events-none
                peer-placeholder-shown:top-3 peer-placeholder-shown:text-base
                peer-focus:-top-2 peer-focus:text-xs
                peer-[&:not(:placeholder-shown)]:-top-2 peer-[&:not(:placeholder-shown)]:text-xs"
            >
              Name
            </label>
          </div>

          {/* EMAIL */}
          <div className="relative">
            <input
              id="reg-email"
              type="email"
              className="input w-full pt-6 peer"
              placeholder=" "
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={254}
              autoComplete="email"
            />
            <label
              htmlFor="reg-email"
              className="absolute left-3 top-3 text-theme-secondary transition-all duration-200 pointer-events-none
                peer-placeholder-shown:top-3 peer-placeholder-shown:text-base
                peer-focus:-top-2 peer-focus:text-xs
                peer-[&:not(:placeholder-shown)]:-top-2 peer-[&:not(:placeholder-shown)]:text-xs"
            >
              Email
            </label>
          </div>

          {/* PASSWORD */}
          <div className="relative">
            <input
              id="reg-password"
              type={showPass ? 'text' : 'password'}
              className="input w-full pt-6 peer"
              placeholder=" "
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={128}
              autoComplete="new-password"
            />
            <label
              htmlFor="reg-password"
              className="absolute left-3 top-3 text-theme-secondary transition-all duration-200 pointer-events-none
                peer-placeholder-shown:top-3 peer-placeholder-shown:text-base
                peer-focus:-top-2 peer-focus:text-xs
                peer-[&:not(:placeholder-shown)]:-top-2 peer-[&:not(:placeholder-shown)]:text-xs"
            >
              Password
            </label>

            {/* Show / Hide */}
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-[18px] text-sm text-theme-secondary hover:underline"
            >
              {showPass ? 'Hide' : 'Show'}
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
          Already have an account?{' '}
          <button onClick={switchToLogin} className="hover:underline">
            Log In
          </button>
        </p>
      </div>
    </div>
  );
}
