import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../api/endpoints';
import toast from 'react-hot-toast';

export default function VerifyOTP() {
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email; // passed from signup/login
  const purpose = 'email_signup';

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  if (!email) {
    return <p className="text-center mt-10">Invalid verification session</p>;
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
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleVerify}
        className="bg-white p-6 rounded-lg shadow w-full max-w-sm"
      >
        <h2 className="text-xl font-semibold mb-4 text-center">
          Verify Email
        </h2>

        <p className="text-sm text-gray-600 mb-4 text-center">
          OTP sent to <b>{email}</b>
        </p>

        <input
          type="text"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          maxLength={6}
          className="w-full border px-4 py-2 rounded mb-4 text-center tracking-widest"
          placeholder="123456"
        />

        <button
          disabled={loading}
          className="w-full bg-green-600 text-white py-2 rounded"
        >
          {loading ? 'Verifying...' : 'Verify OTP'}
        </button>
      </form>
    </div>
  );
}
