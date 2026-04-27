//@ts-ignore
import { getAllUsers } from "@/lib/server/guestService";
import UsersClient from "./UserClient";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const users = await getAllUsers();

  return <UsersClient users={users} />;
}
