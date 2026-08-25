import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { SCHOOL } from '@/lib/app-config';
import { Shield, Mail, Phone, MapPin } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-card rounded-2xl border border-border shadow-2xl overflow-hidden">
          <div className="px-8 py-8 text-center bg-gradient-to-r from-navy-800 to-navy-900">
            <div className="flex justify-center mb-4">
              <Shield className="w-16 h-16 text-gold-500" />
            </div>
            <h1 className="text-3xl font-heading font-bold text-white mb-2">Privacy Policy</h1>
            <p className="text-navy-200 text-sm">Last updated: July 2026</p>
          </div>
          
          <div className="p-8 space-y-8">
            <section>
              <h2 className="text-xl font-heading font-bold text-navy-900 dark:text-navy-100 mb-4">1. Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                {SCHOOL.name} ("the School", "we", "us", or "our") is committed to protecting the personal data of prospective and current students, parents, and guardians. This Privacy Policy explains how we collect, use, store, and protect personal information submitted through our website and admissions system, in accordance with the Nigeria Data Protection Act (NDPA) 2023.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-heading font-bold text-navy-900 dark:text-navy-100 mb-4">2. Data We Collect</h2>
              <p className="text-muted-foreground mb-4">When you submit a student registration application, we collect the following categories of personal data:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li><strong>Student information:</strong> full name, username, date of birth, gender, email, phone number, class, and tier</li>
                <li><strong>Parent/Guardian information:</strong> full name, phone number, and email address</li>
                <li><strong>Technical data:</strong> IP address (anonymised) for security and fraud prevention</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-heading font-bold text-navy-900 dark:text-navy-100 mb-4">3. How We Use Your Data</h2>
              <p className="text-muted-foreground mb-4">We use the personal data we collect for the following purposes:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Processing and evaluating your child's registration application</li>
                <li>Communicating with you about your application status and enrolment</li>
                <li>Maintaining accurate student and family records</li>
                <li>Ensuring the safety and welfare of students</li>
                <li>Complying with applicable laws and regulations</li>
                <li>Preventing fraud and ensuring the security of our systems</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-heading font-bold text-navy-900 dark:text-navy-100 mb-4">4. Data Retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                Application data for unsuccessful applicants is retained for the duration of the admissions cycle plus three (3) years, after which it is securely deleted. For enrolled students, data is retained for the duration of their enrolment and for seven (7) years thereafter, in line with legal obligations.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-heading font-bold text-navy-900 dark:text-navy-100 mb-4">5. Third-Party Services</h2>
              <p className="text-muted-foreground mb-4">To operate our registration system, we use the following third-party services, each bound by their own privacy policies and data processing agreements:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li><strong>Supabase</strong> — database and authentication services</li>
                <li><strong>Rate limiting services</strong> — to prevent abuse of our submission systems</li>
              </ul>
              <p className="text-muted-foreground mt-4">We do not sell, rent, or share your personal data with any third party for marketing purposes.</p>
            </section>

            <section>
              <h2 className="text-xl font-heading font-bold text-navy-900 dark:text-navy-100 mb-4">6. Your Rights Under the NDPA 2023</h2>
              <p className="text-muted-foreground mb-4">Under the Nigeria Data Protection Act 2023, you have the following rights with respect to your personal data:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li><strong>Right of access:</strong> to request a copy of the personal data we hold about you</li>
                <li><strong>Right to rectification:</strong> to request correction of inaccurate or incomplete data</li>
                <li><strong>Right to erasure:</strong> to request deletion of your data where there is no lawful basis for continued processing</li>
                <li><strong>Right to restrict processing:</strong> to request that we limit how we use your data</li>
                <li><strong>Right to object:</strong> to object to our processing of your data in certain circumstances</li>
                <li><strong>Right to data portability:</strong> to receive your data in a structured, machine-readable format</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-heading font-bold text-navy-900 dark:text-navy-100 mb-4">7. Contact for Data Requests</h2>
              <p className="text-muted-foreground mb-4">To exercise any of the rights above, or if you have any questions about how we handle your personal data, please contact us in writing at:</p>
              <Card className="bg-muted/50 border-border">
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-navy-600" />
                    <div>
                      <p className="font-semibold text-navy-900 dark:text-navy-100">Data Protection Officer</p>
                      <p className="text-muted-foreground">{SCHOOL.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-navy-600" />
                    <p className="text-muted-foreground">{SCHOOL.fullAddress}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-navy-600" />
                    <p className="text-muted-foreground">{SCHOOL.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-navy-600" />
                    <p className="text-muted-foreground">{SCHOOL.phone}</p>
                  </div>
                </CardContent>
              </Card>
              <p className="text-muted-foreground mt-4">We will respond to verified data requests within 30 days of receipt.</p>
            </section>

            <section>
              <h2 className="text-xl font-heading font-bold text-navy-900 dark:text-navy-100 mb-4">8. Changes to This Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. When we do, we will revise the "Last updated" date at the top of this page. Continued use of our website following any changes constitutes acceptance of the revised policy.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
