import { AuthLayout } from "../components/auth/AuthLayout";
import { AuthForm } from "../components/auth/AuthForm";

export function Register() {
  return (
    <AuthLayout>
      <AuthForm initialIsSignUp={true} />
    </AuthLayout>
  );
}
