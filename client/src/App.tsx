import { Switch, Route, Router, Redirect } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/lib/auth";
import { SideNav } from "@/components/cyber/side-nav";
import { TopBar } from "@/components/cyber/top-bar";
import type { NavItem } from "@/components/cyber/side-nav";
import { useLocation } from "wouter";

import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import DashboardPage from "@/pages/dashboard";
import StudentDashboardPage from "@/pages/student-dashboard";
import RequestListPage from "@/pages/requests/list";
import RequestDetailPage from "@/pages/requests/detail";
import CreateRequestPage from "@/pages/requests/create";
import CatalogsPage from "@/pages/catalogs";
import BusinessRulesPage from "@/pages/business-rules";
import UsersPage from "@/pages/users";
import ReportsPage from "@/pages/reports";
import SettingsPage from "@/pages/settings";
import NotFound from "@/pages/not-found";

/* ─── Pixelated nav icons ─── */
function DashIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="1" y="1" width="6" height="6" stroke="currentColor" strokeWidth="1" />
      <rect x="9" y="1" width="6" height="6" stroke="currentColor" strokeWidth="1" />
      <rect x="1" y="9" width="6" height="6" stroke="currentColor" strokeWidth="1" />
      <rect x="9" y="9" width="6" height="6" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
function ListIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="1" y="2" width="2" height="2" fill="currentColor" />
      <rect x="5" y="2" width="10" height="2" fill="currentColor" opacity="0.6" />
      <rect x="1" y="7" width="2" height="2" fill="currentColor" />
      <rect x="5" y="7" width="10" height="2" fill="currentColor" opacity="0.6" />
      <rect x="1" y="12" width="2" height="2" fill="currentColor" />
      <rect x="5" y="12" width="10" height="2" fill="currentColor" opacity="0.6" />
    </svg>
  );
}
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="7" y="2" width="2" height="12" fill="currentColor" opacity="0.7" />
      <rect x="2" y="7" width="12" height="2" fill="currentColor" opacity="0.7" />
    </svg>
  );
}
function CatalogIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="2" y="1" width="12" height="14" stroke="currentColor" strokeWidth="1" />
      <line x1="5" y1="4" x2="11" y2="4" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <line x1="5" y1="7" x2="11" y2="7" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <line x1="5" y1="10" x2="9" y2="10" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}
function UsersIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="5" y="2" width="6" height="4" stroke="currentColor" strokeWidth="1" />
      <rect x="3" y="9" width="10" height="5" stroke="currentColor" strokeWidth="1" />
      <line x1="8" y1="6" x2="8" y2="9" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
function ReportIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="1" y="12" width="3" height="3" fill="currentColor" opacity="0.4" />
      <rect x="5" y="8" width="3" height="7" fill="currentColor" opacity="0.5" />
      <rect x="9" y="5" width="3" height="10" fill="currentColor" opacity="0.6" />
      <rect x="13" y="2" width="2" height="13" fill="currentColor" opacity="0.7" />
    </svg>
  );
}
function GearIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="5" y="5" width="6" height="6" stroke="currentColor" strokeWidth="1" />
      <rect x="7" y="1" width="2" height="3" fill="currentColor" opacity="0.5" />
      <rect x="7" y="12" width="2" height="3" fill="currentColor" opacity="0.5" />
      <rect x="1" y="7" width="3" height="2" fill="currentColor" opacity="0.5" />
      <rect x="12" y="7" width="3" height="2" fill="currentColor" opacity="0.5" />
    </svg>
  );
}
function RulesIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="1" y="1" width="14" height="14" stroke="currentColor" strokeWidth="1" />
      <line x1="1" y1="5" x2="15" y2="5" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <line x1="1" y1="9" x2="15" y2="9" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <rect x="3" y="2" width="2" height="2" fill="currentColor" opacity="0.5" />
      <rect x="3" y="6" width="2" height="2" fill="currentColor" opacity="0.5" />
      <rect x="3" y="10" width="2" height="2" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

function DashboardRouter() {
  const { isStudent } = useAuth();
  return isStudent() ? <StudentDashboardPage /> : <DashboardPage />;
}

function buildNavItems(role?: string): NavItem[] {
  const items: NavItem[] = [
    { label: "Panel", href: "/dashboard", icon: DashIcon },
    { label: "Solicitudes", href: "/requests", icon: ListIcon },
    { label: "Nueva solicitud", href: "/requests/create", icon: PlusIcon },
  ];
  if (role === "ADMIN" || role === "STAFF") {
    items.push({ label: "Catálogos", href: "/catalogs", icon: CatalogIcon });
    items.push({ label: "Reportes", href: "/reports", icon: ReportIcon });
  }
  if (role === "ADMIN") {
    items.push({ label: "Reglas", href: "/business-rules", icon: RulesIcon });
    items.push({ label: "Usuarios", href: "/users", icon: UsersIcon });
  }
  items.push({ label: "Ajustes", href: "/settings", icon: GearIcon });
  return items;
}

const BREADCRUMB_MAP: Record<string, string> = {
  "/dashboard": "Panel",
  "/requests": "Solicitudes",
  "/requests/create": "Nueva solicitud",
  "/catalogs": "Catálogos",
  "/business-rules": "Reglas de negocio",
  "/users": "Usuarios",
  "/reports": "Reportes",
  "/settings": "Ajustes",
};

function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const navItems = buildNavItems(user?.role);

  const breadcrumbs = [];
  const pathLabel = BREADCRUMB_MAP[location];
  if (pathLabel) {
    breadcrumbs.push({ label: pathLabel });
  } else if (location.startsWith("/requests/")) {
    breadcrumbs.push({ label: "Solicitudes", href: "#/requests" });
    if (location === "/requests/create") {
      breadcrumbs.push({ label: "Nueva" });
    } else {
      breadcrumbs.push({ label: `Detalle` });
    }
  }

  return (
    <div className="flex min-h-screen bg-[#0A0A0A]">
      <SideNav items={navItems} onLogout={logout} />
      <div className="flex-1 flex flex-col min-h-screen ml-56">
        <TopBar
          breadcrumbs={breadcrumbs}
          userId={user?.identification}
          userRole={user?.role}
          userName={`${user?.firstName} ${user?.lastName}`}
        />
        <main className="flex-1 overflow-auto bg-[#0A0A0A]">{children}</main>
      </div>
    </div>
  );
}

function ProtectedShellRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Redirect to="/login" />;
  return (
    <Shell>
      <Component />
    </Shell>
  );
}

function RootRedirect() {
  const { isAuthenticated } = useAuth();
  return <Redirect to={isAuthenticated ? "/dashboard" : "/login"} />;
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={RootRedirect} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/dashboard">
        {() => <ProtectedShellRoute component={DashboardRouter} />}
      </Route>
      <Route path="/requests/create">
        {() => <ProtectedShellRoute component={CreateRequestPage} />}
      </Route>
      <Route path="/requests/:id">
        {() => <ProtectedShellRoute component={RequestDetailPage} />}
      </Route>
      <Route path="/requests">
        {() => <ProtectedShellRoute component={RequestListPage} />}
      </Route>
      <Route path="/catalogs">
        {() => <ProtectedShellRoute component={CatalogsPage} />}
      </Route>
      <Route path="/business-rules">
        {() => <ProtectedShellRoute component={BusinessRulesPage} />}
      </Route>
      <Route path="/users">
        {() => <ProtectedShellRoute component={UsersPage} />}
      </Route>
      <Route path="/reports">
        {() => <ProtectedShellRoute component={ReportsPage} />}
      </Route>
      <Route path="/settings">
        {() => <ProtectedShellRoute component={SettingsPage} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster />
        <Router hook={useHashLocation}>
          <AppRouter />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
