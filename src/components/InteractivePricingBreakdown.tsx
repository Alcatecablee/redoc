import { useState } from 'react';
import { 
  HelpCircle, 
  TrendingDown, 
  DollarSign, 
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface PricingLineItem {
  label: string;
  amount: number;
  tooltip?: string;
  marketRate?: number;
  savings?: number;
}

interface InteractivePricingBreakdownProps {
  lineItems: PricingLineItem[];
  subtotal: number;
  discount?: number;
  total: number;
  currency: 'USD' | 'ZAR';
  tierName?: string;
}

export default function InteractivePricingBreakdown({
  lineItems,
  subtotal,
  discount = 0,
  total,
  currency,
  tierName
}: InteractivePricingBreakdownProps) {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const currencySymbol = currency === 'ZAR' ? 'R' : '$';
  const exchangeRate = currency === 'ZAR' ? 18 : 1;

  const formatPrice = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const totalSavings = lineItems.reduce((sum, item) => sum + (item.savings || 0), 0) + discount;
  const marketTotal = subtotal + totalSavings;

  return (
    <TooltipProvider>
      <div className="bg-white/10 rounded-2xl border border-white/20 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Pricing Breakdown
          </h3>
          {tierName && (
            <Badge className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white border-0">
              {tierName} Package
            </Badge>
          )}
        </div>

        {totalSavings > 0 && (
          <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-green-400" />
            <div className="flex-1">
              <div className="text-green-300 font-semibold">
                You're saving {formatPrice(totalSavings)}!
              </div>
              <div className="text-green-200/80 text-sm">
                Compared to market rates: {formatPrice(marketTotal)}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {lineItems.map((item, index) => (
            <div key={index}>
              <div
                className={`flex items-start justify-between p-3 rounded-lg transition-all cursor-pointer ${
                  expandedItem === item.label 
                    ? 'bg-white/20' 
                    : 'hover:bg-white/10'
                }`}
                onClick={() => setExpandedItem(expandedItem === item.label ? null : item.label)}
              >
                <div className="flex items-start gap-2 flex-1">
                  <span className="text-white/90">{item.label}</span>
                  {item.tooltip && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-4 h-4 text-white/60 hover:text-white/90 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>{item.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-white font-semibold">
                    {formatPrice(item.amount)}
                  </div>
                  {item.marketRate && item.marketRate > item.amount && (
                    <div className="text-xs text-green-400 flex items-center gap-1">
                      <TrendingDown className="w-3 h-3" />
                      Market: {formatPrice(item.marketRate)}
                    </div>
                  )}
                </div>
              </div>

              {expandedItem === item.label && item.marketRate && (
                <div className="ml-6 mt-2 p-3 bg-white/5 rounded-lg border-l-2 border-green-500">
                  <div className="flex items-center gap-2 text-sm">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    <span className="text-white/90">
                      You're saving {formatPrice(item.marketRate - item.amount)} on this item
                    </span>
                  </div>
                  <div className="text-xs text-white/60 mt-1">
                    Professional technical writers typically charge {formatPrice(item.marketRate)} for this service
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <Separator className="bg-white/20" />

        <div className="space-y-2">
          <div className="flex justify-between text-white/90">
            <span>Subtotal</span>
            <span className="font-semibold">{formatPrice(subtotal)}</span>
          </div>

          {discount > 0 && (
            <div className="flex justify-between text-green-400">
              <span className="flex items-center gap-1">
                <TrendingDown className="w-4 h-4" />
                Discount
              </span>
              <span className="font-semibold">-{formatPrice(discount)}</span>
            </div>
          )}
        </div>

        <Separator className="bg-white/30" />

        <div className="flex justify-between items-center pt-2">
          <div>
            <div className="text-white font-bold text-2xl">
              {formatPrice(total)}
            </div>
            <div className="text-white/60 text-sm">{currency}</div>
          </div>
          {currency === 'USD' && (
            <div className="text-right">
              <div className="text-white/60 text-sm">Also available in ZAR</div>
              <div className="text-white/90 font-semibold">
                R{(total * exchangeRate).toLocaleString()}
              </div>
            </div>
          )}
        </div>

        <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3 flex items-start gap-2">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-200">
            <p className="font-medium">Price Lock Guarantee</p>
            <p className="text-blue-200/80 mt-1">
              Your price is locked for 7 days. No hidden fees or surprises.
            </p>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
