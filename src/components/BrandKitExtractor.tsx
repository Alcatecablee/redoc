import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Upload, Wand2 } from "lucide-react";
import { Theme } from "../../shared/themes";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface BrandKitExtractorProps {
  onThemeGenerated: (theme: Theme) => void;
}

export function BrandKitExtractor({ onThemeGenerated }: BrandKitExtractorProps) {
  const { toast } = useToast();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [extractedColors, setExtractedColors] = useState<string[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);

  const extractColorsFromImage = (imageUrl: string) => {
    setIsExtracting(true);
    const img = new Image();
    img.crossOrigin = "Anonymous";
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        toast({
          title: "Extraction Failed",
          description: "Could not process image",
          variant: "destructive"
        });
        setIsExtracting(false);
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      const colorMap: { [key: string]: number } = {};

      // Sample pixels (every 10th pixel for performance)
      for (let i = 0; i < pixels.length; i += 40) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const alpha = pixels[i + 3];

        // Skip transparent pixels
        if (alpha < 128) continue;

        const hex = rgbToHex(r, g, b);
        colorMap[hex] = (colorMap[hex] || 0) + 1;
      }

      // Get top 5 most common colors
      const sortedColors = Object.entries(colorMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([color]) => color);

      setExtractedColors(sortedColors);
      setIsExtracting(false);

      toast({
        title: "Colors Extracted!",
        description: `Found ${sortedColors.length} dominant colors`
      });
    };

    img.onerror = () => {
      toast({
        title: "Extraction Failed",
        description: "Could not load image. Try a different format.",
        variant: "destructive"
      });
      setIsExtracting(false);
    };

    img.src = imageUrl;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setLogoUrl(url);
      extractColorsFromImage(url);
    };
    reader.readAsDataURL(file);
  };

  const generateThemeFromColors = () => {
    if (extractedColors.length === 0) {
      toast({
        title: "No Colors",
        description: "Upload a logo first to extract colors",
        variant: "destructive"
      });
      return;
    }

    const theme: Theme = {
      id: "brand-kit-theme",
      name: "Brand Kit Theme",
      colors: {
        primary: extractedColors[0] || "#2563eb",
        secondary: extractedColors[1] || "#64748b",
        accent: extractedColors[2] || "#0ea5e9",
        background: "#ffffff",
        surface: "#f8fafc",
        text: "#0f172a",
        text_secondary: "#475569",
        border: "#e2e8f0",
        code_bg: "#f1f5f9",
        success: "#10b981",
        warning: "#f59e0b",
        error: "#ef4444"
      },
      typography: {
        font_family: "Inter, -apple-system, system-ui, sans-serif",
        heading_font: "Inter, -apple-system, system-ui, sans-serif",
        code_font: "'Fira Code', Monaco, Consolas, monospace",
        base_size: "16px",
        line_height: "1.6",
        heading_weights: { h1: 700, h2: 600, h3: 600 },
        heading_sizes: { h1: "2.5rem", h2: "2rem", h3: "1.5rem" }
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

    onThemeGenerated(theme);
    toast({
      title: "Theme Created!",
      description: "Brand colors applied to theme"
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Wand2 className="h-4 w-4" />
          Brand Kit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Extract Colors from Logo</DialogTitle>
          <DialogDescription>
            Upload your brand logo to automatically extract colors for your theme
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Upload Area */}
          <div className="space-y-2">
            <Label>Upload Logo</Label>
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="logo-upload"
              />
              <label htmlFor="logo-upload" className="cursor-pointer">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  PNG, JPG, SVG up to 10MB
                </p>
              </label>
            </div>
          </div>

          {/* Logo Preview */}
          {logoUrl && (
            <Card className="p-4">
              <img 
                src={logoUrl} 
                alt="Logo preview" 
                className="max-h-32 mx-auto"
              />
            </Card>
          )}

          {/* Extracted Colors */}
          {extractedColors.length > 0 && (
            <div className="space-y-3">
              <Label>Extracted Colors</Label>
              <div className="flex gap-2 flex-wrap">
                {extractedColors.map((color, index) => (
                  <div key={index} className="flex flex-col items-center gap-1">
                    <div
                      className="w-16 h-16 rounded-lg border-2 border-gray-200"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs font-mono">{color}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Generate Button */}
          {extractedColors.length > 0 && (
            <Button 
              onClick={generateThemeFromColors}
              className="w-full"
              disabled={isExtracting}
            >
              <Wand2 className="h-4 w-4 mr-2" />
              Generate Theme from Colors
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }).join('');
}
