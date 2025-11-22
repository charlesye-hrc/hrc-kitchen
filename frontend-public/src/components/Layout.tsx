import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { Avatar, AvatarFallback } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Menu, X, LogOut, User, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect for glassmorphism header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  const getUserInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      {/* Modern Glass Header */}
      <header
        className={cn(
          "sticky top-0 z-40 w-full border-b transition-all duration-300",
          scrolled
            ? "bg-background/80 backdrop-blur-lg shadow-sm"
            : "bg-background/50 backdrop-blur-sm"
        )}
      >
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-3 transition-opacity hover:opacity-90"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg text-xl">
                🍽️
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold leading-none tracking-tight">
                  HRC Kitchen
                </h1>
                <p className="text-xs text-muted-foreground">
                  Huon Regional Care
                </p>
              </div>
              <div className="sm:hidden">
                <h1 className="text-base font-bold">HRC Kitchen</h1>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-2">
              {isAuthenticated ? (
                <>
                  <Button
                    variant="ghost"
                    asChild
                    className="gap-2"
                  >
                    <Link to="/menu">
                      <UtensilsCrossed className="h-4 w-4" />
                      Menu
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    asChild
                    className="gap-2"
                  >
                    <Link to="/orders">
                      <ShoppingBag className="h-4 w-4" />
                      Orders
                    </Link>
                  </Button>

                  {/* User Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="gap-2 pl-2"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                            {getUserInitials(user?.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="max-w-[150px] truncate">
                          {user?.fullName}
                        </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {user?.fullName}
                          </p>
                          <p className="text-xs leading-none text-muted-foreground">
                            {user?.email}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/orders" className="cursor-pointer">
                          <ShoppingBag className="mr-2 h-4 w-4" />
                          My Orders
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleLogout}
                        className="cursor-pointer text-destructive focus:text-destructive"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Button variant="ghost" asChild>
                    <Link to="/login">Login</Link>
                  </Button>
                  <Button asChild>
                    <Link to="/register">Register</Link>
                  </Button>
                </>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Sheet Menu */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="right" className="w-[280px] sm:w-[350px]">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <div className="mt-6 flex flex-col gap-4">
            {isAuthenticated ? (
              <>
                {/* User Info */}
                <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/50">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {getUserInitials(user?.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user?.fullName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user?.email}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">
                      {user?.role?.toLowerCase()}
                    </p>
                  </div>
                </div>

                {/* Navigation Links */}
                <div className="flex flex-col gap-2">
                  <Button
                    variant="ghost"
                    asChild
                    className="justify-start gap-2"
                    onClick={handleNavClick}
                  >
                    <Link to="/menu">
                      <UtensilsCrossed className="h-4 w-4" />
                      Menu
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    asChild
                    className="justify-start gap-2"
                    onClick={handleNavClick}
                  >
                    <Link to="/orders">
                      <ShoppingBag className="h-4 w-4" />
                      My Orders
                    </Link>
                  </Button>
                </div>

                {/* Logout */}
                <div className="mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  asChild
                  className="justify-start"
                  onClick={handleNavClick}
                >
                  <Link to="/login">Login</Link>
                </Button>
                <Button
                  asChild
                  className="justify-start"
                  onClick={handleNavClick}
                >
                  <Link to="/register">Register</Link>
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Modern Footer */}
      <footer className="border-t bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col items-center text-center">
            {/* Logo */}
            <div className="mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg text-2xl mx-auto mb-3">
                🍽️
              </div>
              <h3 className="text-lg font-bold">HRC Kitchen</h3>
              <p className="text-sm text-muted-foreground font-medium">
                Fresh, Delicious Meals for Huon Regional Care
              </p>
            </div>

            {/* Copyright */}
            <div className="mt-6 pt-6 border-t w-full max-w-md">
              <p className="text-xs text-muted-foreground">
                © 2025 HRC Kitchen - Huon Regional Care. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
