import Link from "next/link"
import {
  ArrowRight,
  Code2,
  Users,
  PlayCircle,
  Terminal,
  BookOpen,
  Trophy,
  Check,
  Zap,
  Clock,
  Shield,
} from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-blue-100">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <Code2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">LearnTech</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#how-it-works" className="hover:text-blue-600 transition-colors">
              How it Works
            </a>
            <a href="#curriculum" className="hover:text-blue-600 transition-colors">
              Curriculum
            </a>
            <a href="#pricing" className="hover:text-blue-600 transition-colors">
              Pricing
            </a>
            <Link href="/admin" className="flex items-center gap-1 hover:text-purple-600 transition-colors">
              <Shield className="w-3.5 h-3.5" />
              Admin
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Log in
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-gray-200"
            >
              Start Building
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2 space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                New: AI-Powered Pair Programming
              </div>
              <h1 className="text-5xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
                Don't just watch. <br />
                <span className="text-blue-600">Build software.</span>
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed max-w-lg">
                Escape tutorial hell. Master full-stack development by building real production-grade applications with
                an AI mentor by your side.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link
                  href="/signup"
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-2 group"
                >
                  Start Learning for Free
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href="#demo"
                  className="px-8 py-4 bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <PlayCircle className="w-5 h-5 text-gray-500" />
                  Watch Demo
                </a>
              </div>
              <div className="pt-8 flex items-center gap-4 text-sm text-gray-500">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-200" />
                  ))}
                </div>
                <p>Joined by 10,000+ developers from Google, Meta, and Stripe.</p>
              </div>
            </div>
            <div className="lg:w-1/2 relative">
              <div className="absolute inset-0 bg-blue-600/5 blur-3xl rounded-full" />
              <div className="relative rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="text-xs text-gray-400 font-mono ml-2">workspace — main.tsx</div>
                </div>
                <div className="p-6 font-mono text-sm leading-relaxed overflow-hidden">
                  <div className="text-gray-400">{"// AI Mentor: Great job optimizing that query!"}</div>
                  <div className="text-gray-400 mb-4">{"// Now let's implement the caching layer."}</div>
                  <div className="text-purple-600">export default async function</div>
                  <div className="text-blue-600">{" getData() {"}</div>
                  <div className="pl-4 text-gray-800">
                    <span className="text-purple-600">const</span> data = <span className="text-purple-600">await</span>{" "}
                    db.
                    <span className="text-blue-600">query</span>(
                    <span className="text-green-600">'SELECT * FROM users'</span>)
                  </div>
                  <div className="pl-4 text-gray-800">
                    <span className="text-purple-600">return</span> data
                  </div>
                  <div className="text-blue-600">{"}"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logos */}
      <section className="py-10 border-y border-gray-100 bg-gray-50/50">
        <div className="container mx-auto px-6">
          <p className="text-center text-sm font-semibold text-gray-400 mb-8 uppercase tracking-wider">
            Trusted by engineering teams at
          </p>
          <div className="flex flex-wrap justify-center gap-12 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            {/* Simple Text Placeholders for Logos to avoid SVG bloat */}
            <span className="text-xl font-bold text-gray-800">ACME Corp</span>
            <span className="text-xl font-bold text-gray-800">GlobalBank</span>
            <span className="text-xl font-bold text-gray-800">TechStart</span>
            <span className="text-xl font-bold text-gray-800">FutureSoft</span>
            <span className="text-xl font-bold text-gray-800">Innovate</span>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Why most people quit learning to code</h2>
            <p className="text-gray-600 text-lg">
              The gap between watching tutorials and building real software is where dreams go to die. We bridged it.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Terminal className="w-8 h-8 text-red-500" />,
                title: "Tutorial Hell",
                desc: "Copy-pasting code without understanding how it works or how to debug it.",
              },
              {
                icon: <BookOpen className="w-8 h-8 text-yellow-500" />,
                title: "Outdated Curriculum",
                desc: "Learning technology from 3 years ago that companies don't use anymore.",
              },
              {
                icon: <Users className="w-8 h-8 text-gray-500" />,
                title: "Lonely Journey",
                desc: "Getting stuck on a bug for 4 hours with no one to ask for help.",
              },
            ].map((item, i) => (
              <div key={i} className="p-8 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="mb-4 p-3 bg-white rounded-xl inline-block shadow-sm border border-gray-100">
                  {item.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution / Method */}
      <section className="py-24 bg-gray-900 text-white overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2 space-y-8">
              <h2 className="text-3xl lg:text-4xl font-bold">The LearnTech Method</h2>
              <div className="space-y-6">
                {[
                  {
                    title: "Learn concepts, not syntax",
                    desc: "Interactive lessons that focus on the 'why', not just the 'how'.",
                  },
                  {
                    title: "Build production apps",
                    desc: "No more to-do lists. Build clone of Airbnb, Uber, and Figma.",
                  },
                  {
                    title: "AI-Powered Feedback",
                    desc: "Get instant code reviews and debugging help 24/7.",
                  },
                ].map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm">
                      {i + 1}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                      <p className="text-gray-400">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:w-1/2">
              <div className="relative rounded-xl bg-gray-800 border border-gray-700 p-2 shadow-2xl transform rotate-2 hover:rotate-0 transition-all duration-500">
                <div className="rounded-lg bg-gray-900 p-6 h-80 flex flex-col items-center justify-center text-center">
                  <Trophy className="w-16 h-16 text-yellow-400 mb-4" />
                  <h3 className="text-2xl font-bold mb-2">Project Completed!</h3>
                  <p className="text-gray-400">You just built a real-time chat app.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-gray-600 text-lg">From zero to production-ready developer in three simple steps.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                step: "01",
                icon: <BookOpen className="w-10 h-10 text-blue-600" />,
                title: "Learn Fundamentals",
                desc: "Master core concepts through interactive lessons and hands-on exercises designed by industry experts.",
              },
              {
                step: "02",
                icon: <Terminal className="w-10 h-10 text-blue-600" />,
                title: "Build Real Projects",
                desc: "Apply your knowledge by building production-grade applications like Airbnb, Uber, and Figma clones.",
              },
              {
                step: "03",
                icon: <Zap className="w-10 h-10 text-blue-600" />,
                title: "Get AI Feedback",
                desc: "Receive instant code reviews, debugging help, and personalized guidance from your AI mentor 24/7.",
              },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="text-6xl font-bold text-gray-100 absolute -top-4 -left-2">{item.step}</div>
                <div className="relative p-8 rounded-2xl bg-gray-50 border border-gray-200 hover:border-blue-300 hover:shadow-xl transition-all">
                  <div className="mb-6 p-4 bg-white rounded-xl inline-block shadow-sm border border-gray-100">
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Curriculum Section */}
      <section id="curriculum" className="py-24 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Our Curriculum</h2>
            <p className="text-gray-600 text-lg">
              Comprehensive learning paths designed to take you from beginner to professional developer.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Web Development Fundamentals",
                level: "Beginner",
                duration: "25 hours",
                projects: 5,
                skills: ["HTML/CSS", "JavaScript", "React", "Next.js"],
                color: "bg-green-100 text-green-700 border-green-200",
              },
              {
                title: "Advanced React & State Management",
                level: "Intermediate",
                duration: "42 hours",
                projects: 8,
                skills: ["Redux", "Context API", "React Query", "Zustand"],
                color: "bg-blue-100 text-blue-700 border-blue-200",
              },
              {
                title: "Full-Stack Development",
                level: "Advanced",
                duration: "80 hours",
                projects: 15,
                skills: ["Node.js", "Express", "PostgreSQL", "MongoDB"],
                color: "bg-purple-100 text-purple-700 border-purple-200",
              },
              {
                title: "UI/UX Design with Figma",
                level: "Beginner",
                duration: "30 hours",
                projects: 12,
                skills: ["Design Systems", "Prototyping", "User Research"],
                color: "bg-green-100 text-green-700 border-green-200",
              },
              {
                title: "Data Science & Machine Learning",
                level: "Advanced",
                duration: "60 hours",
                projects: 10,
                skills: ["Python", "Pandas", "TensorFlow", "Scikit-learn"],
                color: "bg-purple-100 text-purple-700 border-purple-200",
              },
              {
                title: "Mobile Development with React Native",
                level: "Intermediate",
                duration: "35 hours",
                projects: 7,
                skills: ["React Native", "Expo", "Navigation", "APIs"],
                color: "bg-blue-100 text-blue-700 border-blue-200",
              },
            ].map((course, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-xl hover:border-blue-300 transition-all"
              >
                <div
                  className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4 border ${course.color}`}
                >
                  {course.level}
                </div>
                <h3 className="text-xl font-bold mb-3">{course.title}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {course.duration}
                  </div>
                  <div className="flex items-center gap-1">
                    <Terminal className="w-4 h-4" />
                    {course.projects} projects
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {course.skills.map((skill, j) => (
                    <span key={j} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-xl shadow-blue-200"
            >
              View All Courses
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-gray-600 text-lg">
              Start for free. Upgrade when you're ready to unlock advanced features.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                name: "Free",
                price: "$0",
                period: "forever",
                desc: "Perfect for getting started",
                features: ["5 beginner courses", "Basic AI feedback", "Community support", "Certificate of completion"],
                cta: "Get Started",
                primary: false,
              },
              {
                name: "Pro",
                price: "$29",
                period: "per month",
                desc: "For serious learners",
                features: [
                  "All courses & projects",
                  "Advanced AI mentor",
                  "Priority support",
                  "Professional certificates",
                  "Career guidance",
                  "1-on-1 mentorship sessions",
                ],
                cta: "Start Free Trial",
                primary: true,
              },
              {
                name: "Teams",
                price: "$99",
                period: "per month",
                desc: "For companies & bootcamps",
                features: [
                  "Everything in Pro",
                  "Up to 10 team members",
                  "Admin dashboard",
                  "Custom learning paths",
                  "Priority enterprise support",
                  "Dedicated account manager",
                ],
                cta: "Contact Sales",
                primary: false,
              },
            ].map((plan, i) => (
              <div
                key={i}
                className={`rounded-2xl p-8 ${
                  plan.primary
                    ? "bg-blue-600 text-white shadow-2xl shadow-blue-300 border-2 border-blue-500 transform scale-105"
                    : "bg-white border-2 border-gray-200"
                }`}
              >
                <h3 className={`text-xl font-bold mb-2 ${plan.primary ? "text-white" : "text-gray-900"}`}>
                  {plan.name}
                </h3>
                <p className={`text-sm mb-6 ${plan.primary ? "text-blue-100" : "text-gray-500"}`}>{plan.desc}</p>
                <div className="mb-6">
                  <span className="text-5xl font-bold">{plan.price}</span>
                  <span className={`text-sm ${plan.primary ? "text-blue-100" : "text-gray-500"}`}>/{plan.period}</span>
                </div>
                <Link
                  href="/signup"
                  className={`block w-full py-3 rounded-xl font-semibold text-center mb-8 transition-all ${
                    plan.primary
                      ? "bg-white text-blue-600 hover:bg-gray-50 shadow-lg"
                      : "bg-gray-900 text-white hover:bg-black"
                  }`}
                >
                  {plan.cta}
                </Link>
                <ul className="space-y-3">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <Check
                        className={`w-5 h-5 flex-shrink-0 mt-0.5 ${plan.primary ? "text-white" : "text-blue-600"}`}
                      />
                      <span className={`text-sm ${plan.primary ? "text-blue-50" : "text-gray-600"}`}>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Code2 className="w-5 h-5 text-blue-600" />
              <span className="font-bold text-gray-900">LearnTech</span>
            </div>
            <div className="text-sm text-gray-500">© 2025 LearnTech Inc. All rights reserved.</div>
            <div className="flex gap-6">
              <a href="#" className="text-gray-400 hover:text-gray-900">
                Twitter
              </a>
              <a href="#" className="text-gray-400 hover:text-gray-900">
                GitHub
              </a>
              <a href="#" className="text-gray-400 hover:text-gray-900">
                Discord
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
