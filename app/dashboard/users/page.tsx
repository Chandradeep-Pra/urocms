//@ts-ignore
import { getGuestUsers } from "@/lib/server/guestService";
import UsersClient from "./UserClient";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const guests = await getGuestUsers();

  return <UsersClient guests={guests} />;
}