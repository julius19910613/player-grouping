import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Database, Upload, FileSpreadsheet, Download } from "lucide-react";

interface ShellBarProps {
  onOpenImportPlayers?: () => void;
  onOpenImportGames?: () => void;
  onOpenExport?: () => void;
}

export function ShellBar({ 
  onOpenImportPlayers, 
  onOpenImportGames, 
  onOpenExport 
}: ShellBarProps) {
  return (
    <header 
      className="h-12 bg-primary flex items-center px-4 shadow-md fixed top-0 w-full z-50"
      data-testid="shell-bar"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">🏀</span>
        <h1 className="text-white font-semibold text-lg">篮球球员分组系统</h1>
      </div>
      
      {/* 数据管理菜单 */}
      <div className="ml-auto flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="text-white hover:bg-primary/80"
              data-testid="data-management-menu"
            >
              <Database className="w-4 h-4 mr-2" />
              数据管理
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem 
              onClick={onOpenImportPlayers}
              data-testid="menu-import-players"
            >
              <Upload className="w-4 h-4 mr-2" />
              批量导入球员
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={onOpenImportGames}
              data-testid="menu-import-games"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              导入比赛数据
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={onOpenExport}
              data-testid="menu-export"
            >
              <Download className="w-4 h-4 mr-2" />
              导出数据
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
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
