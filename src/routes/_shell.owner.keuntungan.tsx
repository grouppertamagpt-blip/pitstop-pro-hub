import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_shell/owner/keuntungan")({
  beforeLoad: () => {
    throw redirect({ to: "/owner/dashboard", replace: true });
  },
  component: () => null,
});
