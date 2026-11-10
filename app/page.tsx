import Link from "next/link";

const features = [
  {
    emoji: "⏳",
    title: "Visit countdown",
    body: "Count down the days, hours and minutes until you're in the same room again.",
  },
  {
    emoji: "😊",
    title: "Daily check-ins",
    body: "Share your mood, your thoughts and what you're grateful for, so they always know how your day went.",
  },
  {
    emoji: "💌",
    title: "Your person, connected",
    body: "Send a relationship request, link up, and see each other's latest check-in right on your dashboard.",
  },
  {
    emoji: "👥",
    title: "Friends too",
    body: "Keep the people who matter close, even when they're a few time zones away.",
  },
];

const steps = [
  {
    number: "1",
    title: "Create your account",
    body: "Sign up and tell us a little about yourself.",
  },
  {
    number: "2",
    title: "Connect with your person",
    body: "Send a relationship request and link your profiles.",
  },
  {
    number: "3",
    title: "Stay close every day",
    body: "Check in, count down to your next visit, and keep the distance small.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-rose-50 text-rose-900">
      <header className="max-w-5xl mx-auto flex items-center justify-between px-6 py-6">
        <Link href="/" className="text-xl font-bold text-rose-800">
          ❤️ Far But Together
        </Link>

        <nav className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 rounded-full text-rose-800 font-semibold hover:bg-rose-100 transition"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="px-5 py-2 rounded-full bg-rose-500 text-white font-semibold shadow hover:bg-rose-600 transition"
          >
            Sign up
          </Link>
        </nav>
      </header>

      <section className="max-w-3xl mx-auto px-6 pt-16 pb-20 text-center">
        <p className="inline-block bg-rose-100 text-rose-700 text-sm font-semibold px-4 py-1 rounded-full mb-6">
          For long-distance hearts
        </p>

        <h1 className="text-5xl md:text-6xl font-bold text-rose-800 leading-tight">
          Miles apart.
          <br />
          Still together.
        </h1>

        <p className="mt-6 text-lg md:text-xl text-rose-700">
          A cozy little home for your long-distance relationship. Check in
          every day, count down to your next visit, and always know how your
          person is doing.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/register"
            className="px-8 py-3 rounded-full bg-rose-500 text-white text-lg font-semibold shadow-lg hover:bg-rose-600 transition"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="px-8 py-3 rounded-full bg-white text-rose-800 text-lg font-semibold shadow hover:shadow-lg transition"
          >
            I already have an account
          </Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-bold text-center text-rose-800 mb-10">
          Everything you need to feel close
        </h2>

        <div className="grid sm:grid-cols-2 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-white rounded-3xl shadow p-6 hover:shadow-xl transition"
            >
              <div className="text-4xl mb-3">{feature.emoji}</div>
              <h3 className="text-xl font-bold text-rose-800">
                {feature.title}
              </h3>
              <p className="mt-2 text-rose-700">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-rose-800 mb-12">
            How it works
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-2xl font-bold text-rose-600">
                  {step.number}
                </div>
                <h3 className="text-xl font-bold text-rose-800">
                  {step.title}
                </h3>
                <p className="mt-2 text-rose-700">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-rose-800">
          Ready to make the distance feel smaller?
        </h2>

        <Link
          href="/register"
          className="mt-8 inline-block px-8 py-3 rounded-full bg-rose-500 text-white text-lg font-semibold shadow-lg hover:bg-rose-600 transition"
        >
          Create your account
        </Link>
      </section>

      <footer className="pb-10 text-center text-sm text-rose-600">
        Made with ❤️ for people who are far but together.
      </footer>
    </main>
  );
}
