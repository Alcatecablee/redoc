import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  CurrencyDollarIcon,
  CheckCircleIcon,
  RocketLaunchIcon,
  MagnifyingGlassIcon,
  CodeBracketIcon,
  DocumentMagnifyingGlassIcon,
  SparklesIcon,
  BoltIcon,
  DocumentTextIcon,
  ClockIcon,
  CalculatorIcon,
  ChartBarIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import Header from '@/components/Header';

const addons = [
  { 
    id: 'extended_research', 
    name: 'Extended Research', 
    description: 'Deep dive into 50+ YouTube tutorials, 200+ Stack Overflow questions', 
    price: 500, 
    icon: MagnifyingGlassIcon
  },
  { 
    id: 'code_snippets', 
    name: 'Code Snippets & Validation', 
    description: 'Extract and test 50-200 code samples with multi-language support', 
    price: 700, 
    icon: CodeBracketIcon
  },
  { 
    id: 'migration_guides', 
    name: 'Migration Guides', 
    description: 'Getting Started guides and competitor migration paths', 
    price: 850, 
    icon: DocumentMagnifyingGlassIcon
  },
  { 
    id: 'api_reference', 
    name: 'API Reference Documentation', 
    description: 'Auto-generate endpoint docs, authentication guides, rate limits', 
    price: 1400, 
    icon: DocumentTextIcon
  },
  { 
    id: 'white_label', 
    name: 'White-Label Branding', 
    description: 'Custom themes, logo integration, subdomain hosting', 
    price: 350, 
    icon: SparklesIcon
  },
  { 
    id: 'rush', 
    name: 'Rush Delivery (24-48h)', 
    description: 'Priority processing and expedited delivery', 
    price: 500, 
    icon: BoltIcon
  },
];

const exampleProjects = [
  {
    name: 'Starter Project',
    description: 'Small library or early-stage product',
    resources: 15,
    complexity: 'Low',
    multiplier: 1.0,
    calculation: '$300 + (15 × $5) × 1.0 = $375',
    calculationNote: 'Waived (under 20 resources)',
    total: 0,
    badge: 'FREE',
    badgeColor: 'from-green-500/20 to-green-500/10 border-green-500/40 text-green-400',
    examples: ['New OSS library', 'Beta product', 'Small tool']
  },
  {
    name: 'Growing Product',
    description: 'Active community, solid documentation needs',
    resources: 50,
    complexity: 'Medium',
    multiplier: 1.5,
    calculation: '$300 + (50 × $5) × 1.5',
    total: 675,
    badge: '$675',
    badgeColor: 'from-[rgb(102,255,228)]/20 to-[rgb(102,255,228)]/10 border-[rgb(102,255,228)]/40 text-[rgb(102,255,228)]',
    examples: ['SaaS platform', 'Developer tool', 'Framework']
  },
  {
    name: 'Established Ecosystem',
    description: 'Vibrant community across multiple platforms',
    resources: 150,
    complexity: 'High',
    multiplier: 2.0,
    calculation: '$300 + (150 × $5) × 2.0',
    total: 1800,
    badge: '$1,800',
    badgeColor: 'from-purple-500/20 to-purple-500/10 border-purple-500/40 text-purple-400',
    examples: ['Auth provider', 'Payment API', 'Cloud platform'],
    popular: true
  },
  {
    name: 'Major Platform',
    description: 'Enterprise-scale with massive community',
    resources: 500,
    complexity: 'High',
    multiplier: 2.0,
    calculation: '$300 + (500 × $5) × 2.0 = $5,300',
    total: 5000,
    badge: '$5,000',
    badgeColor: 'from-orange-500/20 to-orange-500/10 border-orange-500/40 text-orange-400',
    examples: ['Stripe-level', 'AWS service', 'Major framework'],
    capped: true
  },
];

export default function SubscriptionPricing() {
  const navigate = useNavigate();

  const handleGetQuote = () => {
    navigate('/#hero');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[rgb(14,19,23)] via-[rgb(24,29,37)] to-[rgb(34,38,46)]">
      {/* Background Elements */}
      <div className="fixed inset-0 bg-grid-white/[0.02] opacity-30 pointer-events-none" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-96 bg-gradient-radial from-[rgb(102,255,228)]/5 via-transparent to-transparent blur-3xl pointer-events-none" />
      
      <Header />
      
      <div className="relative py-12 px-4 lg:py-20">
        <div className="max-w-7xl mx-auto">
          
          {/* Hero Section */}
          <div className="text-center mb-16 lg:mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-6">
              <CurrencyDollarIcon className="h-4 w-4 text-[rgb(102,255,228)]" />
              <span className="text-sm font-semibold text-white/90 uppercase tracking-wide">Transparent Pricing</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-white leading-tight tracking-tight">
              Custom Documentation for<br />
              <span className="text-[rgb(102,255,228)]">DevRel Teams</span>
            </h1>
            
            <p className="text-lg lg:text-xl text-white/70 max-w-3xl mx-auto mb-8 font-light">
              Pay only for what you need. Instant quotes based on your community footprint.<br />
              No subscriptions. No hidden fees. Just transparent, fair pricing.
            </p>

            <Button
              onClick={handleGetQuote}
              className="h-14 px-10 bg-[rgb(102,255,228)] hover:bg-white text-[rgb(14,19,23)] font-bold text-base rounded-full uppercase tracking-wider transition-all duration-200 shadow-xl hover:shadow-2xl hover:scale-105"
            >
              <RocketLaunchIcon className="h-5 w-5 mr-2" />
              Get Your Instant Quote
            </Button>
          </div>

          {/* Pricing Formula */}
          <div className="mb-20">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-4">
                <CalculatorIcon className="h-4 w-4 text-[rgb(102,255,228)]" />
                <span className="text-sm font-semibold text-white/90 uppercase tracking-wide">How It Works</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Simple, Transparent Formula</h2>
              <p className="text-white/60 max-w-2xl mx-auto">We count your community resources and calculate a fair price</p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="relative bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-3xl p-8 md:p-12 backdrop-blur-sm">
                {/* Formula */}
                <div className="text-center mb-8">
                  <div className="text-2xl md:text-3xl font-mono font-bold text-white mb-4">
                    <span className="text-white/70">$300</span>
                    {' + '}
                    <span className="text-[rgb(102,255,228)]">(Resources × $5)</span>
                    {' × '}
                    <span className="text-purple-400">Complexity</span>
                  </div>
                  <div className="text-sm text-white/60">Capped at $5,000 maximum</div>
                </div>

                {/* Formula Breakdown */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-white/70 text-sm mb-1">Base Minimum</div>
                    <div className="text-2xl font-bold text-white">$300</div>
                    <div className="text-xs text-white/50 mt-1">Covers basic research & generation</div>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-white/70 text-sm mb-1">Per Resource</div>
                    <div className="text-2xl font-bold text-[rgb(102,255,228)]">$5</div>
                    <div className="text-xs text-white/50 mt-1">Stack Overflow, GitHub, YouTube, etc.</div>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-white/70 text-sm mb-1">Complexity Multiplier</div>
                    <div className="text-2xl font-bold text-purple-400">1.0-2.0×</div>
                    <div className="text-xs text-white/50 mt-1">Low, Medium, or High complexity</div>
                  </div>
                </div>

                {/* Free Tier Callout */}
                <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-green-500/20 to-green-500/10 border border-green-500/40">
                  <div className="flex items-center gap-3">
                    <CheckCircleIcon className="w-6 h-6 text-green-400 flex-shrink-0" />
                    <div>
                      <div className="text-green-300 font-semibold">Projects under 20 resources are FREE</div>
                      <div className="text-green-200/70 text-sm">Perfect for small libraries and early-stage products</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Example Projects */}
          <div className="mb-20">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-4">
                <ChartBarIcon className="h-4 w-4 text-[rgb(102,255,228)]" />
                <span className="text-sm font-semibold text-white/90 uppercase tracking-wide">Example Pricing</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Real-World Examples</h2>
              <p className="text-white/60 max-w-2xl mx-auto">See what documentation would cost for different project sizes</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {exampleProjects.map((project, idx) => (
                <div
                  key={idx}
                  className={`relative bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-3xl p-6 backdrop-blur-sm transition-all duration-300 hover:border-[rgb(102,255,228)]/50 hover:scale-105 ${
                    project.popular ? 'ring-2 ring-[rgb(102,255,228)]/30' : ''
                  }`}
                >
                  {project.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <div className="px-4 py-1 rounded-full bg-[rgb(102,255,228)] text-[rgb(14,19,23)] text-xs font-bold uppercase">
                        Most Common
                      </div>
                    </div>
                  )}

                  <div className="mb-4">
                    <div className={`inline-flex px-4 py-2 rounded-full bg-gradient-to-br ${project.badgeColor} border backdrop-blur-sm text-lg font-bold mb-3`}>
                      {project.badge}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{project.name}</h3>
                    <p className="text-sm text-white/60 mb-4">{project.description}</p>
                  </div>

                  <div className="space-y-2 mb-4 pb-4 border-b border-white/10">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Resources</span>
                      <span className="text-white font-semibold">{project.resources}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Complexity</span>
                      <span className="text-white font-semibold">{project.complexity}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Multiplier</span>
                      <span className="text-white font-semibold">{project.multiplier}×</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="text-xs text-white/50 mb-1">Calculation:</div>
                    <div className="text-xs font-mono text-white/80 bg-white/5 p-2 rounded">
                      {project.calculation}
                    </div>
                    {project.capped && (
                      <div className="text-xs text-orange-400 mt-1">Capped at maximum</div>
                    )}
                    {(project as any).calculationNote && (
                      <div className="text-xs text-green-400 mt-1">{(project as any).calculationNote}</div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs text-white/50 mb-1">Examples:</div>
                    {project.examples.map((example, i) => (
                      <div key={i} className="text-xs text-white/70">{example}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Premium Add-ons */}
          <div className="mb-20">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-4">
                <SparklesIcon className="h-4 w-4 text-[rgb(102,255,228)]" />
                <span className="text-sm font-semibold text-white/90 uppercase tracking-wide">Premium Add-ons</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Enhance Your Documentation</h2>
              <p className="text-white/60 max-w-2xl mx-auto">Optional features to supercharge your docs</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {addons.map((addon) => {
                const Icon = addon.icon;
                return (
                  <div
                    key={addon.id}
                    className="relative bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6 backdrop-blur-sm transition-all duration-300 hover:border-[rgb(102,255,228)]/50 hover:scale-105"
                  >
                    <div className="flex items-start gap-4 mb-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[rgb(102,255,228)]/20 to-[rgb(102,255,228)]/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-6 h-6 text-[rgb(102,255,228)]" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white mb-1">{addon.name}</h3>
                        <div className="text-[rgb(102,255,228)] font-bold text-xl">+${addon.price}</div>
                      </div>
                    </div>
                    <p className="text-sm text-white/70 leading-relaxed">{addon.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Value Comparison */}
          <div className="mb-20">
            <div className="max-w-4xl mx-auto">
              <div className="relative bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-3xl p-8 md:p-12 backdrop-blur-sm">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-4">
                    <BuildingOfficeIcon className="h-4 w-4 text-[rgb(102,255,228)]" />
                    <span className="text-sm font-semibold text-white/90 uppercase tracking-wide">ROI Comparison</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Save 70% vs Manual Research</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                    <div className="text-white/60 text-sm mb-2">Manual DevRel Research</div>
                    <div className="text-4xl font-bold text-white mb-4">$8,000-$15,000</div>
                    <ul className="space-y-2 text-sm text-white/70">
                      <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-white/50 mt-2 flex-shrink-0" />
                        <span>Technical writer: $75-125/hour</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-white/50 mt-2 flex-shrink-0" />
                        <span>40-80 hours manual research</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-white/50 mt-2 flex-shrink-0" />
                        <span>3-4 weeks timeline</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-white/50 mt-2 flex-shrink-0" />
                        <span>One-time snapshot only</span>
                      </li>
                    </ul>
                  </div>

                  <div className="p-6 rounded-2xl bg-gradient-to-br from-[rgb(102,255,228)]/20 to-[rgb(102,255,228)]/10 border border-[rgb(102,255,228)]/40">
                    <div className="text-[rgb(102,255,228)] text-sm mb-2">Viberdoc Automated</div>
                    <div className="text-4xl font-bold text-white mb-4">$500-$5,000</div>
                    <ul className="space-y-2 text-sm text-white/90">
                      <li className="flex items-start gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-[rgb(102,255,228)] mt-0.5 flex-shrink-0" />
                        <span>Fully automated AI research</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-[rgb(102,255,228)] mt-0.5 flex-shrink-0" />
                        <span>Analyzes 100+ sources instantly</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-[rgb(102,255,228)] mt-0.5 flex-shrink-0" />
                        <span>24-48 hour delivery</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-[rgb(102,255,228)] mt-0.5 flex-shrink-0" />
                        <span>Can refresh quarterly</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <div className="text-2xl font-bold text-green-400">
                    Save $5,000-$10,000 (70% cost reduction)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Final CTA */}
          <div className="text-center">
            <div className="max-w-2xl mx-auto">
              <h3 className="text-3xl font-bold text-white mb-4">Ready to See Your Quote?</h3>
              <p className="text-white/70 mb-8">Paste your URL and get an instant, no-commitment quote in seconds</p>
              <Button
                onClick={handleGetQuote}
                className="h-16 px-12 bg-[rgb(102,255,228)] hover:bg-white text-[rgb(14,19,23)] font-bold text-lg rounded-full uppercase tracking-wider transition-all duration-200 shadow-xl hover:shadow-2xl hover:scale-105"
              >
                <RocketLaunchIcon className="h-6 w-6 mr-2" />
                Get Your Instant Quote (Free)
              </Button>
              <p className="mt-4 text-sm text-white/50">
                No credit card required • Free analysis • Instant results
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
