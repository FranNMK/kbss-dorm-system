import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact / Support — Kigumo Bendera Dorms",
  description:
    "Contact and support information for the Kigumo Bendera dorm management system.",
};

export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {/* Heading */}
      <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">
        Contact &amp; Support
      </h1>
      <div className="w-12 h-1 bg-accent mb-8" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* School contact */}
        <section className="border border-primary/15 rounded-sm p-5">
          <h2 className="text-sm font-semibold text-primary mb-4">
            🏫 School Administration
          </h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs text-neutral-text/50 uppercase tracking-wide mb-0.5">
                School
              </dt>
              <dd className="text-neutral-text/80">
                Kigumo Bendera Senior School
              </dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-text/50 uppercase tracking-wide mb-0.5">
                Location
              </dt>
              <dd className="text-neutral-text/80">Kigumo, Murang&apos;a County, Kenya</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-text/50 uppercase tracking-wide mb-0.5">
                Role access requests
              </dt>
              <dd className="text-neutral-text/80">
                Contact the Deputy Principal or ICT coordinator to have your
                staff account assigned a role.
              </dd>
            </div>
          </dl>
        </section>

        {/* System support */}
        <section className="border border-primary/15 rounded-sm p-5">
          <h2 className="text-sm font-semibold text-primary mb-4">
            🛠️ System Support
          </h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs text-neutral-text/50 uppercase tracking-wide mb-0.5">
                Developer / Maintainer
              </dt>
              <dd className="text-neutral-text/80">FK Systems Africa</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-text/50 uppercase tracking-wide mb-0.5">
                Support email
              </dt>
              <dd>
                <a
                  href="mailto:support@fksystems.africa"
                  className="text-primary underline hover:text-accent transition-colors"
                >
                  support@fksystems.africa
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-text/50 uppercase tracking-wide mb-0.5">
                Issues / bugs
              </dt>
              <dd className="text-neutral-text/80">
                Report technical issues to the support email with a description
                of the problem and the page you were on.
              </dd>
            </div>
          </dl>
        </section>
      </div>

      {/* Login help */}
      <section className="mt-8 bg-primary/5 border border-primary/10 rounded-sm p-5">
        <h2 className="text-sm font-semibold text-primary mb-2">
          🔑 Can&apos;t log in?
        </h2>
        <p className="text-sm text-neutral-text/70 leading-relaxed">
          If you can log in but see an &quot;Access Pending&quot; message, your account
          exists but hasn&apos;t been assigned a role yet. Contact your school&apos;s ICT
          coordinator or Deputy Principal to have your role assigned.
        </p>
        <a
          href="/login"
          className="inline-block mt-4 bg-primary text-neutral text-sm font-semibold px-5 py-2 rounded-sm hover:bg-primary/90 transition-colors"
        >
          Go to Login →
        </a>
      </section>
    </div>
  );
}
