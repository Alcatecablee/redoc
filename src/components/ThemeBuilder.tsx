import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Download, Upload, Palette, Check, AlertTriangle } from "lucide-react";
import { Theme } from "../../shared/themes";
import { validateThemeAccessibility } from "../../shared/accessibility";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface ThemeBuilderProps {
  onThemeCreated: (theme: Theme) => void;
}

export function ThemeBuilder({ onThemeCreated }: ThemeBuilderProps) {
  const { toast } = useToast();
  const [themeName, setThemeName] = useState("My Custom Theme");
  const [colors, setColors] = useState({
    primary: "#2563eb",
    secondary: "#64748b",
    accent: "#0ea5e9",
    background: "#ffffff",
    surface: "#f8fafc",
    text: "#0f172a",
    text_secondary: "#475569",
    border: "#e2e8f0",
    code_bg: "#f1f5f9",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444"
  });

  const [typography, setTypography] = useState({
    font_family: "Inter, -apple-system, system-ui, sans-serif",
    heading_font: "Inter, -apple-system, system-ui, sans-serif",
    code_font: "'Fira Code', Monaco, Consolas, monospace",
    heading_sizes: { h1: "2.5rem", h2: "2rem", h3: "1.5rem" }
  });

  const accessibilityResults = validateThemeAccessibility({
    colors: {
      text: colors.text,
      background: colors.background,
      primary: colors.primary,
      secondary: colors.secondary
    }
  });

  const handleColorChange = (key: string, value: string) => {
    setColors(prev => ({ ...prev, [key]: value }));
  };

  const handleCreateTheme = () => {
    const theme: Theme = {
      id: themeName.toLowerCase().replace(/\s+/g, '-'),
      name: themeName,
      colors,
      typography: {
        ...typography,
        base_size: "16px",
        line_height: "1.6",
        heading_weights: { h1: 700, h2: 600, h3: 600 }
      },
      spacing: {
        section: "3rem",
        paragraph: "1.5rem",
        list_item: "0.5rem",
        density: "comfortable"
      },
      styling: {
        border_radius: "8px",
        code_border_radius: "6px",
        shadow: "0 1px 3px rgba(0,0,0,0.1)"
      },
      layout: { orientation: "multi" }
    };

    onThemeCreated(theme);
    toast({
      title: "Theme Created!",
      description: `${themeName} is ready to use`
    });
  };

  const handleExportTheme = () => {
    const theme: Theme = {
      id: themeName.toLowerCase().replace(/\s+/g, '-'),
      name: themeName,
      colors,
      typography: {
        ...typography,
        base_size: "16px",
        line_height: "1.6",
        heading_weights: { h1: 700, h2: 600, h3: 600 }
      },
      spacing: {
        section: "3rem",
        paragraph: "1.5rem",
        list_item: "0.5rem",
        density: "comfortable"
      },
      styling: {
        border_radius: "8px",
        code_border_radius: "6px",
        shadow: "0 1px 3px rgba(0,0,0,0.1)"
      },
      layout: { orientation: "multi" }
    };

    const dataStr = JSON.stringify(theme, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${theme.id}-theme.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Theme Exported!",
      description: "Theme file downloaded successfully"
    });
  };

  const handleImportTheme = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const theme = JSON.parse(e.target?.result as string);
        setThemeName(theme.name);
        setColors(theme.colors);
        if (theme.typography) {
          setTypography({
            font_family: theme.typography.font_family,
            heading_font: theme.typography.heading_font,
            code_font: theme.typography.code_font,
            heading_sizes: theme.typography.heading_sizes || { h1: "2.5rem", h2: "2rem", h3: "1.5rem" }
          });
        }
        toast({
          title: "Theme Imported!",
          description: `${theme.name} loaded successfully`
        });
      } catch (error) {
        toast({
          title: "Import Failed",
          description: "Invalid theme file",
          variant: "destructive"
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Palette className="h-4 w-4" />
          Create Custom Theme
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Custom Theme Builder</DialogTitle>
          <DialogDescription>
            Create your own professional theme with custom colors and fonts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Theme Name */}
          <div className="space-y-2">
            <Label>Theme Name</Label>
            <Input
              value={themeName}
              onChange={(e) => setThemeName(e.target.value)}
              placeholder="My Custom Theme"
            />
          </div>

          {/* Accessibility Check */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              Accessibility Check
              {accessibilityResults.overallPass ? (
                <Badge className="bg-green-500">
                  <Check className="h-3 w-3 mr-1" /> WCAG {accessibilityResults.textOnBackground.level}
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" /> Needs Improvement
                </Badge>
              )}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Text on Background:</span>
                <span className="font-mono">
                  {accessibilityResults.textOnBackground.ratio}:1 
                  {accessibilityResults.textOnBackground.passesAA ? ' ✓' : ' ✗'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Primary on Background:</span>
                <span className="font-mono">
                  {accessibilityResults.primaryOnBackground.ratio}:1
                  {accessibilityResults.primaryOnBackground.passesAA ? ' ✓' : ' ✗'}
                </span>
              </div>
            </div>
          </Card>

          {/* Color Palette */}
          <div className="space-y-4">
            <h3 className="font-semibold">Color Palette</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(colors).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <Label className="text-xs capitalize">{key.replace(/_/g, ' ')}</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={value}
                      onChange={(e) => handleColorChange(key, e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      type="text"
                      value={value}
                      onChange={(e) => handleColorChange(key, e.target.value)}
                      className="flex-1 font-mono text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Typography */}
          <div className="space-y-4">
            <h3 className="font-semibold">Typography</h3>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Body Font</Label>
                <Input
                  value={typography.font_family}
                  onChange={(e) => setTypography(prev => ({ ...prev, font_family: e.target.value }))}
                  placeholder="Inter, system-ui, sans-serif"
                />
              </div>
              <div className="space-y-2">
                <Label>Heading Font</Label>
                <Input
                  value={typography.heading_font}
                  onChange={(e) => setTypography(prev => ({ ...prev, heading_font: e.target.value }))}
                  placeholder="Inter, system-ui, sans-serif"
                />
              </div>
              <div className="space-y-2">
                <Label>Code Font</Label>
                <Input
                  value={typography.code_font}
                  onChange={(e) => setTypography(prev => ({ ...prev, code_font: e.target.value }))}
                  placeholder="'Fira Code', Monaco, monospace"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <Card className="p-6" style={{ 
            backgroundColor: colors.background,
            fontFamily: typography.font_family 
          }}>
            <h2 className="text-2xl font-bold mb-2" style={{ color: colors.primary }}>
              Theme Preview
            </h2>
            <p className="mb-4" style={{ color: colors.text }}>
              This is how your documentation will look with this theme.
            </p>
            <div className="flex gap-2 flex-wrap">
              <div className="px-3 py-1 rounded" style={{ backgroundColor: colors.primary, color: '#fff' }}>
                Primary
              </div>
              <div className="px-3 py-1 rounded" style={{ backgroundColor: colors.secondary, color: '#fff' }}>
                Secondary
              </div>
              <div className="px-3 py-1 rounded" style={{ backgroundColor: colors.accent, color: '#fff' }}>
                Accent
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={handleCreateTheme} className="flex-1">
              <Palette className="h-4 w-4 mr-2" />
              Create Theme
            </Button>
            <Button onClick={handleExportTheme} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" asChild>
              <label>
                <Upload className="h-4 w-4 mr-2" />
                Import
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImportTheme}
                />
              </label>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
