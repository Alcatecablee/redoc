import { FileText } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t mt-12">
      <div className="container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold">DocSnap</span>
        </div>

        <div className="text-sm text-muted-foreground">
          © {currentYear} DocSnap. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
