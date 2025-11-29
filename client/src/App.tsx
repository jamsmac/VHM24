import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import '@/i18n/config';
import { Route, Switch } from "wouter";
import { useTranslation } from 'react-i18next';
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import MainLayout from "./components/MainLayout";

// Existing pages
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

// New pages
import Equipment from "./pages/Equipment";
import Locations from "./pages/Locations";
import QRScanner from "./pages/QRScanner";
import Products from "./pages/Products";
import Recipes from "./pages/Recipes";
import Purchases from "./pages/Purchases";
import Transactions from "./pages/Transactions";
import Counterparties from "./pages/Counterparties";
import Contracts from "./pages/Contracts";
import Commissions from "./pages/Commissions";
import Analytics from "./pages/Analytics";
import Incidents from "./pages/Incidents";
import Complaints from "./pages/Complaints";
import Settings from "./pages/Settings";
import AuditLogs from "./pages/AuditLogs";
import Webhooks from "./pages/Webhooks";
import APIKeys from "./pages/APIKeys";
import InventoryWarehouse from "./pages/InventoryWarehouse";
import InventoryOperators from "./pages/InventoryOperators";
import InventoryMachines from "./pages/InventoryMachines";

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
              {/* Dashboard */}
              <Route path={"/"} component={Dashboard} />
              <Route path={"/dashboard"} component={Dashboard} />

              {/* Operations - Machines */}
              <Route path={"/dashboard/machines"} component={Machines} />
              <Route path={"/dashboard/machines/:id"} component={MachineDetail} />
              <Route path={"/machines"} component={Machines} />
              <Route path={"/machines/:id"} component={MachineDetail} />

              {/* Operations - Tasks */}
              <Route path={"/dashboard/tasks"} component={Tasks} />
              <Route path={"/tasks"} component={Tasks} />

              {/* Operations - Equipment */}
              <Route path={"/dashboard/equipment"} component={Equipment} />

              {/* Operations - Locations */}
              <Route path={"/dashboard/locations"} component={Locations} />

              {/* Operations - QR Scanner */}
              <Route path={"/dashboard/scan"} component={QRScanner} />

              {/* Inventory & Accounting */}
              <Route path={"/dashboard/inventory"} component={Inventory} />
              <Route path={"/dashboard/inventory/warehouse"} component={InventoryWarehouse} />
              <Route path={"/dashboard/inventory/operators"} component={InventoryOperators} />
              <Route path={"/dashboard/inventory/machines"} component={InventoryMachines} />
              <Route path={"/dashboard/inventory/transfer"} component={AdminTransfers} />
              <Route path={"/dashboard/inventory/transfer-history"} component={TransferHistory} />
              <Route path={"/inventory"} component={Inventory} />
              <Route path={"/inventory/transfer-history"} component={TransferHistory} />

              {/* Products */}
              <Route path={"/dashboard/products"} component={Products} />

              {/* Recipes */}
              <Route path={"/dashboard/recipes"} component={Recipes} />

              {/* Purchases */}
              <Route path={"/dashboard/purchases"} component={Purchases} />

              {/* Finance */}
              <Route path={"/dashboard/transactions"} component={Transactions} />
              <Route path={"/dashboard/counterparties"} component={Counterparties} />
              <Route path={"/dashboard/contracts"} component={Contracts} />
              <Route path={"/dashboard/commissions"} component={Commissions} />

              {/* Analytics */}
              <Route path={"/dashboard/analytics"} component={Analytics} />
              <Route path={"/dashboard/reports"} component={Reports} />
              <Route path={"/dashboard/incidents"} component={Incidents} />
              <Route path={"/reports"} component={Reports} />

              {/* Team */}
              <Route path={"/dashboard/users"} component={Users} />
              <Route path={"/dashboard/access-requests"} component={AccessRequests} />
              <Route path={"/dashboard/complaints"} component={Complaints} />
              <Route path={"/users"} component={Users} />
              <Route path={"/access-requests"} component={AccessRequests} />

              {/* System */}
              <Route path={"/dashboard/settings"} component={Settings} />
              <Route path={"/dashboard/ai-agents"} component={AdminAiAgents} />
              <Route path={"/dashboard/audit-logs"} component={AuditLogs} />
              <Route path={"/dashboard/webhooks"} component={Webhooks} />
              <Route path={"/dashboard/api-keys"} component={APIKeys} />
              <Route path={"/admin/ai-agents"} component={AdminAiAgents} />

              {/* Legacy routes */}
              <Route path={"/digest-settings"} component={DigestSettings} />
              <Route path={"/notification-preferences"} component={NotificationPreferences} />
              <Route path={"/admin/transfers"} component={AdminTransfers} />
              <Route path={"/master-data"} component={MasterData} />
              <Route path={"/components/:id"} component={ComponentLifecycle} />

              {/* 404 */}
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
