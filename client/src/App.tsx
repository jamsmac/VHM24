import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import '@/i18n/config';
import { Route, Switch } from "wouter";
import { useTranslation } from 'react-i18next';
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import MainLayout from "./components/MainLayout";
import Dashboard from "./pages/Dashboard";
import Machines from "./pages/Machines";
import MachineDetail from "./pages/MachineDetail";
import Tasks from "./pages/Tasks";
import Users from "./pages/Users";
import Inventory from "./pages/Inventory";
import Login from "./pages/Login";
import TelegramOnboarding from "./pages/TelegramOnboarding";
import MasterData from "./pages/MasterData";
import ComponentLifecycle from "./pages/ComponentLifecycle";
import Reports from "./pages/Reports";
import AccessRequests from "./pages/AccessRequests";
import DigestSettings from "./pages/DigestSettings";
import NotificationPreferences from "./pages/NotificationPreferences";
import AdminTransfers from "./pages/AdminTransfers";
import TransferHistory from "./pages/TransferHistory";
import { AdminAiAgents } from "./pages/AdminAiAgents";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/login"} component={Login} />
      <Route path={"/onboarding"} component={TelegramOnboarding} />
      <Route path={"/404"} component={NotFound} />
      {/* Protected routes with MainLayout */}
      <Route path="/:rest*">
        {() => (
          <MainLayout userRole="admin">
            <Switch>
              <Route path={"/"} component={Dashboard} />
              <Route path={"/machines"} component={Machines} />
              <Route path={"/machines/:id"} component={MachineDetail} />
              <Route path={"/inventory"} component={Inventory} />
              <Route path={"/tasks"} component={Tasks} />
              <Route path={"/users"} component={Users} />
              <Route path={"/access-requests"} component={AccessRequests} />
              <Route path={"/digest-settings"} component={DigestSettings} />
              <Route path={"/notification-preferences"} component={NotificationPreferences} />
              <Route path={"/admin/transfers"} component={AdminTransfers} />
              <Route path={"/inventory/transfer-history"} component={TransferHistory} />
              <Route path={"/admin/ai-agents"} component={AdminAiAgents} />
              <Route path={"/master-data"} component={MasterData} />
              <Route path={"/components/:id"} component={ComponentLifecycle} />
              <Route path={"/reports"} component={Reports} />
              <Route component={NotFound} />
            </Switch>
          </MainLayout>
        )}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
