import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Database, Upload, FileSpreadsheet, Download, Menu, X } from "lucide-react";

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { to: '/', label: '聊天', icon: '💬' },
    { to: '/players', label: '球员管理', icon: '👥' },
    { to: '/grouping', label: '分组工具', icon: '🎯' },
  ];

  return (
    <header 
      className="fixed top-0 w-full z-50 bg-[#002a86] text-white shadow-[0_1px_2px_rgba(0,0,0,0.1)]"
      data-testid="shell-bar"
    >
      {/* Desktop Header - SAP.com style */}
      <div className="h-14 flex items-center px-6 md:px-8">
        <div className="flex items-center gap-4">
          <span className="text-xl font-medium tracking-tight">🏀</span>
          <h1 className="text-white font-medium text-base md:text-lg hidden sm:block tracking-tight">篮球球员分组系统</h1>
        </div>
        
        {/* Desktop Navigation - SAP style nav */}
        <nav className="hidden md:flex ml-8 gap-0.5">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `px-4 py-2 rounded text-[15px] font-medium transition-colors ${
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-white/90 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {item.icon} {item.label}
            </NavLink>
          ))}
        </nav>
        
        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden ml-auto text-white p-2"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          data-testid="mobile-menu-toggle"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        
        {/* 数据管理菜单 */}
        <div className="hidden md:flex ml-auto items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="text-white hover:bg-white/10"
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
            className="text-white hover:bg-white/10"
            data-testid="help-button"
          >
            帮助
          </Button>
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-white/20 text-white text-sm">J</AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[#002a86] border-t border-white/10">
          <nav className="px-4 py-2 space-y-1">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-4 py-2 rounded text-[15px] font-medium transition-colors ${
                    isActive
                      ? 'bg-white/15 text-white'
                      : 'text-white/90 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                {item.icon} {item.label}
              </NavLink>
            ))}
          </nav>
          
          {/* Mobile Data Management */}
          <div className="px-4 py-2 border-t border-white/10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="w-full text-white hover:bg-white/10 justify-start"
                >
                  <Database className="w-4 h-4 mr-2" />
                  数据管理
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={onOpenImportPlayers}>
                  <Upload className="w-4 h-4 mr-2" />
                  批量导入球员
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenImportGames}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  导入比赛数据
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onOpenExport}>
                  <Download className="w-4 h-4 mr-2" />
                  导出数据
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}
    </header>
  );
}
