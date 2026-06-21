import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, useTheme } from "next-themes";
import { StoreProvider } from "@/contexts/StoreContext";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdminProvider } from "@/contexts/AdminContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { CartDrawer } from "@/components/store/CartDrawer";
import { useNotificationTapHandler } from "@/hooks/useNotificationTapHandler";
import { useNativeThemeSync } from "@/hooks/useNativeThemeSync";
import { usePushRegistration } from "@/hooks/usePushRegistration";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import { AdminLayout } from "@/components/admin/AdminLayout";

const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const StoreLocation = lazy(() => import("./pages/StoreLocation"));
const Ofertas = lazy(() => import("./pages/Ofertas"));
const MyOrders = lazy(() => import("./pages/MyOrders"));
const Profile = lazy(() => import("./pages/Profile"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));

const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const Products = lazy(() => import("./pages/admin/Products"));
const Categories = lazy(() => import("./pages/admin/Categories"));
const Combos = lazy(() => import("./pages/admin/Combos"));
const Orders = lazy(() => import("./pages/admin/Orders"));
const Freight = lazy(() => import("./pages/admin/Freight"));
const Discounts = lazy(() => import("./pages/admin/Discounts"));
const Flyers = lazy(() => import("./pages/admin/Flyers"));
const Settings = lazy(() => import("./pages/admin/Settings"));

const ThemeColorUpdater = () => {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        resolvedTheme === 'dark' ? '#1a222e' : '#ffffff'
      );
    }
  }, [resolvedTheme]);

  useNativeThemeSync();
  return null;
};

const RouterBootstrap = () => {
  useNotificationTapHandler();
  usePushRegistration();
  return null;
};

const PageLoader = () => (
  <div className="flex h-screen items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="arraia-theme">
    <ThemeColorUpdater />
    <TooltipProvider>
      <AuthProvider>
        <StoreProvider>
          <CartProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <RouterBootstrap />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/verify-email" element={<VerifyEmail />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/localizacao" element={<StoreLocation />} />
                  <Route path="/ofertas" element={<Ofertas />} />
                  <Route path="/meus-pedidos" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
                  <Route path="/perfil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  <Route path="/termos" element={<TermsOfService />} />
                  <Route path="/privacidade" element={<PrivacyPolicy />} />
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute requireAdmin>
                        <AdminProvider>
                          <AdminLayout />
                        </AdminProvider>
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<Dashboard />} />
                    <Route path="produtos" element={<Products />} />
                    <Route path="categorias" element={<Categories />} />
                    <Route path="combos" element={<Combos />} />
                    <Route path="pedidos" element={<Orders />} />
                    <Route path="estoque" element={<Navigate to="/admin/produtos" replace />} />
                    <Route path="frete" element={<Freight />} />
                    <Route path="descontos" element={<Discounts />} />
                    <Route path="jornais" element={<Flyers />} />
                    <Route path="configuracoes" element={<Settings />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              <CartDrawer />
            </BrowserRouter>
          </CartProvider>
        </StoreProvider>
      </AuthProvider>
    </TooltipProvider>
  </ThemeProvider>
);

export default App;
