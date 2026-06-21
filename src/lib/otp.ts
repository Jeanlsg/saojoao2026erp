import { supabase } from "@/integrations/supabase/client";

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOtpEmail(
  email: string,
  type: "signup" | "recovery",
  name?: string
): Promise<string> {
  const code = generateOtp();

  const { data, error } = await supabase.functions.invoke("send-otp-email", {
    body: { email, code, type, name },
  });

  if (error) throw new Error(error.message || "Erro ao enviar email");
  if (data?.error) throw new Error(data.error);

  return code;
}
