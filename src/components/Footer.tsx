const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t mt-12">
      <div className="container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src="/viberdoc-logo.png" 
            alt="Viberdoc" 
            className="h-6"
          />
        </div>

        <div className="text-sm text-muted-foreground">
          © {currentYear} Viberdoc. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
