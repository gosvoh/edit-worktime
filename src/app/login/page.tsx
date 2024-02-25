import { login } from "@/lib/actions";
import { validateRequest } from "@/lib/auth";
import { Form } from "@/lib/form";
import { redirect } from "next/navigation";

export default async function Login() {
  const { user } = await validateRequest();
  if (user) return redirect("/");

  return (
    <>
      <h1>Sign in</h1>
      <Form action={login}>
        <div>
          <label htmlFor="username">Username</label>
          <input
            minLength={3}
            maxLength={31}
            required
            accept="/^[a-z0-9_-]+$/"
            name="username"
            id="username"
          />
        </div>
        <div>
          <label htmlFor="password">Username</label>
          <input
            minLength={6}
            maxLength={255}
            required
            type="password"
            name="password"
            id="password"
          />
        </div>
      </Form>
    </>
  );
}
