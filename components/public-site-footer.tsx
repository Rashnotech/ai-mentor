import Link from "next/link"

const footerLinks = {
  programmes: [
    "All Programmes",
    "Data Science",
    "Data Analytics",
    "AI Career Essentials",
    "Virtual Assistant",
    "Graphic Design",
    "Cybersecurity",
  ],
  more: [
    "Python Programming",
    "Web Development",
    "Software Engineering",
    "AI Engineering",
  ],
  about: [
    { label: "Hubs", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Contact Us", href: "/contact" },
  ],
}

export default function PublicSiteFooter() {
  return (
    <footer className="border-t border-white/5 bg-[#0d1117] pb-8 pt-16">
      <div className="container mx-auto px-6">
        <div className="mb-16 grid gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <h4 className="mb-6 text-sm font-semibold text-white">Our Programmes</h4>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              <div className="space-y-3">
                {footerLinks.programmes.map((link) => (
                  <Link key={link} href="/courses" className="block text-sm text-gray-400 transition-colors hover:text-white">
                    {link}
                  </Link>
                ))}
              </div>
              <div className="space-y-3">
                {footerLinks.more.map((link) => (
                  <Link key={link} href="/courses" className="block text-sm text-gray-400 transition-colors hover:text-white">
                    {link}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-6 text-sm font-semibold text-white">Learn About Us</h4>
            <div className="space-y-3">
              {footerLinks.about.map((link) => (
                <Link key={link.label} href={link.href} className="block text-sm text-gray-400 transition-colors hover:text-white">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-6">
              <span className="text-lg font-bold text-cyan-400">#BuildTheFuture</span>
              <span className="ml-2 text-lg font-bold text-cyan-400">#RashnoTech</span>
            </div>
            <p className="max-w-xs text-sm leading-6 text-gray-400">
              Learn practical tech skills, build projects, and get support from Rashnotech.
            </p>
            <Link
              href="/contact"
              className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Contact Us
            </Link>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 md:flex-row">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <Link href="/privacy-policy" className="transition-colors hover:text-white">
              Privacy
            </Link>
            <span>|</span>
            <span>© Copyright 2026</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-blue-600 p-1">
              <img src="/mylogo.png" className="h-5 w-5" alt="Rashnotech" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Rashnotech</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
