import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/classrooms")({
  component: ClassroomsLayout,
});

function ClassroomsLayout() {
  return <Outlet />;
}
