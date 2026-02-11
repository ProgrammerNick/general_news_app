import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";
import { Menu, Home, ListMusic, Settings, Plus, LayoutDashboard, LogOut, Radio } from "lucide-react";
import { signOut } from "../../lib/auth-client";

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const location = useLocation();

    const navItems = [
        { label: "Overview", icon: Home, href: "/" },
        { label: "Channels", icon: Radio, href: "/channels" },
        { label: "History", icon: ListMusic, href: "/history" },
        { label: "Topics", icon: Settings, href: "/settings" },
    ];

    const handleSignOut = async () => {
        await signOut();
        window.location.href = "/auth";
    };

    const SidebarContent = () => (
        <div className="flex flex-col h-full py-6 px-4 bg-background border-r">
            <div className="mb-8 px-2 flex items-center gap-3">
                <div className="h-8 w-8 bg-foreground rounded-lg flex items-center justify-center text-background font-serif font-bold text-xl">
                    M
                </div>
                <h1 className="text-xl font-bold tracking-tight text-foreground font-serif">
                    Morning Brief
                </h1>
            </div>

            <nav className="space-y-1 flex-1">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        to={item.href}
                        className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                            location.pathname === item.href
                                ? "bg-secondary text-foreground"
                                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                        )}
                        onClick={() => setIsMobileOpen(false)}
                    >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                    </Link>
                ))}

                <div className="pt-6 mt-4 border-t">
                    <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        My Channels
                    </h3>
                    <Button variant="outline" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground">
                        <Plus className="w-4 h-4 mr-2" />
                        New Channel
                    </Button>
                </div>
            </nav>

            <div className="mt-auto pt-6 border-t">
                <Button variant="ghost" onClick={handleSignOut} className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                </Button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-background">
            {/* Mobile Nav */}
            <div className="lg:hidden flex items-center p-4 border-b bg-background sticky top-0 z-50">
                <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Menu className="w-6 h-6" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 w-72">
                        <SidebarContent />
                    </SheetContent>
                </Sheet>
                <span className="ml-4 font-bold text-lg font-serif">Morning Brief</span>
            </div>

            <div className="flex">
                {/* Desktop Sidebar */}
                <aside className="hidden lg:block w-72 fixed h-screen z-40 bg-background">
                    <SidebarContent />
                </aside>

                {/* Main Content */}
                <main className="flex-1 lg:ml-72 min-h-screen p-4 md:p-8 overflow-y-auto">
                    <div className="max-w-7xl mx-auto space-y-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
