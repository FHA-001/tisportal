import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { TISLogo } from '@/components/shared/tis-logo';
import { useClasses } from '@/hooks/use-academics';
import { generateUsernameFromName } from '@/lib/auth-utils';
import { supabase } from '@/lib/supabaseClient';

export default function StudentSignup() {
  const [, setLocation] = useLocation();
  const { data: classes = [] } = useClasses();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [usernameManuallyEdited, setUsernameManuallyEdited] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    password: '',
    email: '',
    phone_number: '',
    gender: '',
    class_id: '',
    date_of_birth: '',
    parent_name: '',
    parent_phone: '',
    parent_email: ''
  });

  const handleClassChange = (classId: string) => {
    setFormData(prev => ({ 
      ...prev, 
      class_id: classId
    }));
  };

  const handleFullNameChange = (fullName: string) => {
    setFormData(prev => ({ ...prev, full_name: fullName }));
    // Auto-generate username only if not manually edited
    if (!usernameManuallyEdited) {
      const generatedUsername = generateUsernameFromName(fullName);
      if (generatedUsername) {
        setFormData(prev => ({ ...prev, username: generatedUsername }));
      }
    }
  };

  const handleUsernameChange = (username: string) => {
    setFormData(prev => ({ ...prev, username }));
    setUsernameManuallyEdited(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.full_name || !formData.username || !formData.password || 
        !formData.email || !formData.gender || !formData.class_id || 
        !formData.date_of_birth || !formData.parent_name) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const selectedClass = classes.find(c => c.id === formData.class_id);
      const { data, error } = await supabase.rpc('student_signup', {
        p_full_name: formData.full_name,
        p_username: formData.username,
        p_password: formData.password,
        p_email: formData.email,
        p_phone_number: formData.phone_number,
        p_gender: formData.gender,
        p_class_id: formData.class_id,
        p_tier: selectedClass?.tier || '',
        p_date_of_birth: formData.date_of_birth,
        p_parent_name: formData.parent_name,
        p_parent_phone: formData.parent_phone,
        p_parent_email: formData.parent_email
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error === 'username_exists' ? 'Username already exists' : 'Signup failed');
      } else {
        toast.success('Signup request submitted successfully! Please wait for admin approval.');
        setLocation('/login');
      }
    } catch (err: any) {
      toast.error(err.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800">
      <div className="w-full max-w-2xl bg-card rounded-2xl border border-border shadow-2xl overflow-hidden">
        <div className="px-8 py-8 text-center bg-gradient-to-r from-navy-800 to-navy-900">
          <div className="flex justify-center mb-4">
            <TISLogo size="lg" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-white mb-2">Student Registration</h1>
          <p className="text-navy-200 text-sm">Fill in your details to request account creation. Your account will be activated after admin approval.</p>
        </div>
        
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => handleFullNameChange(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  required
                  className="h-11"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2 relative">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                    className="h-11 pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Hide Password" : "Show Password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone Number</Label>
                <Input
                  id="phone_number"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender *</Label>
                <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })} required>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="class_id">Class *</Label>
                <Select value={formData.class_id} onValueChange={handleClassChange} required>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.tier})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth *</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="parent_name">Parent/Guardian Name *</Label>
                <Input
                  id="parent_name"
                  value={formData.parent_name}
                  onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parent_phone">Parent Phone Number</Label>
                <Input
                  id="parent_phone"
                  value={formData.parent_phone}
                  onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parent_email">Parent Email</Label>
                <Input
                  id="parent_email"
                  type="email"
                  value={formData.parent_email}
                  onChange={(e) => setFormData({ ...formData, parent_email: e.target.value })}
                  className="h-11"
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-11 bg-navy-700 hover:bg-navy-800 text-white mt-4" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Submitting...' : 'Submit Registration Request'}
            </Button>

            <div className="text-center pt-4 space-y-2">
              <button
                type="button"
                onClick={() => setLocation('/login')}
                className="text-sm text-primary hover:underline font-medium"
              >
                Already have an account? Sign In
              </button>
              <div>
                <button
                  type="button"
                  onClick={() => setLocation('/privacy-policy')}
                  className="text-sm text-muted-foreground hover:underline"
                >
                  Privacy Policy
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
