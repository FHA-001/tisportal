import { TISLogo } from '@/components/shared/tis-logo';
import { SCHOOL_CONFIG, SCHOOL } from '@/lib/app-config';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { ArrowRight, Mail } from 'lucide-react';

export default function ParentComingSoon() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-navy-200">
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-10 px-4 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TISLogo size="sm" showText={false} />
          <span className="font-heading font-bold">{SCHOOL_CONFIG.name}</span>
        </div>
        <Link href="/login">
          <Button variant="ghost" size="sm" className="font-medium">
            Staff Login <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </header>
      
      <main className="flex-1 flex flex-col items-center justify-center p-4 lg:p-8 text-center max-w-3xl mx-auto w-full">
        <div className="w-20 h-20 bg-navy-50 rounded-2xl flex items-center justify-center mb-8 border border-navy-100 shadow-inner">
          <Mail className="w-10 h-10 text-navy-600" />
        </div>
        
        <h1 className="text-4xl md:text-6xl font-heading font-bold tracking-tight text-foreground mb-6">
          Parent Portal is <span className="text-transparent bg-clip-text bg-gradient-to-r from-navy-600 to-primary">Coming Soon</span>
        </h1>
        
        <p className="text-lg text-muted-foreground mb-10 max-w-xl">
          We are building a dedicated portal for parents to view student progress and school announcements. 
          Stay tuned for updates from {SCHOOL.shortName}.
        </p>
        
        <div className="bg-card border border-border p-6 rounded-2xl w-full max-w-md shadow-sm">
          <h3 className="font-heading font-semibold mb-2">Get Notified</h3>
          <p className="text-sm text-muted-foreground mb-4">Leave your email to be the first to know when the portal launches.</p>
          <div className="flex gap-2">
            <input 
              type="email" 
              placeholder="parent@example.com" 
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <Button className="bg-navy-700 hover:bg-navy-800 text-white shrink-0">Notify Me</Button>
          </div>
        </div>
        
        <div className="mt-16 text-sm text-muted-foreground">
          <p>For urgent inquiries, contact the school office:</p>
          <p className="font-medium mt-1"><a href={SCHOOL.phoneHref} className="hover:text-primary transition-colors">{SCHOOL.phone}</a> | {SCHOOL.email}</p>
        </div>
      </main>
    </div>
  );
}
