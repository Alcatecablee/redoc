import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  Rocket, 
  Star, 
  Workflow, 
  Code, 
  AlertCircle, 
  HelpCircle,
  ChevronRight,
  Info,
  AlertTriangle,
  CheckCircle
} from "lucide-react";

interface ContentBlock {
  type: string;
  text?: string;
  level?: number;
  items?: string[];
  language?: string;
  code?: string;
  calloutType?: string;
  rows?: any[];
  columns?: string[];
  url?: string;
  alt?: string;
  caption?: string;
}

interface Section {
  id: string;
  title: string;
  icon: string;
  content: ContentBlock[];
}

interface Theme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  colors: string[];
  fonts: string[];
  primaryFont: string;
}

interface DocumentationViewerProps {
  title: string;
  description?: string;
  sections: Section[];
  theme?: Theme;
}

const iconMap: Record<string, any> = {
  BookOpen,
  Rocket,
  Star,
  Workflow,
  Code,
  AlertCircle,
  HelpCircle,
};

const calloutIcons: Record<string, any> = {
  info: Info,
  warning: AlertTriangle,
  tip: CheckCircle,
  note: Info,
};

const calloutStyles: Record<string, string> = {
  info: "bg-blue-50 border-blue-200 text-blue-900",
  warning: "bg-amber-50 border-amber-200 text-amber-900",
  tip: "bg-green-50 border-green-200 text-green-900",
  note: "bg-gray-50 border-gray-200 text-gray-900",
};

export function DocumentationViewer({ title, description, sections, theme }: DocumentationViewerProps) {
  const [activeSection, setActiveSection] = useState(sections[0]?.id || "");
  
  // Apply theme colors dynamically
  const primaryColor = theme?.primaryColor || '#8B5CF6';
  const secondaryColor = theme?.secondaryColor || '#6366F1';
  const primaryFont = theme?.primaryFont || 'Inter, system-ui, sans-serif';

  const renderContent = (block: ContentBlock, index: number) => {
    switch (block.type) {
      case "paragraph":
        return (
          <p key={index} className="text-base text-muted-foreground leading-relaxed mb-4">
            {block.text}
          </p>
        );

      case "heading":
        const HeadingTag = `h${block.level}` as keyof JSX.IntrinsicElements;
        const headingClasses = {
          2: "text-2xl font-bold mt-8 mb-4",
          3: "text-xl font-semibold mt-6 mb-3",
          4: "text-lg font-medium mt-4 mb-2"
        }[block.level || 3];
        
        return (
          <HeadingTag 
            key={index} 
            className={headingClasses}
            style={{ color: block.level === 2 ? primaryColor : secondaryColor }}
          >
            {block.text}
          </HeadingTag>
        );

      case "list":
        return (
          <ul key={index} className="space-y-2 mb-4 ml-6">
            {block.items?.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <ChevronRight 
                  className="h-5 w-5 mt-0.5 flex-shrink-0" 
                  style={{ color: primaryColor }}
                />
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        );

      case "code":
        return (
          <Card key={index} className="p-4 mb-4 bg-gray-900 border-gray-800">
            {block.language && (
              <Badge variant="outline" className="mb-2 text-xs">
                {block.language}
              </Badge>
            )}
            <pre className="overflow-x-auto">
              <code className="text-sm text-gray-100 font-mono">
                {block.code || block.text}
              </code>
            </pre>
          </Card>
        );

      case "callout":
        const CalloutIcon = calloutIcons[block.calloutType || "info"];
        const calloutClass = calloutStyles[block.calloutType || "info"];
        
        return (
          <Card key={index} className={`p-4 mb-4 border-2 ${calloutClass}`}>
            <div className="flex gap-3">
              <CalloutIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm leading-relaxed">{block.text}</p>
            </div>
          </Card>
        );

      case "table":
        return (
          <div key={index} className="mb-4 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  {block.columns?.map((col, i) => (
                    <th key={i} className="text-left p-3 font-semibold text-sm">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows?.map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    {Object.values(row).map((cell: any, j) => (
                      <td key={j} className="p-3 text-sm text-muted-foreground">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "image":
        return (
          <figure key={index} className="mb-6">
            <img 
              src={block.url} 
              alt={block.alt || "Documentation image"} 
              className="w-full max-w-3xl rounded-lg border shadow-md"
              loading="lazy"
            />
            {block.caption && (
              <figcaption className="mt-2 text-sm text-muted-foreground text-center">
                {block.caption}
              </figcaption>
            )}
          </figure>
        );

      default:
        return null;
    }
  };

  const activeContent = sections.find((s) => s.id === activeSection);

  return (
    <div className="max-w-7xl mx-auto" style={{ fontFamily: primaryFont }}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-3" style={{ color: primaryColor }}>{title}</h1>
        {description && (
          <p className="text-xl text-muted-foreground">{description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Table of Contents */}
        <aside className="lg:col-span-1">
          <Card className="sticky top-20 p-4">
            <h3 className="font-semibold mb-4">Table of Contents</h3>
            <nav className="space-y-1">
              {sections.map((section) => {
                const Icon = iconMap[section.icon] || BookOpen;
                const isActive = activeSection === section.id;
                
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      isActive
                        ? "text-white"
                        : "hover:bg-accent text-muted-foreground"
                    }`}
                    style={isActive ? { backgroundColor: primaryColor } : {}}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" style={isActive ? {} : { color: primaryColor }} />
                    <span className="text-sm font-medium">{section.title}</span>
                  </button>
                );
              })}
            </nav>
          </Card>
        </aside>

        {/* Main Content */}
        <main className="lg:col-span-3">
          <Card className="p-8">
            {activeContent && (
              <>
                <div className="flex items-center gap-3 mb-6">
                  {(() => {
                    const Icon = iconMap[activeContent.icon] || BookOpen;
                    return <Icon className="h-6 w-6" style={{ color: primaryColor }} />;
                  })()}
                  <h2 className="text-3xl font-bold" style={{ color: primaryColor }}>{activeContent.title}</h2>
                </div>
                <Separator className="mb-6" />
                <div className="prose prose-slate max-w-none">
                  {activeContent.content.map((block, index) => 
                    renderContent(block, index)
                  )}
                </div>
              </>
            )}
          </Card>
        </main>
      </div>
    </div>
  );
}
