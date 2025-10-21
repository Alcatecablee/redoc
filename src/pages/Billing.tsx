import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export default function Billing() {
  const [payments, setPayments] = useState<any[]>([]);
  const [amount, setAmount] = useState('');
  const { toast } = useToast();

  const fetchPayments = async () => {
    try {
      const res = await fetch('/api/billing/payments');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setPayments(data.payments || []);
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error', description: err.message || 'Failed to load payments', variant: 'destructive' });
    }
  };

  useEffect(() => { fetchPayments(); }, []);

  const createInvoice = async () => {
    try {
      const res = await fetch('/api/billing/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: Number(amount), currency: 'USD' }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast({ title: 'Invoice created' });
      setAmount('');
      fetchPayments();
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error', description: err.message || 'Failed to create invoice', variant: 'destructive' });
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card className="p-4">
            <h3 className="text-lg font-bold">Create Invoice</h3>
            <div className="mt-3 space-y-2">
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (USD)" />
              <Button onClick={createInvoice} className="w-full">Create Invoice</Button>
            </div>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="p-4">
            <h3 className="text-lg font-bold">Payment History</h3>
            <div className="mt-4 space-y-3">
              {payments.length === 0 && <p className="text-sm text-gray-500">No payments yet.</p>}
              {payments.map(p => (
                <div key={p.id} className="flex items-center justify-between border-b border-white/10 py-2">
                  <div>
                    <div className="font-medium">{p.payment_type} — {p.status}</div>
                    <div className="text-sm text-gray-500">{p.currency} {p.amount}</div>
                  </div>
                  <div className="text-sm text-gray-400">{new Date(p.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
