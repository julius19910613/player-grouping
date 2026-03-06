import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";

export function ShellBar() {
  return (
    <header 
      className="h-12 bg-primary flex items-center px-4 shadow-md fixed top-0 w-full z-50"
      data-testid="shell-bar"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">🏀</span>
        <h1 className="text-white font-semibold text-lg">篮球球员分组系统</h1>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="sm"
          className="text-white hover:bg-primary/80"
          data-testid="help-button"
        >
          帮助
        </Button>
        <Avatar className="w-8 h-8">
          <AvatarFallback className="bg-white/20 text-white text-sm">J</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
