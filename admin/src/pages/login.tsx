import { useState, type FormEvent } from "react";

import { Button, Card, ErrorBar, Field, Input } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const { notStaff, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "Email hoặc mật khẩu không đúng."
          : error.message
      );
    }
    setBusy(false);
  };

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="font-display text-[30px] tracking-[0.2em]">MIYAKO</div>
          <div className="mt-1 text-[11px] uppercase tracking-[0.25em] text-muted">
            Trang quản trị
          </div>
        </div>

        {notStaff ? (
          <Card className="p-5 text-center">
            <p className="text-[14px] leading-relaxed text-muted">
              Tài khoản này đăng nhập được nhưng chưa được cấp quyền vào CMS.
              Nhờ quản lý thêm tài khoản trong mục Cấu hình › Nhân sự.
            </p>
            <Button variant="secondary" className="mt-4" full onClick={signOut}>
              Đăng xuất
            </Button>
          </Card>
        ) : (
          <Card className="p-5">
            <form onSubmit={submit} className="space-y-4">
              <ErrorBar error={error} />
              <Field label="Email" required>
                <Input
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ten@miyako.vn"
                  required
                />
              </Field>
              <Field label="Mật khẩu" required>
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Field>
              <Button type="submit" full size="lg" loading={busy}>
                Đăng nhập
              </Button>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
