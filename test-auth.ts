import { auth } from "./lib/auth";

async function run() {
  try {
    const res = await auth.api.signUpEmail({
      body: {
        email: "test@vmailx.com",
        password: "password123",
        name: "Test User",
      },
      asResponse: true
    });
    console.log("Success:", res);
  } catch(e) {
    console.error("Error:", e);
  }
}
run();
