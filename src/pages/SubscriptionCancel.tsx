import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';

export default function SubscriptionCancel() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <Card className="p-8 max-w-md text-center">
        <XCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-4">Subscription Cancelled</h1>
        <p className="text-lg text-gray-700 mb-6">
          You cancelled the subscription process. No charges have been made.
        </p>

        <div className="space-y-3">
          <Button
            className="w-full"
            size="lg"
            onClick={() => navigate('/pricing')}
          >
            View Plans Again
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate('/')}
          >
            Go Home
          </Button>
        </div>

        <p className="text-sm text-gray-600 mt-6">
          Changed your mind? You can subscribe anytime from the pricing page.
        </p>
      </Card>
    </div>
  );
}
