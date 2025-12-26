import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LogIn, ArrowRight, Phone, Shield, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.DEV ? 'http://localhost:8000' : 'https://makhana-ai.onrender.com';

export default function OTPLogin() {
  const navigate = useNavigate();
  const [step, setStep] = useState('phone'); // 'phone' or 'otp'
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // OTP input refs for auto-focus
  const otpRefs = [
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null)
  ];

  // Countdown timer for resend OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validate phone number
    if (phone.length !== 10 || !phone.match(/^[6-9]\d{9}$/)) {
      toast.error('Please enter a valid 10-digit mobile number');
      setLoading(false);
      return;
    }

    const loadingToast = toast.loading("Sending OTP...");

    try {
      const res = await axios.post(`${API_URL}/auth/send-otp`, { phone });

      toast.dismiss(loadingToast);
      toast.success('OTP sent to your phone!', {
        icon: '📱',
        style: {
          background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
          color: '#fff',
          fontWeight: '600'
        }
      });

      setStep('otp');
      setCountdown(60); // 60 seconds before resend
      setTimeout(() => otpRefs[0].current?.focus(), 100);

    } catch (err) {
      console.error(err);
      toast.dismiss(loadingToast);

      if (err.response?.status === 429) {
        toast.error('Please wait before requesting another OTP');
      } else {
        toast.error('Failed to send OTP. Please try again.');
      }
    }
    setLoading(false);
  };

  const handleOTPChange = (index, value) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs[index + 1].current?.focus();
    }
  };

  const handleOTPKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }

    // Handle paste
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      navigator.clipboard.readText().then(text => {
        const digits = text.replace(/\D/g, '').slice(0, 6).split('');
        const newOtp = [...otp];
        digits.forEach((digit, i) => {
          if (i < 6) newOtp[i] = digit;
        });
        setOtp(newOtp);
        if (digits.length === 6) {
          otpRefs[5].current?.focus();
        }
      });
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);

    const otpCode = otp.join('');

    if (otpCode.length !== 6) {
      toast.error('Please enter complete 6-digit OTP');
      setLoading(false);
      return;
    }

    const loadingToast = toast.loading("Verifying OTP...");

    try {
      const res = await axios.post(`${API_URL}/auth/verify-otp`, {
        phone,
        otp_code: otpCode
      });

      toast.dismiss(loadingToast);

      // Save auth data to localStorage
      localStorage.setItem('auth_token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      toast.success(`Welcome ${res.data.user.is_new_user ? '' : 'back'}, ${res.data.user.name}!`, {
        icon: '🎉',
        style: {
          background: 'linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%)',
          color: '#fff',
          fontWeight: '600'
        }
      });

      // Redirect based on user status
      if (res.data.user.is_new_user || res.data.plans_count === 0) {
        // New user or no plans → Go to form
        setTimeout(() => navigate('/start'), 500);
      } else {
        // Existing user with plans → Go to dashboard
        setTimeout(() => navigate('/my-plans'), 500);
      }

    } catch (err) {
      console.error(err);
      toast.dismiss(loadingToast);

      if (err.response?.status === 401) {
        toast.error('Invalid OTP. Please check and try again.');
        setOtp(['', '', '', '', '', '']);
        otpRefs[0].current?.focus();
      } else {
        toast.error('Verification failed. Please try again.');
      }
    }
    setLoading(false);
  };

  const handleResendOTP = () => {
    if (countdown > 0) return;
    setOtp(['', '', '', '', '', '']);
    setStep('phone');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md relative">

        {/* Back Button */}
        <button
          onClick={() => step === 'otp' ? setStep('phone') : navigate('/')}
          className="absolute top-4 left-4 text-gray-400 hover:text-blue-600 transition"
        >
          <ArrowLeft size={20} />
        </button>

        {/* Header */}
        <div className="text-center mb-8 pt-4">
          <div className="bg-gradient-to-r from-blue-100 to-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            {step === 'phone' ? (
              <Phone className="text-blue-600" size={32} />
            ) : (
              <Shield className="text-green-600" size={32} />
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {step === 'phone' ? 'Login / Signup' : 'Verify OTP'}
          </h1>
          <p className="text-gray-500 text-sm">
            {step === 'phone'
              ? 'Enter your phone number to get started'
              : `OTP sent to +91 ${phone}`}
          </p>
        </div>

        {/* Phone Input Step */}
        {step === 'phone' && (
          <form onSubmit={handleSendOTP} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Mobile Number
              </label>
              <div className="relative">
                <div className="absolute left-3 top-3.5 text-gray-500 font-semibold">
                  +91
                </div>
                <input
                  type="tel"
                  required
                  maxLength="10"
                  placeholder="9876543210"
                  className="w-full pl-12 pr-4 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-lg"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                We'll send you a 6-digit verification code
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || phone.length !== 10}
              className="w-full bg-gradient-to-r from-blue-600 to-green-600 text-white py-3 rounded-xl font-bold hover:from-blue-700 hover:to-green-700 transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  Send OTP <ArrowRight size={18} className="ml-2" />
                </>
              )}
            </button>
          </form>
        )}

        {/* OTP Input Step */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOTP} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-4 text-center">
                Enter 6-Digit Code
              </label>
              <div className="flex justify-center gap-2">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={otpRefs[index]}
                    type="text"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleOTPChange(index, e.target.value)}
                    onKeyDown={(e) => handleOTPKeyDown(index, e)}
                    className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  />
                ))}
              </div>

              {/* Resend OTP */}
              <div className="text-center mt-4">
                {countdown > 0 ? (
                  <p className="text-sm text-gray-500">
                    Resend OTP in <span className="font-bold text-blue-600">{countdown}s</span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    className="text-sm text-blue-600 font-semibold hover:underline"
                  >
                    Didn't receive? Resend OTP
                  </button>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.join('').length !== 6}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <CheckCircle size={18} className="mr-2" /> Verify & Continue
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>
            By continuing, you agree to our{' '}
            <button onClick={() => navigate('/terms')} className="text-blue-600 hover:underline">
              Terms & Privacy Policy
            </button>
          </p>
        </div>

        {/* Security Badge */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
          <Shield size={14} />
          <span>Secured with end-to-end encryption</span>
        </div>
      </div>
    </div>
  );
}
