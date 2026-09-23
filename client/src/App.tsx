import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import { Boxes, ClipboardList, History, Printer, Settings } from "lucide-react";
import ErrorBoundary from "./components/ErrorBoundary";
import { AppLayout } from "./components/AppLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Products from "./pages/Products";
import Stock from "./pages/Stock";
import Orders from "./pages/Orders";
import ReceiveCheck from "./pages/ReceiveCheck";
import NotFound from "./pages/NotFound";

function ComingSoon({ title, phase, icon: Icon }: { title: string; phase: string; icon: typeof Boxes }) {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          <Icon className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">หน้าจอนี้จะพัฒนาใน {phase}</p>
        </div>
      </div>
      <div className="surface-card p-6">
        <p className="font-medium">โครงสร้างหน้าพร้อมแล้ว</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          ฟีเจอร์นี้อยู่ในแผนงานระยะถัดไป ข้อมูลสินค้าและสต็อกใน PHASE 2 จะพร้อมให้ใช้งานจากเมนูสินค้าและสต็อกแล้ว
        </p>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <AppLayout>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/products" component={Products} />
              <Route path="/stock" component={Stock} />
              <Route path="/receive" component={ReceiveCheck} />
              <Route path="/issue" component={() => <ComingSoon title="จ่ายสินค้าออก" phase="Phase 6" icon={Boxes} />} />
              <Route path="/reorder" component={Orders} />
              <Route path="/history" component={() => <ComingSoon title="ประวัติรายการ" phase="Phase 9" icon={History} />} />
              <Route path="/printers" component={() => <ComingSoon title="เครื่องพิมพ์" phase="Phase 10" icon={Printer} />} />
              <Route path="/settings" component={() => <ComingSoon title="ตั้งค่า" phase="Phase 11" icon={Settings} />} />
              <Route path="/404" component={NotFound} />
              <Route component={NotFound} />
            </Switch>
          </AppLayout>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
