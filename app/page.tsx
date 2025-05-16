import { Card } from "@/components/ui/card";
import { LoginForm } from "../components/login-form";

export default function LoginPage() {
  return (

          <div className="w-full h-screen flex justify-center items-center align-middle">
            <Card className="w-full max-w-sm px-4">

            <LoginForm />
            </Card>
          </div>
  );
}
