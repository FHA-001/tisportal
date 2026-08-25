import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TISLogo } from '@/components/shared/tis-logo';
import { SCHOOL_CONFIG } from '@/lib/app-config';
import { Phone, Mail, MapPin, Banknote, CreditCard, Loader2 } from 'lucide-react';
import { useSchoolFees, usePaymentAccounts } from '@/hooks/use-school-fees';

export default function SchoolFees() {
  const { data: schoolFees = [], isLoading: loadingFees } = useSchoolFees();
  const { data: paymentAccounts = [], isLoading: loadingAccounts } = usePaymentAccounts();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <TISLogo size="lg" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{SCHOOL_CONFIG.name}</h1>
          <p className="text-navy-200">{SCHOOL_CONFIG.location}</p>
        </div>

        {/* School Fees Card */}
        <Card className="mb-6 border-border shadow-xl">
          <CardHeader className="bg-gradient-to-r from-navy-800 to-navy-900 text-white">
            <CardTitle className="flex items-center gap-2">
              <Banknote className="w-5 h-5" />
              School Fees
            </CardTitle>
            <CardDescription className="text-navy-200">
              Fee structure for the current academic session
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {loadingFees ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Class</th>
                      <th className="text-right py-3 px-4 font-semibold text-foreground">Fee (₦)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schoolFees.map((item: any) => (
                      <tr key={item.id} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium">{item.class_name}</td>
                        <td className="py-3 px-4 text-right font-semibold">
                          {item.fee_amount > 0 ? formatCurrency(item.fee_amount) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Accounts Card */}
        <Card className="mb-6 border-border shadow-xl">
          <CardHeader className="bg-gradient-to-r from-navy-800 to-navy-900 text-white">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment Accounts
            </CardTitle>
            <CardDescription className="text-navy-200">
              Bank accounts for school fee payments
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {loadingAccounts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                {paymentAccounts.map((account: any) => (
                  <div key={account.id} className="border border-border rounded-lg p-4 bg-muted/30">
                    <div className="font-semibold text-lg mb-2">{account.bank_name}</div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Account Number:</span>
                        <span className="font-mono font-medium">{account.account_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Account Name:</span>
                        <span className="font-medium">{account.account_name}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Instructions Card */}
        <Card className="mb-6 border-border shadow-xl">
          <CardHeader className="bg-gradient-to-r from-navy-800 to-navy-900 text-white">
            <CardTitle>Payment Instructions</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Select your preferred bank from the payment accounts above</li>
              <li>Transfer the exact school fee amount to the account</li>
              <li>Use your child's full name as the payment reference/description</li>
              <li>Keep the payment receipt for verification purposes</li>
              <li>Contact the school office to confirm payment receipt</li>
            </ol>
          </CardContent>
        </Card>

        {/* Contact Information Card */}
        <Card className="border-border shadow-xl">
          <CardHeader className="bg-gradient-to-r from-navy-800 to-navy-900 text-white">
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <span>0706 264 1324</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <span>tritonintschool@gmail.com</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground" />
                <span>KM 20, Abuja–Keffi Road, Kuchikau</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-navy-200/60 text-sm">
          &copy; {new Date().getFullYear()} {SCHOOL_CONFIG.name}. All rights reserved.
        </div>
      </div>
    </div>
  );
}
