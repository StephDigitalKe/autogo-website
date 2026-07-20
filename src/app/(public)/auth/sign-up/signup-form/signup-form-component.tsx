'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Eye, EyeOff, Apple, Phone, Camera, MapPin, IdCard, CheckCircle, Building, FileText, Banknote, ArrowLeft, Upload, FileUp, ShieldCheck, ChevronRight, Users, X, Calendar, Clock, Car, Truck, Bus, Train, Globe, DollarSign, Smartphone, Star, Info, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { PasswordStrengthMeter } from '@/components/ui/password-strength-meter';
import { useAuth } from '@/context/AuthContext';
import { restoreGuestSession, clearGuestSession } from '@/components/auth/AutoSaveIntent';

type Role = 'customer' | 'host' | 'driver' | null;

// Host onboarding steps
const HOST_STEPS = [
  { id: 1, label: 'Account', icon: User },
  { id: 2, label: 'Identity', icon: IdCard },
  { id: 3, label: 'Business', icon: Building },
  { id: 4, label: 'Vehicle', icon: FileText },
  { id: 5, label: 'Payments', icon: Banknote },
  { id: 6, label: 'Agreement', icon: ShieldCheck },
];

const DRIVER_STEPS = [
  { id: 1, label: 'Account', icon: User },
  { id: 2, label: 'Personal Info', icon: IdCard },
  { id: 3, label: 'Documents', icon: FileText },
  { id: 4, label: 'Vehicle Info', icon: Car },
  { id: 5, label: 'Availability', icon: Calendar },
  { id: 6, label: 'Review', icon: ShieldCheck },
];

export function SignUpForm({ initialRole }: { initialRole?: string }) {
  const { login } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<Role>(() => {
    if (initialRole && ['customer', 'host', 'driver'].includes(initialRole)) {
      return initialRole as Role;
    }
    return null;
  });
  const [mounted, setMounted] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const [showVerification, setShowVerification] = useState(false);

  // Customer fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneCountry, setPhoneCountry] = useState('+254');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Host multi-step
  const [hostStep, setHostStep] = useState(1);
  const [businessType, setBusinessType] = useState<string | null>(null);
  const [isSubmittingHost, setIsSubmittingHost] = useState(false);
  const [idFiles, setIdFiles] = useState<Record<string, { name: string; preview: string }[]>>({});
  const [vehicleDocs, setVehicleDocs] = useState<Record<string, { name: string; preview: string }[]>>({});
  const [mpesaNumber, setMpesaNumber] = useState('');
  const [mpesaCountry, setMpesaCountry] = useState('+254');

  // Driver multi-step
  const [driverStep, setDriverStep] = useState(1);
  const [driverFirstName, setDriverFirstName] = useState('');
  const [driverLastName, setDriverLastName] = useState('');
  const [driverPersonal, setDriverPersonal] = useState({
    dateOfBirth: '', gender: '', idNumber: '', location: '',
  });
  const [driverDocs, setDriverDocs] = useState<Record<string, { fileName: string; url: string }>>({});
  const [driverVehicle, setDriverVehicle] = useState({
    type: '', make: '', model: '', year: new Date().getFullYear(),
    capacity: 15, color: '', registration: '',
    insuranceProvider: '', insuranceExpiry: '',
  });
  const [driverAvailability, setDriverAvailability] = useState(
    ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((name, i) => ({
      dayOfWeek: i, dayName: name, isAvailable: i > 0 && i < 6,
      startTime: '07:00', endTime: '18:00',
    }))
  );
  const [driverServiceAreas, setDriverServiceAreas] = useState<string[]>([]);
  const [driverLanguages, setDriverLanguages] = useState<string[]>(['English', 'Swahili']);
  const [driverAcceptsCash, setDriverAcceptsCash] = useState(true);
  const [driverAcceptsMpesa, setDriverAcceptsMpesa] = useState(true);
  const [isSubmittingDriver, setIsSubmittingDriver] = useState(false);

  const DRIVER_VEHICLE_TYPES = [
    { value: 'van', label: 'Van', icon: Truck, capacity: '8-15 pax' },
    { value: 'minibus', label: 'Mini Bus', icon: Bus, capacity: '16-30 pax' },
    { value: 'shuttle', label: 'Executive Shuttle', icon: Car, capacity: '8-20 pax' },
    { value: 'bus', label: 'Tour Bus', icon: Train, capacity: '30-60 pax' },
    { value: 'coach', label: 'Luxury Coach', icon: Train, capacity: '40-70 pax' },
  ];

  const DRIVER_SERVICE_AREAS = [
    'Nairobi CBD', 'Westlands', 'Karen', 'Mombasa Road', 'Thika Road',
    'Kiambu', 'Machakos', 'Naivasha', 'Nakuru', 'Mombasa', 'Kisumu', 'Eldoret',
  ];

  const DRIVER_LANGUAGES = ['English', 'Swahili', 'Kikuyu', 'Luo', 'Kamba', 'Kalenjin', 'Luhya', 'Somali'];

  const DRIVER_VEHICLE_MAKES = ['Toyota', 'Nissan', 'Mitsubishi', 'Isuzu', 'Mercedes', 'Scania', 'Hino', 'Volvo', 'Ford', 'Volkswagen'];

  const DRIVER_REQUIRED_DOCS = [
    { key: 'driving_license', label: 'Driving License', icon: Car },
    { key: 'psv_badge', label: 'PSV Badge', icon: ShieldCheck },
    { key: 'good_conduct', label: 'Certificate of Good Conduct', icon: ShieldCheck },
    { key: 'national_id', label: 'National ID / Passport', icon: FileText },
    { key: 'passport_photo', label: 'Passport Photo', icon: Camera },
  ];

  const driverCanProceed = () => {
    switch (driverStep) {
      case 1: return !!driverFirstName && !!driverLastName && !!email && !!password && !!confirmPassword && password === confirmPassword;
      case 2: return !!driverPersonal.idNumber;
      case 3: return DRIVER_REQUIRED_DOCS.every(d => driverDocs[d.key]);
      case 4: return !!driverVehicle.type && !!driverVehicle.make && !!driverVehicle.model && !!driverVehicle.registration;
      case 5: return driverServiceAreas.length > 0;
      default: return true;
    }
  };

  const updateDriverPersonal = (field: string, value: string) => setDriverPersonal(p => ({ ...p, [field]: value }));
  const updateDriverVehicle = (field: string, value: string | number) => setDriverVehicle(v => ({ ...v, [field]: value }));

  const toggleDriverDay = (i: number) => {
    setDriverAvailability(a => a.map((d, idx) => idx === i ? { ...d, isAvailable: !d.isAvailable } : d));
  };

  const updateDriverDayTime = (i: number, field: 'startTime' | 'endTime', value: string) => {
    setDriverAvailability(a => a.map((d, idx) => idx === i ? { ...d, [field]: value } : d));
  };

  const toggleDriverServiceArea = (area: string) => {
    setDriverServiceAreas(prev => prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]);
  };

  const toggleDriverLanguage = (lang: string) => {
    setDriverLanguages(prev => prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]);
  };

  const handleDriverUpload = (docType: string) => {
    setDriverDocs(d => ({ ...d, [docType]: { fileName: `${docType.replace(/_/g, ' ')}.pdf`, url: `/uploads/${docType}_${Date.now()}.pdf` } }));
  };

  const removeDriverDoc = (docType: string) => {
    const newDocs = { ...driverDocs };
    delete newDocs[docType];
    setDriverDocs(newDocs);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleRegister = async () => {
    if (!fullName || !email || !password || isRegistering) return;
    if (password !== confirmPassword) return;
    setIsRegistering(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: fullName, role: 'customer' }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Registration failed');
      }
      const data = await res.json();
      await login(data.token);

      const { hasSession, session } = restoreGuestSession();
      if (hasSession && session?.lastPath && session.lastPath !== '/auth/sign-up') {
        clearGuestSession();
        router.push(session.lastPath);
      } else {
        setShowVerification(true);
        setIsRegistering(false);
      }
    } catch (err) {
      console.error('Registration failed:', err);
      setIsRegistering(false);
    }
  };

  const handleGoogleAuth = async () => {
    if (googleLoading) return;
    setGoogleError('');
    setGoogleLoading(true);

    try {
      const googleEmail = `user_${Date.now()}@google.auth`;
      const googleName = 'Google User';
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: googleEmail, name: googleName, avatar: '' }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Google authentication failed' }));
        throw new Error(err.error || 'Google authentication failed');
      }

      const data = await res.json();
      if (!data.token) throw new Error('No token received');

      await login(data.token);
      router.push('/dashboard');
    } catch (err) {
      console.error('Google authentication failed:', err);
      setGoogleError(err instanceof Error ? err.message : 'Google authentication failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleDriverRegister = async () => {
    if (!driverFirstName || !driverLastName || !email || !password || isSubmittingDriver) return;
    if (password !== confirmPassword) return;
    setIsSubmittingDriver(true);
    try {
      // First create the account
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: `${driverFirstName} ${driverLastName}`, phone, role: 'driver' }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Registration failed');
      }
      const data = await res.json();
      await login(data.token);

      // Then submit the driver application
      const docLabels: Record<string, string> = {
        driving_license: 'Driving License',
        psv_badge: 'PSV Badge',
        good_conduct: 'Certificate of Good Conduct',
        national_id: 'National ID / Passport',
        passport_photo: 'Passport Photo',
      };
      const docsArray = Object.entries(driverDocs).map(([key, doc]) => ({
        type: key,
        label: docLabels[key] || key,
        fileName: doc.fileName,
        fileUrl: doc.url,
        status: 'pending' as const,
        uploadedAt: new Date().toISOString(),
      }));

      const payload = {
        firstName: driverFirstName,
        lastName: driverLastName,
        email,
        phone,
        dateOfBirth: driverPersonal.dateOfBirth,
        gender: driverPersonal.gender,
        idNumber: driverPersonal.idNumber,
        location: driverPersonal.location,
        documents: docsArray,
        vehicleType: driverVehicle.type,
        vehicleMake: driverVehicle.make,
        vehicleModel: driverVehicle.model,
        vehicleYear: driverVehicle.year,
        vehicleCapacity: driverVehicle.capacity,
        vehicleColor: driverVehicle.color,
        vehicleRegistration: driverVehicle.registration,
        insuranceProvider: driverVehicle.insuranceProvider,
        insuranceExpiry: driverVehicle.insuranceExpiry,
        availability: driverAvailability.filter(d => d.isAvailable).map(d => ({
          dayOfWeek: d.dayOfWeek,
          dayName: d.dayName,
          isAvailable: d.isAvailable,
          startTime: d.startTime,
          endTime: d.endTime,
        })),
        serviceAreas: driverServiceAreas,
        languages: driverLanguages,
        acceptsCash: driverAcceptsCash,
        acceptsMpesa: driverAcceptsMpesa,
      };

      const appRes = await fetch('/api/drivers/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!appRes.ok) {
        // Account created but application failed - still redirect to become-driver
        router.push('/become-driver');
        return;
      }

      router.push('/become-driver?submitted=true');
    } catch (err) {
      console.error('Driver registration failed:', err);
      setIsSubmittingDriver(false);
    }
  };

  // If no role selected, show role selection cards
  if (!role) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-gray-950 to-slate-900 flex items-center justify-center pt-36 md:pt-48 pb-12 px-6">
        <div className="max-w-2xl w-full" style={{ animation: mounted ? 'fadeInUp 0.7s ease-out both' : 'none' }}>
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-3 py-1 mb-3">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span className="text-white/70 text-[10px] font-medium tracking-wider uppercase">
                Join AutoGo
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-1">
              How will you use AutoGo?
            </h1>
            <p className="text-white/50 text-sm">Choose your path</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Customer Card */}
            <button
              onClick={() => setRole('customer')}
              className="group relative bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-xl p-4 text-left transition-all duration-300 hover:bg-white/[0.07] hover:border-primary/25 hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-primary/15 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CarIcon className="w-[18px] h-[18px] text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Rent a Vehicle</h3>
                  <p className="text-white/50 text-xs">Browse & book instantly</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {['Self Drive', 'SUVs', 'Luxury'].map(tag => (
                  <span key={tag} className="text-[10px] text-white/40 bg-white/[0.04] px-2 py-0.5 rounded-full">{tag}</span>
                ))}
              </div>
            </button>

            {/* Host Card */}
            <button
              onClick={() => setRole('host')}
              className="group relative bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-xl p-4 text-left transition-all duration-300 hover:bg-white/[0.07] hover:border-amber-400/25 hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-amber-400/15 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <WalletIcon className="w-[18px] h-[18px] text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Become a Host</h3>
                  <p className="text-white/50 text-xs">Earn from your vehicle</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {['Earn Income', 'Flexible', 'Secure'].map(tag => (
                  <span key={tag} className="text-[10px] text-white/40 bg-white/[0.04] px-2 py-0.5 rounded-full">{tag}</span>
                ))}
              </div>
            </button>

            {/* Driver Card */}
            <button
              onClick={() => setRole('driver')}
              className="group relative bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-xl p-4 text-left transition-all duration-300 hover:bg-white/[0.07] hover:border-green-400/25 hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-green-400/15 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-[18px] h-[18px] text-green-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Become a Driver</h3>
                  <p className="text-white/50 text-xs">Drive & earn with us</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {['Flexible Hours', 'Competitive Pay', 'Benefits'].map(tag => (
                  <span key={tag} className="text-[10px] text-white/40 bg-white/[0.04] px-2 py-0.5 rounded-full">{tag}</span>
                ))}
              </div>
            </button>
          </div>

          <p className="text-center text-white/50 text-xs mt-6">
            Already have an account?{' '}
            <Link href="/auth/sign-in" className="text-primary font-semibold hover:underline">Sign In</Link>
          </p>
        </div>

        <style jsx>{`
          @keyframes fadeInUp {
            0% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  const isCustomer = role === 'customer';
  const isDriver = role === 'driver';
  const progressPercent = isCustomer ? 100 : isDriver ? Math.round((driverStep / DRIVER_STEPS.length) * 100) : Math.round((hostStep / HOST_STEPS.length) * 100);

  return (
    <div className="min-h-screen flex">
      {/* Left - Form */}
      <div className={`flex-1 flex items-start justify-center px-6 pt-36 md:pt-44 pb-12 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="w-full max-w-lg">
          {/* Back button */}
          <button
            onClick={() => {
              if (role === 'host' && hostStep > 1) {
                setHostStep(hostStep - 1);
              } else if (role === 'driver' && driverStep > 1) {
                setDriverStep(driverStep - 1);
              } else {
                setRole(null);
              }
            }}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            {role === 'host' && hostStep > 1 ? 'Previous Step' : role === 'driver' && driverStep > 1 ? 'Previous Step' : 'Change Role'}
          </button>

          {/* Progress Bar */}
          {(role === 'host' || role === 'driver') && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-foreground">
                  {role === 'host' ? `Step ${hostStep} of ${HOST_STEPS.length}: ${HOST_STEPS[hostStep - 1].label}`
                    : `Step ${driverStep} of ${DRIVER_STEPS.length}: ${DRIVER_STEPS[driverStep - 1].label}`}
                </h2>
                <span className="text-sm text-muted-foreground">{progressPercent}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${role === 'host' ? 'bg-amber-500' : 'bg-green-500'}`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {/* Step indicators */}
              <div className="flex items-start justify-between mt-3">
                {(role === 'host' ? HOST_STEPS : DRIVER_STEPS).map((step, i) => {
                  const StepIcon = step.icon;
                  const currentStep = role === 'host' ? hostStep : driverStep;
                  const isActive = currentStep === step.id;
                  const isDone = currentStep > step.id;
                  const accent = role === 'host' ? 'amber' : 'green';
                  return (
                    <div key={step.id} className="flex flex-col items-center gap-1.5">
                      <div className="flex items-center gap-1">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                            isDone
                              ? `bg-${accent}-500 text-white`
                              : isActive
                              ? `bg-${accent}-500/20 text-${accent}-500 border border-${accent}-500`
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {isDone ? (
                            <CheckCircle className="w-3.5 h-3.5" />
                          ) : (
                            <StepIcon className="w-3.5 h-3.5" />
                          )}
                        </div>
                        {i < (role === 'host' ? HOST_STEPS : DRIVER_STEPS).length - 1 && (
                          <div className={`h-px w-3 md:w-8 ${isDone ? `bg-${accent}-500` : 'bg-muted'}`} />
                        )}
                      </div>
                      <span className={`text-[10px] leading-tight text-center max-w-14 ${isActive ? `text-${accent}-500 font-medium` : 'text-muted-foreground'}`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Customer Registration */}
          {isCustomer && !showVerification && (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">Create your account</h1>
                <p className="text-muted-foreground">Join as a customer to start renting premium vehicles.</p>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleRegister(); }} className="space-y-4">
                <Input
                  label="Full Name"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  icon={<User className="w-4 h-4" />}
                />
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon={<Mail className="w-4 h-4" />}
                />
                <PhoneInput
                  label="Phone Number"
                  value={phone}
                  onChange={setPhone}
                  countryCode={phoneCountry}
                  onCountryCodeChange={setPhoneCountry}
                  placeholder="7XX XXX XXX"
                  icon={<Phone className="w-4 h-4" />}
                />
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={<Lock className="w-4 h-4" />}
                  rightIcon={
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />
                <PasswordStrengthMeter password={password} />
                <Input
                  label="Confirm Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  icon={<Lock className="w-4 h-4" />}
                />

                {/* Optional Fields */}
                <div className="bg-muted/30 rounded-xl p-4 border border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Optional</p>
                  <div className="space-y-3">
                    <button type="button" className="flex items-center gap-3 w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
                      <Camera className="w-4 h-4" />
                      Add Profile Photo
                    </button>
                    <button type="button" className="flex items-center gap-3 w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
                      <MapPin className="w-4 h-4" />
                      Set Preferred Pickup Location
                    </button>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  By signing up, you agree to our{' '}
                  <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link> and{' '}
                  <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                </p>

                <Button size="lg" fullWidth disabled={isRegistering} className="hover:scale-[1.02] active:scale-[0.98] transition-transform">
                  {isRegistering ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center"><span className="bg-white px-4 text-sm text-muted-foreground">Or continue with</span></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button type="button" variant="secondary" size="md" loading={googleLoading} onClick={handleGoogleAuth}>
                  Google
                </Button>
                <Button type="button" variant="secondary" size="md" onClick={() => router.push('/become-host/onboarding')}>
                  <Apple className="w-5 h-5" />
                  Apple
                </Button>
              </div>
              {googleError && (
                <div className="text-sm text-red-600 mt-2">
                  {googleError}
                </div>
              )}

              <p className="text-center text-sm text-muted-foreground mt-6">
                Already have an account?{' '}
                <Link href="/auth/sign-in" className="text-primary font-semibold hover:underline">Sign In</Link>
              </p>
            </>
          )}

          {/* Customer - Verification Prompt After Sign-up */}
          {isCustomer && showVerification && (
            <>
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium mb-3">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Account Created
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Verify Your Identity</h1>
                <p className="text-muted-foreground text-sm">
                  Verify your identity to unlock full access and faster bookings.
                </p>
              </div>
              <div className="space-y-4">
                <div className="bg-muted/30 rounded-xl p-5 border border-border">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Identity verification recommended</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Verify your identity to unlock faster bookings and full platform access.
                        You can also do this later from your dashboard.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    size="lg"
                    fullWidth
                    onClick={() => router.push('/auth/verify-identity')}
                    className="hover:scale-[1.02] active:scale-[0.98] transition-transform"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Verify Identity
                  </Button>
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard')}
                    className="text-primary font-semibold hover:underline"
                  >
                    Skip for now &rarr;
                  </button>
                </p>
              </div>
            </>
          )}

          {/* Host Registration - Multi-step */}
          {role === 'host' && (
            <>
              <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                  {hostStep === 1 && 'Create Your Host Account'}
                  {hostStep === 2 && 'Verify Your Identity'}
                  {hostStep === 3 && 'Business Information'}
                  {hostStep === 4 && 'Vehicle Ownership'}
                  {hostStep === 5 && 'Banking & Payments'}
                  {hostStep === 6 && 'Host Agreement'}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {hostStep === 1 && 'Start your journey to earning from your vehicle.'}
                  {hostStep === 2 && 'Upload identification documents for verification.'}
                  {hostStep === 3 && 'Tell us about your business type.'}
                  {hostStep === 4 && 'Provide vehicle ownership documents.'}
                  {hostStep === 5 && 'Set up your payment method.'}
                  {hostStep === 6 && 'Review and accept the host terms.'}
                </p>
              </div>

              <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                {/* Step 1: Account Details */}
                {hostStep === 1 && (
                  <>
                    <Input label="Full Name" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} icon={<User className="w-4 h-4" />} />
                    <Input label="Email Address" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} icon={<Mail className="w-4 h-4" />} />
                    <PhoneInput
                      label="Phone Number"
                      value={phone}
                      onChange={setPhone}
                      countryCode={phoneCountry}
                      onCountryCodeChange={setPhoneCountry}
                      placeholder="7XX XXX XXX"
                      icon={<Phone className="w-4 h-4" />}
                    />
                    <Input label="Password" type={showPassword ? 'text' : 'password'} placeholder="Create a strong password" value={password} onChange={(e) => setPassword(e.target.value)} icon={<Lock className="w-4 h-4" />}
                      rightIcon={<button type="button" onClick={() => setShowPassword(!showPassword)} className="text-muted-foreground hover:text-foreground transition-colors">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>}
                    />
                    <PasswordStrengthMeter password={password} />
                    <Input
                      label="Confirm Password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      icon={<Lock className="w-4 h-4" />}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (password !== confirmPassword) return;
                        setHostStep(2);
                      }}
                      className="w-full h-13 px-8 text-base gap-2.5 inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 bg-primary text-white hover:bg-primary-dark shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!fullName || !email || !password || !confirmPassword || password !== confirmPassword}
                    >
                      Continue <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}

                {/* Step 2: Identity Verification */}
                {hostStep === 2 && (
                  <>
                    <div className="mb-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Upload identification documents</p>
                      <p className="text-xs text-muted-foreground">Upload at least one document to verify your identity.</p>
                    </div>
                    <div className="space-y-4">
                      <div className="grid gap-4">
                        {[
                          { key: 'national_id', label: 'National ID', desc: 'Front and back of your ID card', icon: IdCard },
                          { key: 'selfie', label: 'Selfie Verification', desc: 'A clear photo of your face', icon: Camera },
                        ].map(({ key, label, desc, icon: Icon }) => {
                          const sectionFiles = idFiles[key] || [];
                          return (
                            <div key={key} className="rounded-2xl border border-border p-5">
                              <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                                  <Icon className="w-5 h-5 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-semibold text-foreground">{label}</h4>
                                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                                  {sectionFiles.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                      {sectionFiles.map((f, i) => (
                                        <div key={i} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-border">
                                          <div className="w-8 h-8 rounded-md overflow-hidden bg-muted shrink-0">
                                            <img src={f.preview} alt="" className="w-full h-full object-cover" />
                                          </div>
                                          <span className="text-xs text-foreground truncate flex-1">{f.name}</span>
                                          <button type="button" onClick={() => {
                                            const arr = [...(idFiles[key] || [])];
                                            arr.splice(i, 1);
                                            setIdFiles((prev) => {
                                              const updated = { ...prev };
                                              if (arr.length === 0) delete updated[key];
                                              else updated[key] = arr;
                                              return updated;
                                            });
                                          }} className="w-5 h-5 bg-red-50 text-red-500 rounded-full flex items-center justify-center hover:bg-red-100 shrink-0">
                                            <X className="w-3 h-3" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  <label className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer">
                                    <Upload className="w-3.5 h-3.5" />
                                    Upload {label}
                                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => {
                                      const selected = Array.from(e.target.files || []);
                                      if (selected.length === 0) return;
                                      const items = selected.map((f) => ({ name: f.name, preview: URL.createObjectURL(f) }));
                                      setIdFiles((prev) => ({ ...prev, [key]: [...(prev[key] || []), ...items] }));
                                    }} />
                                  </label>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-3 pt-2">
                        <button type="button" onClick={() => setHostStep(1)} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                          <ArrowLeft className="w-4 h-4" /> Back
                        </button>
                        <button
                          type="button"
                          onClick={() => setHostStep(3)}
                          disabled={Object.values(idFiles).flat().length === 0}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all ${
                            Object.values(idFiles).flat().length > 0
                              ? 'bg-primary text-white hover:bg-primary/90'
                              : 'bg-muted text-muted-foreground cursor-not-allowed'
                          }`}
                        >
                          <ShieldCheck className="w-4 h-4" /> Continue <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Step 3: Business Information */}
                {hostStep === 3 && (
                  <>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Choose your account type</p>
                    {[
                      { icon: User, label: 'Individual Host', desc: 'List your personal vehicle(s)' },
                      { icon: Building, label: 'Dealership', desc: 'Multiple vehicles for sale & rent' },
                      { icon: Building, label: 'Rental Company', desc: 'Fleet of rental vehicles' },
                      { icon: Users, label: 'Fleet Operator', desc: 'Manage multiple vehicle owners' },
                    ].map(({ icon: Icon, label, desc }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setBusinessType(label)}
                        className={`flex items-center gap-4 w-full p-4 rounded-xl border transition-all text-left group ${
                          businessType === label
                            ? 'border-amber-400 bg-amber-50/10'
                            : 'border-border hover:border-amber-400/30 hover:bg-amber-50/5'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-amber-400/10 transition-colors">
                          <Icon className="w-5 h-5 text-muted-foreground group-hover:text-amber-400 transition-colors" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{label}</p>
                          <p className="text-xs text-muted-foreground">{desc}</p>
                        </div>
                      </button>
                    ))}
                    <div className="flex gap-3 pt-2">
                      <Button variant="secondary" size="lg" onClick={() => setHostStep(2)}>Back</Button>
                      <Button size="lg" fullWidth onClick={() => setHostStep(4)} className="hover:scale-[1.02] active:scale-[0.98] transition-transform">
                        Continue <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                )}

                {/* Step 4: Vehicle Ownership */}
                {hostStep === 4 && (
                  <>
                    <div className="mb-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Upload vehicle documents</p>
                      <p className="text-xs text-muted-foreground">Upload at least one document to continue.</p>
                    </div>
                    <div className="space-y-4">
                      <div className="grid gap-4">
                        {[
                          { key: 'logbook', label: 'Vehicle Registration Logbook', desc: 'Certificate of registration', icon: FileText },
                          { key: 'photos', label: 'Vehicle Photos', desc: 'Exterior & interior (min 4 photos)', icon: Camera },
                          { key: 'insurance', label: 'Insurance Certificate', desc: 'Valid insurance cover', icon: ShieldCheck },
                          { key: 'inspection', label: 'Inspection Certificate', desc: 'Roadworthy inspection report', icon: FileUp },
                        ].map(({ key, label, desc, icon: Icon }) => {
                          const sectionFiles = vehicleDocs[key] || [];
                          return (
                            <div key={key} className="rounded-2xl border border-border p-5">
                              <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                                  <Icon className="w-5 h-5 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-semibold text-foreground">{label}</h4>
                                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                                  {sectionFiles.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                      {sectionFiles.map((f, i) => (
                                        <div key={i} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-border">
                                          <div className="w-8 h-8 rounded-md overflow-hidden bg-muted shrink-0">
                                            <img src={f.preview} alt="" className="w-full h-full object-cover" />
                                          </div>
                                          <span className="text-xs text-foreground truncate flex-1">{f.name}</span>
                                          <button type="button" onClick={() => {
                                            const arr = [...(vehicleDocs[key] || [])];
                                            arr.splice(i, 1);
                                            setVehicleDocs((prev) => {
                                              const updated = { ...prev };
                                              if (arr.length === 0) delete updated[key];
                                              else updated[key] = arr;
                                              return updated;
                                            });
                                          }} className="w-5 h-5 bg-red-50 text-red-500 rounded-full flex items-center justify-center hover:bg-red-100 shrink-0">
                                            <X className="w-3 h-3" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  <label className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer">
                                    <Upload className="w-3.5 h-3.5" />
                                    Upload {label}
                                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" multiple={key === 'photos'} onChange={(e) => {
                                      const selected = Array.from(e.target.files || []);
                                      if (selected.length === 0) return;
                                      const items = selected.map((f) => ({ name: f.name, preview: URL.createObjectURL(f) }));
                                      setVehicleDocs((prev) => ({ ...prev, [key]: [...(prev[key] || []), ...items] }));
                                    }} />
                                  </label>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-3 pt-2">
                        <button type="button" onClick={() => setHostStep(3)} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                          <ArrowLeft className="w-4 h-4" /> Back
                        </button>
                        <button
                          type="button"
                          onClick={() => setHostStep(5)}
                          disabled={Object.values(vehicleDocs).flat().length === 0}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all ${
                            Object.values(vehicleDocs).flat().length > 0
                              ? 'bg-primary text-white hover:bg-primary/90'
                              : 'bg-muted text-muted-foreground cursor-not-allowed'
                          }`}
                        >
                          <ShieldCheck className="w-4 h-4" /> Continue <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Step 5: Banking & Payments */}
                {hostStep === 5 && (
                  <>
                    <PhoneInput
                      label="M-Pesa Number"
                      value={mpesaNumber}
                      onChange={setMpesaNumber}
                      countryCode={mpesaCountry}
                      onCountryCodeChange={setMpesaCountry}
                      placeholder="7XX XXX XXX"
                      icon={<Phone className="w-4 h-4" />}
                    />
                    <Input label="Bank Account Number" placeholder="Enter your bank account" icon={<Banknote className="w-4 h-4" />} />
                    <Input label="Account Holder Name" placeholder="Full name on bank account" icon={<User className="w-4 h-4" />} />
                    <div className="flex gap-3 pt-2">
                      <Button variant="secondary" size="lg" onClick={() => setHostStep(4)}>Back</Button>
                      <Button size="lg" fullWidth onClick={() => setHostStep(6)} className="hover:scale-[1.02] active:scale-[0.98] transition-transform">
                        Continue <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                )}

                {/* Step 6: Host Agreement */}
                {hostStep === 6 && (
                  <>
                    <div className="space-y-3 mb-6">
                      {[
                        { icon: FileText, label: 'AutoGo Host Terms', desc: 'Platform usage and listing rules' },
                        { icon: ShieldCheck, label: 'Insurance Terms', desc: 'Coverage and liability details' },
                        { icon: Banknote, label: 'Revenue Sharing Terms', desc: 'Commission and payout structure' },
                      ].map(({ icon: Icon, label, desc }) => (
                        <label
                          key={label}
                          className="flex items-start gap-3 p-4 rounded-xl border border-border hover:border-amber-400/30 transition-all cursor-pointer"
                        >
                          <input type="checkbox" className="mt-0.5 accent-amber-500 w-4 h-4" />
                          <div className="flex items-center gap-3 flex-1">
                            <Icon className="w-5 h-5 text-amber-500 shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-foreground">{label}</p>
                              <p className="text-xs text-muted-foreground">{desc}</p>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>

                    {/* Status Preview */}
                    <div className="bg-muted/30 rounded-xl p-4 border border-border mb-4">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">After Submission</p>
                      <div className="space-y-2">
                        {['Pending Review', 'Under Verification', 'Approved Host', 'List Vehicles'].map((step, i, arr) => (
                          <div key={step} className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${i === 0 ? 'border-amber-500 text-amber-500' : 'border-muted-foreground/30 text-muted-foreground/30'}`}>
                              <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-amber-500' : 'bg-muted-foreground/30'}`} />
                            </div>
                            <span className={`text-sm ${i === 0 ? 'text-amber-500 font-medium' : 'text-muted-foreground/50'}`}>{step}</span>
                            {i < arr.length - 1 && <div className="flex-1 h-px bg-muted-foreground/20 mx-2" />}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">Estimated review time: 24-48 hours</p>
                    </div>

                    <div className="flex gap-3">
                      <Button variant="secondary" size="lg" onClick={() => setHostStep(5)}>Back</Button>
                      <Button size="lg" fullWidth disabled={isSubmittingHost} onClick={async () => {
                        setIsSubmittingHost(true);
                        try {
                          const res = await fetch('/api/auth/signup', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email, password, name: fullName, phone, role: 'host' }),
                          });
                          if (!res.ok) {
                            const err = await res.json();
                            throw new Error(err.error || 'Registration failed');
                          }
                          const data = await res.json();
                          await login(data.token);
                          router.push('/become-host/onboarding');
                        } catch (err) {
                          console.error('Host registration failed:', err);
                          setIsSubmittingHost(false);
                        }
                      }} className="bg-amber-500 hover:bg-amber-400 hover:scale-[1.02] active:scale-[0.98] transition-transform">
                        {isSubmittingHost ? 'Submitting...' : 'Submit for Review'}
                      </Button>
                    </div>
                  </>
                )}
              </form>
            </>
          )}

          {/* Driver Registration - Multi-step */}
          {role === 'driver' && (
            <>
              <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                {/* Step 1: Account Details */}
                {driverStep === 1 && (
                  <>
                    <div className="mb-6">
                      <h1 className="text-3xl font-bold text-foreground mb-2">Create Your Driver Account</h1>
                      <p className="text-muted-foreground">Join our driver network and start earning.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        label="First Name"
                        placeholder="John"
                        value={driverFirstName}
                        onChange={(e) => setDriverFirstName(e.target.value)}
                        icon={<User className="w-4 h-4" />}
                        compulsory
                      />
                      <Input
                        label="Surname"
                        placeholder="Kamau"
                        value={driverLastName}
                        onChange={(e) => setDriverLastName(e.target.value)}
                        icon={<User className="w-4 h-4" />}
                        compulsory
                      />
                    </div>
                    <Input
                      label="Email Address"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      icon={<Mail className="w-4 h-4" />}
                      compulsory
                    />
                    <PhoneInput
                      label="Phone Number"
                      value={phone}
                      onChange={setPhone}
                      countryCode={phoneCountry}
                      onCountryCodeChange={setPhoneCountry}
                      placeholder="7XX XXX XXX"
                      icon={<Phone className="w-4 h-4" />}
                      required
                    />
                    <Input
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a strong password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      icon={<Lock className="w-4 h-4" />}
                      rightIcon={
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-muted-foreground hover:text-foreground transition-colors">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      }
                      compulsory
                    />
                    <PasswordStrengthMeter password={password} />
                    <Input
                      label="Confirm Password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      icon={<Lock className="w-4 h-4" />}
                      compulsory
                    />
                    <p className="text-xs text-muted-foreground">
                      <span className="text-red-500">*</span> Required fields
                    </p>
                    <p className="text-xs text-muted-foreground -mt-2">
                      By signing up, you agree to our{' '}
                      <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link> and{' '}
                      <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        if (password !== confirmPassword) return;
                        setDriverStep(2);
                      }}
                      className="w-full h-13 px-8 text-base gap-2.5 inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!driverFirstName || !driverLastName || !email || !password || !confirmPassword || password !== confirmPassword}
                    >
                      Continue <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}

                {/* Step 2: Personal Info */}
                {driverStep === 2 && (
                  <>
                    <div className="mb-6">
                      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Personal Information</h1>
                      <p className="text-muted-foreground text-sm">Tell us more about yourself</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Date of Birth <span className="text-muted-foreground/60 font-normal">(Optional)</span></label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <input
                            type="date"
                            value={driverPersonal.dateOfBirth}
                            onChange={(e) => updateDriverPersonal('dateOfBirth', e.target.value)}
                            className="w-full h-11 pl-9 pr-3 bg-white border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Gender <span className="text-muted-foreground/60 font-normal">(Optional)</span></label>
                        <select
                          value={driverPersonal.gender}
                          onChange={(e) => updateDriverPersonal('gender', e.target.value)}
                          className="w-full h-11 px-3 bg-white border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30"
                        >
                          <option value="">Select</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>
                      <Input
                        label="National ID / Passport No."
                        placeholder="ID Number"
                        value={driverPersonal.idNumber}
                        onChange={(e) => updateDriverPersonal('idNumber', e.target.value)}
                        icon={<FileText className="w-4 h-4" />}
                        compulsory
                      />
                      <Input
                        label="Your Location"
                        placeholder="e.g. Nairobi, Kenya"
                        value={driverPersonal.location}
                        onChange={(e) => updateDriverPersonal('location', e.target.value)}
                        icon={<MapPin className="w-4 h-4" />}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="text-red-500">*</span> Required fields
                    </p>
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setDriverStep(1)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" /> Back
                      </button>
                      <button
                        type="button"
                        onClick={() => setDriverStep(3)}
                        disabled={!driverPersonal.idNumber}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all bg-green-500 text-white hover:bg-green-600 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
                      >
                        Continue <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}

                {/* Step 3: Documents */}
                {driverStep === 3 && (
                  <>
                    <div className="mb-6">
                      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Upload Documents</h1>
                      <p className="text-muted-foreground text-sm">Upload clear photos/scans of the following documents</p>
                    </div>
                    <div className="space-y-3">
                      {DRIVER_REQUIRED_DOCS.map((doc) => {
                        const uploaded = driverDocs[doc.key];
                        const Icon = doc.icon;
                        return (
                          <div key={doc.key} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${uploaded ? 'bg-green-50 border-green-200' : 'bg-white border-border/50 hover:border-green-500/20'}`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${uploaded ? 'bg-green-100' : 'bg-muted'}`}>
                                {uploaded ? <CheckCircle className="w-5 h-5 text-green-600" /> : <Icon className="w-5 h-5 text-muted-foreground" />}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">{doc.label}</p>
                                {uploaded && <p className="text-xs text-green-600">{uploaded.fileName}</p>}
                              </div>
                            </div>
                            {uploaded ? (
                              <button onClick={() => removeDriverDoc(doc.key)} className="text-xs text-red-500 hover:text-red-700 font-medium">Remove</button>
                            ) : (
                              <button onClick={() => handleDriverUpload(doc.key)} className="flex items-center gap-1 text-xs text-primary font-medium hover:text-primary-dark">
                                <Upload className="w-3 h-3" /> Upload
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                      <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800">Documents will be verified within 1-2 business days. Ensure all details are clearly visible.</p>
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setDriverStep(2)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" /> Back
                      </button>
                      <button
                        type="button"
                        onClick={() => setDriverStep(4)}
                        disabled={!DRIVER_REQUIRED_DOCS.every(d => driverDocs[d.key])}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all bg-green-500 text-white hover:bg-green-600 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
                      >
                        Continue <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}

                {/* Step 4: Vehicle Info */}
                {driverStep === 4 && (
                  <>
                    <div className="mb-6">
                      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Vehicle Information</h1>
                      <p className="text-muted-foreground text-sm">Tell us about the vehicle you&apos;ll be driving</p>
                    </div>

                    <label className="text-xs font-medium text-muted-foreground mb-2 block">Vehicle Type</label>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-6">
                      {DRIVER_VEHICLE_TYPES.map((vt) => {
                        const Icon = vt.icon;
                        const isSelected = driverVehicle.type === vt.value;
                        return (
                          <button key={vt.value} type="button" onClick={() => updateDriverVehicle('type', vt.value)} className={`p-3 rounded-xl border text-center transition-all ${isSelected ? 'bg-green-500/10 border-green-500 text-green-600' : 'bg-white border-border/50 text-muted-foreground hover:border-green-500/30'}`}>
                            <Icon className="w-6 h-6 mx-auto mb-1" />
                            <p className="text-xs font-medium">{vt.label}</p>
                            <p className="text-[10px] opacity-70">{vt.capacity}</p>
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Make</label>
                        <select value={driverVehicle.make} onChange={(e) => updateDriverVehicle('make', e.target.value)} className="w-full h-11 px-4 bg-white border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30">
                          <option value="">Select make</option>
                          {DRIVER_VEHICLE_MAKES.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Model</label>
                        <input value={driverVehicle.model} onChange={(e) => updateDriverVehicle('model', e.target.value)} placeholder="e.g. Hiace, Coaster" className="w-full h-11 px-4 bg-white border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Year</label>
                        <input type="number" value={driverVehicle.year} onChange={(e) => updateDriverVehicle('year', Number(e.target.value))} className="w-full h-11 px-4 bg-white border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Capacity (seats)</label>
                        <input type="number" value={driverVehicle.capacity} onChange={(e) => updateDriverVehicle('capacity', Number(e.target.value))} className="w-full h-11 px-4 bg-white border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Color</label>
                        <input value={driverVehicle.color} onChange={(e) => updateDriverVehicle('color', e.target.value)} placeholder="e.g. White, Silver" className="w-full h-11 px-4 bg-white border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Registration No.</label>
                        <input value={driverVehicle.registration} onChange={(e) => updateDriverVehicle('registration', e.target.value)} placeholder="e.g. KCA 123T" className="w-full h-11 px-4 bg-white border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Insurance Provider</label>
                        <input value={driverVehicle.insuranceProvider} onChange={(e) => updateDriverVehicle('insuranceProvider', e.target.value)} placeholder="e.g. Jubilee Insurance" className="w-full h-11 px-4 bg-white border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Insurance Expiry</label>
                        <input type="date" value={driverVehicle.insuranceExpiry} onChange={(e) => updateDriverVehicle('insuranceExpiry', e.target.value)} className="w-full h-11 px-4 bg-white border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setDriverStep(3)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" /> Back
                      </button>
                      <button
                        type="button"
                        onClick={() => setDriverStep(5)}
                        disabled={!driverVehicle.type || !driverVehicle.make || !driverVehicle.model || !driverVehicle.registration}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all bg-green-500 text-white hover:bg-green-600 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
                      >
                        Continue <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}

                {/* Step 5: Availability */}
                {driverStep === 5 && (
                  <>
                    <div className="mb-6">
                      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Availability & Preferences</h1>
                      <p className="text-muted-foreground text-sm">Set your schedule and service preferences</p>
                    </div>

                    <p className="text-xs font-medium text-muted-foreground mb-2">Available Days</p>
                    <div className="space-y-2 mb-6">
                      {driverAvailability.map((day, i) => (
                        <div key={day.dayName} className="flex items-center gap-3 p-3 rounded-xl border border-border/50">
                          <button
                            type="button"
                            onClick={() => toggleDriverDay(i)}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${day.isAvailable ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}
                          >
                            {day.isAvailable && <CheckCircle className="w-3 h-3 text-white" />}
                          </button>
                          <span className={`text-sm w-28 font-medium ${day.isAvailable ? 'text-foreground' : 'text-muted-foreground'}`}>{day.dayName}</span>
                          {day.isAvailable && (
                            <div className="flex items-center gap-2 ml-auto">
                              <input type="time" value={day.startTime} onChange={(e) => updateDriverDayTime(i, 'startTime', e.target.value)} className="h-9 px-3 border border-border/50 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30" />
                              <span className="text-xs text-muted-foreground">to</span>
                              <input type="time" value={day.endTime} onChange={(e) => updateDriverDayTime(i, 'endTime', e.target.value)} className="h-9 px-3 border border-border/50 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <p className="text-xs font-medium text-muted-foreground mb-2">Service Areas</p>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {DRIVER_SERVICE_AREAS.map(area => (
                        <button
                          key={area}
                          type="button"
                          onClick={() => toggleDriverServiceArea(area)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${driverServiceAreas.includes(area) ? 'bg-green-500/10 border-green-500 text-green-600' : 'bg-white border-border/50 text-muted-foreground hover:border-green-500/30'}`}
                        >
                          {area}
                        </button>
                      ))}
                    </div>

                    <p className="text-xs font-medium text-muted-foreground mb-2">Languages</p>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {DRIVER_LANGUAGES.map(lang => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => toggleDriverLanguage(lang)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${driverLanguages.includes(lang) ? 'bg-green-500/10 border-green-500 text-green-600' : 'bg-white border-border/50 text-muted-foreground hover:border-green-500/30'}`}
                        >
                          <Globe className="w-3 h-3 inline mr-1" />{lang}
                        </button>
                      ))}
                    </div>

                    <p className="text-xs font-medium text-muted-foreground mb-2">Payment Methods</p>
                    <div className="flex gap-2 mb-6">
                      <button
                        type="button"
                        onClick={() => setDriverAcceptsCash(!driverAcceptsCash)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${driverAcceptsCash ? 'bg-green-500/10 border-green-500 text-green-600' : 'bg-white border-border/50 text-muted-foreground'}`}
                      >
                        <DollarSign className="w-4 h-4" /> Cash
                      </button>
                      <button
                        type="button"
                        onClick={() => setDriverAcceptsMpesa(!driverAcceptsMpesa)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${driverAcceptsMpesa ? 'bg-green-500/10 border-green-500 text-green-600' : 'bg-white border-border/50 text-muted-foreground'}`}
                      >
                        <Smartphone className="w-4 h-4" /> M-Pesa
                      </button>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setDriverStep(4)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" /> Back
                      </button>
                      <button
                        type="button"
                        onClick={() => setDriverStep(6)}
                        disabled={driverServiceAreas.length === 0}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all bg-green-500 text-white hover:bg-green-600 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
                      >
                        Continue <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}

                {/* Step 6: Review & Submit */}
                {driverStep === 6 && (
                  <>
                    <div className="mb-6">
                      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Review & Submit</h1>
                      <p className="text-muted-foreground text-sm">Please review your information before submitting</p>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-muted/20 rounded-xl p-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Account</p>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Name</span><span className="font-medium text-foreground">{driverFirstName} {driverLastName}</span></div>
                          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Email</span><span className="font-medium text-foreground">{email}</span></div>
                          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Phone</span><span className="font-medium text-foreground">{phone}</span></div>
                        </div>
                      </div>
                      <div className="bg-muted/20 rounded-xl p-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Personal Info</p>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm"><span className="text-muted-foreground">ID Number</span><span className="font-medium text-foreground">{driverPersonal.idNumber}</span></div>
                          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Location</span><span className="font-medium text-foreground">{driverPersonal.location || 'Not specified'}</span></div>
                        </div>
                      </div>
                      <div className="bg-muted/20 rounded-xl p-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Documents</p>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Uploaded</span>
                          <span className="font-medium text-foreground">{Object.keys(driverDocs).length} of {DRIVER_REQUIRED_DOCS.length} complete</span>
                        </div>
                      </div>
                      <div className="bg-muted/20 rounded-xl p-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Vehicle</p>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Type</span><span className="font-medium text-foreground">{DRIVER_VEHICLE_TYPES.find(v => v.value === driverVehicle.type)?.label || driverVehicle.type}</span></div>
                          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Make/Model</span><span className="font-medium text-foreground">{driverVehicle.make} {driverVehicle.model}</span></div>
                          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Registration</span><span className="font-medium text-foreground">{driverVehicle.registration}</span></div>
                          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Capacity</span><span className="font-medium text-foreground">{driverVehicle.capacity} seats</span></div>
                        </div>
                      </div>
                      <div className="bg-muted/20 rounded-xl p-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Availability</p>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Days Available</span><span className="font-medium text-foreground">{driverAvailability.filter(d => d.isAvailable).length} days</span></div>
                          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Service Areas</span><span className="font-medium text-foreground">{driverServiceAreas.join(', ')}</span></div>
                          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Languages</span><span className="font-medium text-foreground">{driverLanguages.join(', ')}</span></div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 p-4 bg-green-50/50 border border-green-200/50 rounded-xl">
                      <label className="flex items-start gap-3">
                        <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-green-500 focus:ring-green-500/30 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-foreground">I confirm all information provided is accurate</p>
                          <p className="text-xs text-muted-foreground">By submitting, you agree to AutoGo&apos;s Driver Terms of Service and Privacy Policy.</p>
                        </div>
                      </label>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setDriverStep(5)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" /> Back
                      </button>
                      <button
                        type="button"
                        onClick={handleDriverRegister}
                        disabled={isSubmittingDriver}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all bg-green-500 text-white hover:bg-green-600 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
                      >
                        {isSubmittingDriver ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : <><CheckCircle className="w-4 h-4" /> Submit Application</>}
                      </button>
                    </div>
                  </>
                )}
              </form>

              <p className="text-center text-sm text-muted-foreground mt-6">
                Already have an account?{' '}
                <Link href="/auth/sign-in" className="text-primary font-semibold hover:underline">Sign In</Link>
              </p>
            </>
          )}
        </div>
      </div>

      {/* Right - Vellfire Showcase Panel */}
      <div className={`hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-slate-950 via-gray-950 to-slate-900 transition-all duration-1000 delay-200 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        {/* Ambient radial glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)' }}
        />
        <div className="absolute inset-0 flex items-center justify-center"
          style={mounted ? { animation: 'driveInPark 1.2s cubic-bezier(0.22, 1, 0.36, 1) 0.3s both' } : undefined}
        >
          <div className="relative w-full h-full flex items-center justify-center px-8">
            <img src="/images/autogo-sales.png" alt="AutoGo Premium Vehicle Rentals" className="w-full max-w-3xl object-contain drop-shadow-2xl rounded-2xl"
              style={mounted ? { animation: 'gentleFloat 6s ease-in-out 1.5s infinite' } : undefined}
            />
          </div>
        </div>
        <div className="absolute bottom-[18%] left-1/2 -translate-x-1/2 w-[60%] max-w-lg h-10 rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(255,255,255,0.12) 0%, transparent 70%)' }}
        />
        <div className="absolute inset-0 pointer-events-none overflow-hidden"
          style={mounted ? { animation: 'lightSweep 5s ease-in-out 2.5s infinite' } : undefined}
        >
          <div className="absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent -skew-x-12" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-slate-950/80" />

        <div className="relative flex flex-col justify-end p-12 w-full z-10">
          <div className="max-w-lg">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-1.5 mb-6"
              style={mounted ? { animation: 'fadeInUp 0.8s ease-out 0.4s both' } : undefined}
            >
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-white text-xs font-medium tracking-wide uppercase">Premium Vehicle Marketplace</span>
            </div>
            <h2 className="text-4xl font-extrabold text-white mb-4 leading-tight"
              style={mounted ? { animation: 'fadeInUp 0.8s ease-out 0.5s both' } : undefined}
            >
              {isCustomer ? 'Start Your Journey' : isDriver ? 'Join Our Driver Network' : 'Join as a Host'}
            </h2>
            <p className="text-white/80 text-lg mb-10 leading-relaxed"
              style={mounted ? { animation: 'fadeInUp 0.8s ease-out 0.6s both' } : undefined}
            >
              {isCustomer
                ? 'Browse premium vehicles, book instantly, and enjoy exclusive member benefits across Kenya.'
                : isDriver
                ? 'Drive on your schedule, earn competitive pay, and be part of Kenya\'s leading transport platform.'
                : 'List your vehicle, earn passive income, and join Kenya\'s fastest-growing vehicle marketplace.'}
            </p>
            <div className="flex gap-8"
              style={mounted ? { animation: 'fadeInUp 0.8s ease-out 0.7s both' } : undefined}
            >
              {[
                { value: '5K+', label: 'Happy Clients' },
                { value: '200+', label: 'Vehicles' },
                { value: '4.9', label: 'Star Rating' },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl font-extrabold text-white">{stat.value}</div>
                  <div className="text-white/60 text-xs font-medium mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes driveInPark {
          0% { opacity: 0; transform: translateX(180px) scale(0.92); filter: blur(4px); }
          60% { opacity: 1; transform: translateX(-8px) scale(1.01); filter: blur(0); }
          80% { transform: translateX(4px); }
          100% { opacity: 1; transform: translateX(0) scale(1); filter: blur(0); }
        }
        @keyframes gentleFloat { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        @keyframes lightSweep { 0% { transform: translateX(0); } 50% { transform: translateX(300%); } 100% { transform: translateX(300%); } }
        @keyframes fadeInUp { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

// Car icon
function CarIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.4-1.7-1-2.3L17 8" />
      <path d="M3 17H2c-.6 0-1-.4-1-1v-3c0-.9.4-1.7 1-2.3L7 8" />
      <path d="M3 8V6c0-.6.4-1 1-1h16c.6 0 1 .4 1 1v2" />
      <path d="M9 17h6" />
      <circle cx="6" cy="17" r="2" />
      <circle cx="18" cy="17" r="2" />
    </svg>
  );
}

function WalletIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}

