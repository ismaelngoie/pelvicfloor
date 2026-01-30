"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useUserData } from "@/context/UserDataContext";
import {
  Star,
  ChevronDown,
  ChevronUp,
  Activity,
  Play,
  Brain,
  Timer,
  X,
  Loader2,
  Mail,
} from "lucide-react";

import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  LinkAuthenticationElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

// --- STRIPE SETUP ---
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

// --- ASSETS ---
const REVIEW_IMAGES = ["/review9.png", "/review1.png", "/review5.png", "/review4.png", "/review2.png"];

/**
 * NOTE (important):
 * Your RootLayout adds pt-[env(safe-area-inset-top)] to <main>.
 * That creates a TOP "padding band" *above* your Paywall component.
 * iOS shows that band behind the Dynamic Island, which is why it stays white.
 *
 * Fix: pull the Paywall up with -mt-[env(safe-area-inset-top)]
 * so it actually occupies that padded region, and paint a top "cap"
 * behind the island + a full-viewport fixed background.
 */

// --- UI: Make Safari + any exposed areas feel congruent while paywall is mounted ---
function usePaywallChrome(color = "#0A0A10") {
  useEffect(() => {
    let meta = document.querySelector('meta[name="theme-color"]');
    let created = false;

    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
      created = true;
    }

    const prevTheme = meta.getAttribute("content");
    meta.setAttribute("content", color);

    const html = document.documentElement;
    const body = document.body;

    const prevHtmlBg = html.style.backgroundColor;
    const prevBodyBg = body.style.backgroundColor;

    html.style.backgroundColor = color;
    body.style.backgroundColor = color;

    return () => {
      if (created) meta.remove();
      else if (prevTheme) meta.setAttribute("content", prevTheme);

      html.style.backgroundColor = prevHtmlBg;
      body.style.backgroundColor = prevBodyBg;
    };
  }, [color]);
}

// --- LOGIC: Button Grammar Mapping ---
const getButtonText = (goalTitle) => {
  const g = (goalTitle || "").toLowerCase();
  if (g.includes("pregnancy")) return "Start My Pregnancy Plan";
  if (g.includes("postpartum")) return "Start My Postpartum Plan";
  if (g.includes("leak")) return "Start My Leak-Free Plan";
  if (g.includes("intimacy") || g.includes("sex")) return "Start My Intimacy Plan";
  if (g.includes("pain")) return "Start My Relief Plan";
  if (g.includes("core") || g.includes("strength")) return "Start My Core Plan";
  return "Start My Personalized Plan";
};

// --- LOGIC: Review Mapping ---
const getReviewsForGoal = (goalTitle) => {
  const goal = (goalTitle || "").toLowerCase();

  const pack = (names, texts) =>
    names.map((name, i) => ({
      name,
      text: texts[i],
      image: REVIEW_IMAGES[i % REVIEW_IMAGES.length],
    }));

  if (goal.includes("leaks") || goal.includes("bladder")) {
    return pack(
      ["Emily D.", "Dana A.", "Hannah L.", "Priya S.", "Zoe M."],
      ["Week 1 I laughed and stayed dry", "Pads live in a drawer now", "I jogged today and stayed dry", "Bathroom maps deleted I feel free", "My bladder finally listens to me"]
    );
  }
  if (goal.includes("pain") || goal.includes("discomfort")) {
    return pack(
      ["Laura P.", "Ana R.", "Katie B.", "Mia K.", "Jen C."],
      ["Meetings passed without that deep ache", "I enjoyed intimacy without flinching", "Gentle moves gave real relief", "I woke up calm not burning", "I lifted my toddler without bracing"]
    );
  }
  if (goal.includes("postpartum") || goal.includes("recover")) {
    return pack(
      ["Sarah W.", "Michelle T.", "Chloe N.", "Olivia G.", "Jess P."],
      ["Week 2 stronger steadier with baby", "My core feels connected again", "From leaks to laughter with my baby", "Recovery finally makes sense", "Five minutes I actually keep"]
    );
  }
  if (goal.includes("pregnancy") || goal.includes("prepare")) {
    return pack(
      ["Kara D.", "Ivy S.", "Bella R.", "Nora P.", "June K."],
      ["Breath is calm belly supported", "Hips opened and sleep returned", "Week 2 my core feels ready", "Movements finally feel safe", "I feel ready for our baby"]
    );
  }
  if (goal.includes("intimacy") || goal.includes("sexual")) {
    return pack(
      ["Maya S.", "Dani R.", "Lina H.", "Brooke E.", "Kim W."],
      ["More sensation and less worry", "Bedroom confidence is back", "Stronger connection with my partner", "I actually look forward to intimacy", "Orgasms came without fear"]
    );
  }
  if (goal.includes("strength") || goal.includes("fitness")) {
    return pack(
      ["Sam P.", "Helena R.", "Jules M.", "Tess K.", "Ana L."],
      ["Runs feel springy and sure", "Deadlifts steady no pinch", "Balance finally clicked in yoga", "Core fired my pace improved", "Recovery better workouts stick"]
    );
  }
  if (goal.includes("stability") || goal.includes("posture")) {
    return pack(
      ["Camille D.", "Erin S.", "Mina J.", "Paige R.", "Ruth N."],
      ["Shoulders dropped I grew taller", "Neck stayed easy all day", "Stairs felt steady and safe", "Desk hours no longer punish", "Week 1 standing feels organized"]
    );
  }

  return pack(
    ["Olivia G.", "Emily D.", "Sarah W.", "Emily J.", "Dana A."],
    ["This finally felt made for me", "Small wins in days I smiled", "Five minutes gave real change", "Pain eased and I breathed", "Confidence returned I feel in control"]
  );
};

const FEATURES = [
  { icon: <Brain size={28} className="text-white" />, text: "AI coach that adapts daily" },
  { icon: <Timer size={28} className="text-white" />, text: "5-minute personalized routines" },
  { icon: <Play size={28} className="text-white" fill="white" />, text: "300+ physio-approved videos" },
  { icon: <Activity size={28} className="text-white" />, text: "Trackable progress & streaks" },
];

// --- STRIPE CHECKOUT FORM ---
const CheckoutForm = ({ onClose }) => {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { saveUserData } = useUserData();

  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsLoading(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: "https://pelvi.health/dashboard?plan=monthly",
        receipt_email: email,
      },
      redirect: "if_required",
    });

    if (error) {
      setMessage(error.message);
      setIsLoading(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      saveUserData("isPremium", true);
      saveUserData("joinDate", new Date().toISOString());
      router.push("https://pelvi.health/dashboard?plan=monthly");
    } else {
      setMessage("An unexpected error occurred.");
      setIsLoading(false);
    }
  };

  const paymentElementOptions = {
    layout: "tabs",
    fields: { phone: "never" },
  };

  return (
    <form
      onClick={(e) => e.stopPropagation()}
      onSubmit={handleSubmit}
      className="w-full max-w-md bg-[#1A1A26] p-6 rounded-3xl border border-white/10 shadow-2xl animate-slide-up relative my-auto mx-4"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white/5 rounded-full hover:bg-white/20 transition-colors z-10"
      >
        <X size={20} className="text-white" />
      </button>

      <div className="mb-6">
        <h3 className="text-xl font-bold text-white mb-1">Secure Checkout</h3>
        <p className="text-sm text-white/50">Total due: $24.99 / month</p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="text-white">
          <LinkAuthenticationElement
            id="link-authentication-element"
            onChange={(e) => setEmail(e.value.email)}
          />
        </div>
        <PaymentElement id="payment-element" options={paymentElementOptions} />
      </div>

      {message && (
        <div className="text-red-400 text-sm mt-4 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
          {message}
        </div>
      )}

      <button
        disabled={isLoading || !stripe || !elements}
        id="submit"
        className="w-full mt-6 h-14 bg-gradient-to-r from-[#FF3B61] to-[#D959E8] rounded-xl font-bold text-white shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
      >
        {isLoading ? <Loader2 className="animate-spin" /> : "Pay $24.99"}
      </button>

      <p className="text-center text-white/30 text-xs mt-4">100% Secure Payment via Stripe</p>
    </form>
  );
};

// --- REAL RESTORE MODAL ---
const RestoreModal = ({ onClose }) => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { saveUserData } = useUserData();

  const handleRestoreSubmit = async (e) => {
    e.preventDefault();
    if (!email.includes("@")) {
      alert("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/restore-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (data.isPremium) {
        saveUserData("isPremium", true);
        saveUserData("joinDate", new Date().toISOString());
        if (data.customerName) saveUserData("name", data.customerName);
        router.push("https://pelvi.health/dashboard");
      } else {
        alert("We found your email, but no active subscription was detected.");
        setIsLoading(false);
      }
    } catch (err) {
      console.error(err);
      alert("Unable to verify purchase. Please check your internet connection.");
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-[#1A1A26] border border-white/10 rounded-3xl p-6 shadow-2xl animate-scale-up"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Restore Purchase</h3>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10">
            <X size={18} className="text-white" />
          </button>
        </div>

        <p className="text-white/60 text-sm mb-6">
          Enter the email address you used to purchase your subscription. We'll find your account.
        </p>

        <form onSubmit={handleRestoreSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-[#E65473] transition-colors"
              autoFocus
            />
          </div>

          <button
            disabled={isLoading}
            className="w-full h-12 bg-gradient-to-r from-[#FF3B61] to-[#D959E8] rounded-xl font-bold text-white shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : "Find My Plan"}
          </button>
        </form>
      </div>
    </div>
  );
};

// --- MAIN PAYWALL SCREEN ---
export default function PaywallScreen() {
  const router = useRouter();
  const { userDetails, saveUserData } = useUserData();

  // Make any exposed areas (including overscroll) dark
  usePaywallChrome("#0A0A10");

  // State
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [userCount, setUserCount] = useState(9800);
  const [showContent, setShowContent] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [dateString, setDateString] = useState("");

  // Modals & Logic
  const [clientSecret, setClientSecret] = useState("");
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [isFaqOpen, setIsFaqOpen] = useState(false);
  const [isButtonLoading, setIsButtonLoading] = useState(false);

  // Derived Data
  const goalTitle = userDetails?.selectedTarget?.title || "Build Core Strength";
  const userName = userDetails?.name || "Ready";
  const reviews = useMemo(() => getReviewsForGoal(goalTitle), [goalTitle]);
  const buttonText = getButtonText(goalTitle);

  // Effects
  useEffect(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    setDateString(date.toLocaleDateString("en-US", { month: "short", day: "numeric" }));
    setShowContent(true);
  }, []);

  useEffect(() => {
    const featureTimer = setInterval(() => setActiveFeatureIndex((p) => (p + 1) % FEATURES.length), 4000);
    const reviewTimer = setInterval(() => setCurrentReviewIndex((p) => (p + 1) % reviews.length), 5000);
    return () => {
      clearInterval(featureTimer);
      clearInterval(reviewTimer);
    };
  }, [reviews]);

  useEffect(() => {
    if (!showContent) return;
    let start = 9800;
    const timer = setInterval(() => {
      start += 5;
      if (start >= 10200) {
        setUserCount(10200);
        clearInterval(timer);
      } else setUserCount(start);
    }, 20);
    return () => clearInterval(timer);
  }, [showContent]);

  // --- ACTIONS ---
  const handleStartPlan = async () => {
    setIsButtonLoading(true);

    if (!clientSecret) {
      try {
        const res = await fetch("/api/create-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Server Error: ${res.status} - ${errText}`);
        }

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        setClientSecret(data.clientSecret);
      } catch (err) {
        console.error("Stripe Error:", err);
        alert(`Could not initialize payment: ${err.message}. Please check your internet or try again later.`);
        setIsButtonLoading(false);
        return;
      }
    }

    setIsButtonLoading(false);
    setShowCheckoutModal(true);
  };

  const stripeAppearance = {
    theme: "night",
    variables: {
      colorPrimary: "#E65473",
      colorBackground: "#1A1A26",
      colorText: "#ffffff",
      colorDanger: "#df1b41",
      fontFamily: "Inter, system-ui, sans-serif",
      spacingUnit: "4px",
      borderRadius: "12px",
    },
  };

  const getCtaSubtext = () => {
    if (!dateString) return "";
    return `Feel real progress by ${dateString}. If not, one tap full $24.99 refund.`;
  };

  return (
    <div
      className={`
        relative w-full bg-[#0A0A10] overflow-hidden flex flex-col
        h-[calc(100dvh+env(safe-area-inset-top))]
        -mt-[env(safe-area-inset-top)]
        md:h-full md:mt-0
      `}
    >
      {/* 1) Full-viewport background that truly reaches the Dynamic Island area */}
      <div className="fixed md:absolute inset-0 z-0 pointer-events-none">
        {/* Hard “cap” to guarantee island area is never white, even if video doesn't render there */}
        <div className="absolute top-0 inset-x-0 h-[env(safe-area-inset-top)] bg-[#0A0A10]" />

        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onLoadedData={() => setVideoLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
            videoLoaded ? "opacity-100" : "opacity-0"
          }`}
        >
          <source src="/paywall_video.mp4" type="video/mp4" />
        </video>

        {/* Base wash */}
        <div className="absolute inset-0 bg-black/30" />

        {/* Top scrim (helps the island area feel intentional) */}
        <div
          className="
            absolute top-0 inset-x-0
            h-[calc(env(safe-area-inset-top)+64px)]
            bg-gradient-to-b from-[#0A0A10]/85 to-transparent
          "
        />

        {/* Bottom scrim */}
        <div
          className="
            absolute bottom-0 inset-x-0
            h-[calc(env(safe-area-inset-bottom)+2px)]
            bg-gradient-to-t from-[#0A0A10]/95 via-[#0A0A10]/75 to-transparent
          "
        />
      </div>

      {/* 2) Scrollable content (add safe-area top padding here since we pulled the whole screen up) */}
      <div
        className={`
          z-10 flex-1 flex flex-col overflow-y-auto no-scrollbar px-6
          pt-[calc(env(safe-area-inset-top)+3rem)]
          pb-[calc(9rem+env(safe-area-inset-bottom))]
          transition-all duration-700
          ${showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
        `}
      >
        {/* Headline */}
        <h1 className="text-[34px] font-extrabold text-white text-center mb-8 leading-tight drop-shadow-xl">
          <span className="text-white">{userName === "Ready" ? "Ready to" : `${userName}, ready to`}</span>
          <br />
          <span className="capitalize text-[#E65473]">{goalTitle.replace("Stop ", "").replace("Build ", "")}</span>?
          <span className="block text-[28px] text-white mt-1">100% Money-Back Guarantee.</span>
        </h1>

        {/* Features */}
        <div className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-[24px] overflow-hidden mb-6 flex flex-col items-center shadow-2xl">
          <div className="pt-5 pb-2">
            <h3 className="text-[17px] font-bold text-white text-center drop-shadow-md">
              Your Personalized Plan Includes:
            </h3>
          </div>

          <div className="relative w-full h-[140px] flex items-center justify-center">
            {FEATURES.map((feature, index) => {
              const isActive = index === activeFeatureIndex;
              return (
                <div
                  key={index}
                  className={`absolute w-full flex flex-col items-center gap-3 transition-all duration-500 ease-out px-4 text-center ${
                    isActive ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95"
                  }`}
                >
                  <div className="w-[50px] h-[50px] rounded-full bg-gradient-to-br from-[#E65473] to-[#C23A5B] flex items-center justify-center shadow-lg shadow-rose-500/30">
                    {feature.icon}
                  </div>
                  <span className="text-[17px] font-semibold text-white leading-tight drop-shadow-md">
                    {feature.text}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="w-full px-6 pb-6 flex gap-1.5 h-1.5">
            {FEATURES.map((_, i) => (
              <div key={i} className="h-full flex-1 bg-white/20 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-white rounded-full transition-all ease-linear ${
                    i === activeFeatureIndex
                      ? "duration-[4000ms] w-full"
                      : i < activeFeatureIndex
                      ? "w-full"
                      : "w-0"
                  }`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Reviews */}
        <div className="w-full bg-black/20 backdrop-blur-md border border-white/10 rounded-[24px] p-5 flex flex-col items-center gap-3 mb-6 shadow-xl">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[22px] font-bold text-white drop-shadow-sm">4.9</span>
            <div className="flex text-yellow-400 gap-1 drop-shadow-sm">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={18} fill="currentColor" />
              ))}
            </div>
            <span className="text-[11px] font-medium text-white/80 uppercase tracking-wide">App Store Rating</span>
          </div>

          <div className="w-full min-h-[70px] flex items-center justify-center relative">
            {reviews.map((review, idx) => (
              <div
                key={idx}
                className={`absolute w-full flex flex-col items-center transition-all duration-500 ${
                  idx === currentReviewIndex
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 translate-x-4 pointer-events-none"
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <img
                    src={review.image}
                    className="w-10 h-10 rounded-full border-2 border-white/50 object-cover shadow-sm"
                    alt={review.name}
                  />
                  <p className="text-[15px] italic text-white text-center font-medium drop-shadow-md">
                    "{review.text}"
                  </p>
                  <p className="text-[12px] font-bold text-white/90 drop-shadow-md">{review.name}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[13px] text-white/70 text-center mt-2 font-medium">
            Join <span className="font-bold text-white">{userCount.toLocaleString()}+ women</span> feeling strong.
          </p>
        </div>

        {/* FAQ & Legal */}
        <div className="flex flex-col gap-4 mb-8">
          <div
            onClick={() => setIsFaqOpen(!isFaqOpen)}
            className="w-full bg-white/5 rounded-xl p-4 border border-white/5 backdrop-blur-sm cursor-pointer active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center justify-center gap-2 text-white/90">
              <span className="text-[14px] font-semibold">How do I get my money back?</span>
              {isFaqOpen ? (
                <ChevronUp size={14} className="text-white/60" />
              ) : (
                <ChevronDown size={14} className="text-white/60" />
              )}
            </div>

            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isFaqOpen ? "max-h-20 opacity-100 mt-2" : "max-h-0 opacity-0"
              }`}
            >
              <p className="text-[13px] text-white/60 text-center leading-relaxed">
                Tap “Refund” in Settings → “Billing” → Done. No questions asked.
              </p>
            </div>
          </div>

          {/* Footer Links */}
          <div className="flex justify-center items-center gap-3 text-[11px] font-medium text-white/50">
            <button
              onClick={() => setShowRestoreModal(true)}
              className="underline decoration-white/30 hover:text-white transition-colors"
            >
              Restore Purchase
            </button>
            <span>•</span>
            <span className="cursor-default">Physio-Designed</span>
            <span>•</span>
            <span className="cursor-default">Doctor Approved</span>
          </div>
        </div>
      </div>

     {/* 3) Sticky CTA */}
      <div
        className={`
          fixed md:absolute bottom-0 left-0 w-full z-30 px-6 pt-6
          pb-[calc(env(safe-area-inset-bottom)+2rem)]
          /* GRADIENT EXPLANATION:
            from-[#0A0A10]/90 -> Keeps the very bottom edge dark/anchored.
            via-[#0A0A10]/30  -> Makes the area behind the button/text very glassy (30% opacity).
            to-transparent    -> Fades out completely at the top.
          */
          bg-gradient-to-t from-[#0A0A10]/90 via-[#0A0A10]/30 to-transparent
          transition-all duration-700 delay-200
          ${showContent ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}
        `}
      >
        <button
          onClick={handleStartPlan}
          disabled={isButtonLoading}
          className="w-full h-[58px] rounded-full shadow-[0_0_25px_rgba(225,29,72,0.5)] flex items-center justify-center gap-2 animate-breathe active:scale-95 transition-transform relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#FF3B61] to-[#D959E8] transition-all group-hover:scale-105" />
          <div className="relative flex items-center gap-2 z-10">
            {isButtonLoading && <Loader2 className="animate-spin text-white" size={24} />}
            <span className="text-[18px] font-bold text-white">{buttonText}</span>
          </div>
        </button>

        {/* TEXT UPDATE: 
           Since the background is lighter, we made the text brighter (text-white/90)
           and added 'drop-shadow-md' so it pops against the video.
        */}
        <p className="text-center text-white/90 text-[12px] font-medium mt-3 leading-snug px-4 drop-shadow-md">
          {getCtaSubtext()}
        </p>
      </div>

      {/* 4) STRIPE OVERLAY MODAL */}
      {showCheckoutModal && clientSecret && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm overflow-y-auto"
          onClick={() => setShowCheckoutModal(false)}
        >
          <div className="min-h-full flex items-center justify-center p-4">
            <Elements options={{ clientSecret, appearance: stripeAppearance }} stripe={stripePromise}>
              <CheckoutForm onClose={() => setShowCheckoutModal(false)} />
            </Elements>
          </div>
        </div>
      )}

      {/* 5) RESTORE OVERLAY MODAL */}
      {showRestoreModal && <RestoreModal onClose={() => setShowRestoreModal(false)} />}
    </div>
  );
}
