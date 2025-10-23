import { CheckBadgeIcon, BoltIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CustomPricingFormWizard from '@/components/CustomPricingFormWizard';

export default function CustomProjects() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[rgb(14,19,23)] via-[rgb(24,29,37)] to-[rgb(34,38,46)]">
      <Header />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[rgb(14,19,23)] via-[rgb(24,29,37)] to-[rgb(34,38,46)] pt-32 pb-20">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-grid-white/[0.02] opacity-30" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-96 bg-gradient-radial from-[rgb(102,255,228)]/10 via-transparent to-transparent blur-3xl" />
        
        <div className="relative container mx-auto px-6 max-w-7xl">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-6">
              <BoltIcon className="h-4 w-4 text-[rgb(102,255,228)]" strokeWidth={2} />
              <span className="text-sm font-semibold text-white/90 uppercase tracking-wide">One-Time Projects</span>
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
              Custom Documentation
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[rgb(102,255,228)] to-[rgb(80,200,180)]">
                Projects
              </span>
            </h1>
            <p className="text-lg md:text-xl text-white/70 max-w-3xl mx-auto font-light leading-relaxed">
              Need bespoke documentation for a specific project? Configure exactly what you need with our interactive pricing wizard and get a custom quote tailored to your requirements.
            </p>
          </div>

          {/* Key Benefits Grid */}
          <div className="max-w-4xl mx-auto mb-20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: CheckBadgeIcon, title: "Transparent Pricing", desc: "See exactly what you're paying for" },
                { icon: ShieldCheckIcon, title: "No Commitments", desc: "One-time payment, no subscriptions" },
                { icon: BoltIcon, title: "Fast Turnaround", desc: "12-hour to 3-day delivery options" },
              ].map((item, idx) => (
                <div key={idx} className="group relative">
                  <div className="relative bg-gradient-to-br from-white/10 to-white/5 border border-white/20 hover:border-[rgb(102,255,228)]/50 rounded-2xl p-6 transition-all duration-500 backdrop-blur-sm hover:shadow-[0_10px_30px_rgba(102,255,228,0.15)]">
                    <div className="flex flex-col items-center text-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[rgb(102,255,228)]/20 to-[rgb(102,255,228)]/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <item.icon className="h-6 w-6 text-[rgb(102,255,228)]" strokeWidth={1.5} />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-white mb-1">{item.title}</h4>
                        <p className="text-sm text-white/70 leading-tight">{item.desc}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Wizard Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[rgb(36,77,91)] via-[rgb(40,85,100)] to-[rgb(36,77,91)] py-32 lg:py-40">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-grid-white/[0.02] opacity-50" />
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-radial from-[rgb(102,255,228)]/10 via-transparent to-transparent blur-3xl" />
        <div className="absolute bottom-1/3 left-1/3 w-96 h-96 bg-gradient-radial from-[rgb(102,255,228)]/5 via-transparent to-transparent blur-3xl" />
        
        <div className="relative container mx-auto px-6 max-w-7xl">
          {/* Section Header */}
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight tracking-tight">
              Configure Your Project
            </h2>
            <p className="text-lg md:text-xl text-white/70 max-w-3xl mx-auto font-light">
              Choose from our preset packages or build a custom configuration with exactly the features you need.
            </p>
          </div>

          {/* Wizard Container - Enhanced */}
          <div className="max-w-6xl mx-auto">
            <div className="relative bg-gradient-to-br from-white/10 to-white/5 border-2 border-white/25 hover:border-[rgb(102,255,228)]/50 rounded-3xl p-8 md:p-12 lg:p-16 transition-all duration-500 backdrop-blur-sm shadow-[0_25px_60px_rgba(0,0,0,0.3)] hover:shadow-[0_30px_80px_rgba(102,255,228,0.2)]">
              {/* Decorative corner accents */}
              <div className="absolute top-0 left-0 w-20 h-20 border-t-2 border-l-2 border-white/30 rounded-tl-3xl"></div>
              <div className="absolute bottom-0 right-0 w-20 h-20 border-b-2 border-r-2 border-white/30 rounded-br-3xl"></div>
              
              {/* Wizard Component */}
              <div className="relative z-10">
                <CustomPricingFormWizard />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Comparison Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[rgb(14,19,23)] via-[rgb(24,29,37)] to-[rgb(34,38,46)] py-32">
        <div className="absolute inset-0 bg-grid-white/[0.02] opacity-30" />
        
        <div className="relative container mx-auto px-6 max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              What's Included in Each Package?
            </h2>
            <p className="text-lg md:text-xl text-white/70 max-w-3xl mx-auto">
              All packages include our core research engine with 10+ sources. Choose the one that fits your needs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Project Basic */}
            <div className="relative bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-3xl p-8 transition-all duration-500 backdrop-blur-sm hover:border-[rgb(102,255,228)]/50 hover:shadow-[0_20px_50px_rgba(102,255,228,0.1)]">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">Project Basic</h3>
                <p className="text-3xl font-bold text-[rgb(102,255,228)] mb-2">$500</p>
                <p className="text-white/60 text-sm">One-time payment</p>
              </div>
              <ul className="space-y-3 text-white/80">
                <li className="flex items-start gap-2">
                  <CheckBadgeIcon className="w-5 h-5 text-[rgb(102,255,228)] flex-shrink-0 mt-0.5" />
                  <span>8-12 documentation sections</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckBadgeIcon className="w-5 h-5 text-[rgb(102,255,228)] flex-shrink-0 mt-0.5" />
                  <span>Standard research depth</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckBadgeIcon className="w-5 h-5 text-[rgb(102,255,228)] flex-shrink-0 mt-0.5" />
                  <span>PDF & Markdown formats</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckBadgeIcon className="w-5 h-5 text-[rgb(102,255,228)] flex-shrink-0 mt-0.5" />
                  <span>72-hour delivery</span>
                </li>
              </ul>
            </div>

            {/* Project Plus */}
            <div className="relative bg-gradient-to-br from-[rgb(102,255,228)]/15 to-[rgb(102,255,228)]/5 border-2 border-[rgb(102,255,228)]/40 rounded-3xl p-8 transition-all duration-500 backdrop-blur-sm shadow-[0_20px_50px_rgba(102,255,228,0.15)]">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-[rgb(102,255,228)] text-gray-900 px-4 py-1 rounded-full text-sm font-bold uppercase">Most Popular</span>
              </div>
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">Project Plus</h3>
                <p className="text-3xl font-bold text-[rgb(102,255,228)] mb-2">$1,200</p>
                <p className="text-white/60 text-sm">One-time payment</p>
              </div>
              <ul className="space-y-3 text-white/80">
                <li className="flex items-start gap-2">
                  <CheckBadgeIcon className="w-5 h-5 text-[rgb(102,255,228)] flex-shrink-0 mt-0.5" />
                  <span>13-20 documentation sections</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckBadgeIcon className="w-5 h-5 text-[rgb(102,255,228)] flex-shrink-0 mt-0.5" />
                  <span>Deep research across all sources</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckBadgeIcon className="w-5 h-5 text-[rgb(102,255,228)] flex-shrink-0 mt-0.5" />
                  <span>All export formats</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckBadgeIcon className="w-5 h-5 text-[rgb(102,255,228)] flex-shrink-0 mt-0.5" />
                  <span>24-hour rush delivery</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckBadgeIcon className="w-5 h-5 text-[rgb(102,255,228)] flex-shrink-0 mt-0.5" />
                  <span>YouTube integration & SEO</span>
                </li>
              </ul>
            </div>

            {/* Project Premium */}
            <div className="relative bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-3xl p-8 transition-all duration-500 backdrop-blur-sm hover:border-[rgb(102,255,228)]/50 hover:shadow-[0_20px_50px_rgba(102,255,228,0.1)]">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">Project Premium</h3>
                <p className="text-3xl font-bold text-[rgb(102,255,228)] mb-2">$2,500</p>
                <p className="text-white/60 text-sm">One-time payment</p>
              </div>
              <ul className="space-y-3 text-white/80">
                <li className="flex items-start gap-2">
                  <CheckBadgeIcon className="w-5 h-5 text-[rgb(102,255,228)] flex-shrink-0 mt-0.5" />
                  <span>20+ comprehensive sections</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckBadgeIcon className="w-5 h-5 text-[rgb(102,255,228)] flex-shrink-0 mt-0.5" />
                  <span>Maximum research depth</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckBadgeIcon className="w-5 h-5 text-[rgb(102,255,228)] flex-shrink-0 mt-0.5" />
                  <span>All formats & customization</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckBadgeIcon className="w-5 h-5 text-[rgb(102,255,228)] flex-shrink-0 mt-0.5" />
                  <span>12-hour same-day delivery</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckBadgeIcon className="w-5 h-5 text-[rgb(102,255,228)] flex-shrink-0 mt-0.5" />
                  <span>Dedicated account manager</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckBadgeIcon className="w-5 h-5 text-[rgb(102,255,228)] flex-shrink-0 mt-0.5" />
                  <span>3 revision rounds included</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
