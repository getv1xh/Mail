export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 relative">
      {/* Left panel - Form */}
      <div className="flex items-center justify-center p-8 z-10 relative">
        <div className="absolute inset-0 bg-background/50 backdrop-blur-3xl -z-10 lg:hidden"></div>
        <div className="w-full max-w-md animate-slide-up">
          {children}
        </div>
      </div>
      
      {/* Right panel - Premium Visual */}
      <div className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden bg-sidebar border-l border-border">
        {/* Subtle highlight */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
        
        {/* Abstract shapes / UI elements floating */}
        <div className="absolute inset-0 z-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

        <div className="z-10 relative">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl shadow-sm">
              V
            </div>
            <span className="font-heading font-bold text-2xl tracking-tight text-foreground">VMailx</span>
          </div>
        </div>
        
        <div className="z-10 relative max-w-lg">
          <h1 className="text-4xl lg:text-5xl font-heading font-bold text-foreground mb-6 leading-tight">
            Enterprise email, <br />
            <span className="text-primary">reimagined.</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-md leading-relaxed">
            Take control of your professional communication with a blazing-fast, secure, and minimal email platform.
          </p>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center shadow-sm">
                  <div className="w-full h-full rounded-full bg-primary/10" />
                </div>
              ))}
            </div>
            <p>Join thousands of forward-thinking teams.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
