import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function ResetPassword() {
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const email = (location.state as any)?.email || "";
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState<"code" | "password">("code");
  const [submitting, setSubmitting] = useState(false);

  if (!email) return <Navigate to="/forgot-password" replace />;

  const handleVerifyCode = async () => {
    if (code.length !== 6) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "recovery",
      });
      if (error) throw error;
      setStep("password");
      toast({ title: "Código verificado!", description: "Defina sua nova senha." });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Senha atualizada!", description: "Você já pode fazer login." });
      navigate("/login");
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="text-4xl mb-2">🔒</div>
          <CardTitle className="text-xl">
            {step === "code" ? "Verificar código" : "Nova senha"}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {step === "code"
              ? `Digite o código enviado para ${email}`
              : "Defina sua nova senha"}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === "code" ? (
            <>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={code} onChange={setCode}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button
                className="w-full"
                size="lg"
                disabled={code.length !== 6 || submitting}
                onClick={handleVerifyCode}
              >
                {submitting ? "Verificando..." : "Verificar código"}
              </Button>
            </>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="newPassword">Nova senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting ? "Salvando..." : "Salvar nova senha"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
