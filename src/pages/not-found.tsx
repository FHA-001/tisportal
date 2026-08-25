import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { SCHOOL_CONFIG } from '@/lib/app-config';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center p-4">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-6">
        <span className="text-2xl font-bold text-muted-foreground">404</span>
      </div>
      <h1 className="text-3xl font-heading font-bold mb-3">Page Not Found</h1>
      <p className="text-muted-foreground max-w-md mx-auto mb-8">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link href="/" className="inline-block">
        <Button className="bg-navy-700 hover:bg-navy-800 text-white">
          Return Home
        </Button>
      </Link>
    </div>
  );
}
