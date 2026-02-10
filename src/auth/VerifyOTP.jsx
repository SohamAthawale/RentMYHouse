import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../api/endpoints';
import toast from 'react-hot-toast';
import LogoMark from '../assets/brand/logo-mark.svg';

export default function VerifyOTP() {
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email;
  const purpose = 'email_signup';

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  if (!email) {
    return (
      <div className="auth-shell">
        <div className="card p-6 text-center text-slate-600">
          Invalid verification session
        </div>
      </div>
    );
  }

  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Enter a 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      await authAPI.verifyOTP({
        email,
        otp_code: otp,
        purpose,
      });
      toast.success('Email verified! You can now log in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <form
        onSubmit={handleVerify}
        className="auth-card w-full max-w-md"
      >
        <div className="flex flex-col items-center gap-3 mb-4">
          <img src={LogoMark} alt="RentMYHouse" className="h-12 w-12" />
          <h2 className="text-2xl font-display font-semibold text-slate-900 text-center">
            Verify your email
          </h2>
        </div>

        <div className="h-1 w-16 rounded-full bg-[var(--md-sys-color-primary)] mx-auto mb-4"></div>

        <p className="text-sm text-slate-600 mb-6 text-center">
          OTP sent to <b>{email}</b>
        </p>

        <input
          type="text"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          maxLength={6}
          className="input text-center tracking-[0.5em] font-semibold"
          placeholder="123456"
        />

        <button
          disabled={loading}
          className="btn-primary w-full mt-5"
        >
          {loading ? 'Verifying...' : 'Verify OTP'}
        </button>
      </form>
    </div>
  );
}
