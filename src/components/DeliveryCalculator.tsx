import { useMemo } from 'react';
import { addDays, format, isWeekend, addBusinessDays } from 'date-fns';
import { Calendar, Clock, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DeliveryCalculatorProps {
  deliverySpeed: 'standard' | 'rush' | 'same-day';
  className?: string;
}

const deliveryOptions = {
  'standard': { days: 3, label: '3 Business Days', icon: Calendar, color: 'bg-blue-500' },
  'rush': { days: 1, label: '24 Hours', icon: Clock, color: 'bg-orange-500' },
  'same-day': { days: 0.5, label: 'Same Day (12 Hours)', icon: Zap, color: 'bg-red-500' }
};

export default function DeliveryCalculator({ 
  deliverySpeed, 
  className = '' 
}: DeliveryCalculatorProps) {
  const deliveryInfo = useMemo(() => {
    const option = deliveryOptions[deliverySpeed];
    const now = new Date();
    
    let estimatedDate: Date;
    
    if (deliverySpeed === 'same-day') {
      const hoursToAdd = 12;
      estimatedDate = new Date(now.getTime() + hoursToAdd * 60 * 60 * 1000);
    } else if (deliverySpeed === 'rush') {
      estimatedDate = addBusinessDays(now, 1);
    } else {
      estimatedDate = addBusinessDays(now, 3);
    }
    
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    return {
      ...option,
      estimatedDate,
      userTimezone,
      formattedDate: format(estimatedDate, 'EEEE, MMMM do, yyyy'),
      formattedTime: format(estimatedDate, 'h:mm a'),
      isWeekend: isWeekend(estimatedDate)
    };
  }, [deliverySpeed]);

  const Icon = deliveryInfo.icon;

  return (
    <div className={`bg-white/10 rounded-lg border border-white/20 p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${deliveryInfo.color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-white">{deliveryInfo.label}</h4>
            {deliverySpeed === 'rush' && (
              <Badge variant="outline" className="border-orange-500/50 text-orange-300">
                Priority
              </Badge>
            )}
            {deliverySpeed === 'same-day' && (
              <Badge variant="outline" className="border-red-500/50 text-red-300">
                Urgent
              </Badge>
            )}
          </div>
          
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2 text-white/90">
              <Calendar className="w-4 h-4 text-white/60" />
              <span className="font-medium">{deliveryInfo.formattedDate}</span>
            </div>
            
            {deliverySpeed === 'same-day' && (
              <div className="flex items-center gap-2 text-white/90">
                <Clock className="w-4 h-4 text-white/60" />
                <span>By {deliveryInfo.formattedTime}</span>
              </div>
            )}
            
            <div className="text-white/60 text-xs">
              Timezone: {deliveryInfo.userTimezone}
            </div>
          </div>

          {deliveryInfo.isWeekend && deliverySpeed !== 'same-day' && (
            <div className="mt-2 p-2 bg-yellow-500/20 border border-yellow-500/30 rounded text-yellow-200 text-xs">
              Note: Delivery falls on a weekend. Your documentation will be ready on the next business day.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
