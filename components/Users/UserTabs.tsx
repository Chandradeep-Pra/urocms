"use client";

import { useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequestTable } from "./RequestTable";
import { UserTable } from "./UserTable";

interface User {
  id: string;
  name: string;
  email: string;
  tier: "paid" | "guest" | "free";
  createdAt: string;
}

interface Request {
  id: string;
  name: string;
  email: string;
  type: string;
  createdAt: string;
}

interface Props {
  users: User[];
  requests: Request[];
  search: string;
  onApprove: (id: string) => void;
  onDelete: (id: string) => void;
  onSetTier: (id: string, tier: User["tier"]) => void;
}

function matchesSearch(user: User, search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return true;

  return (user.name ?? "").toLowerCase().includes(query) || (user.email ?? "").toLowerCase().includes(query);
}

export default function UserTabs({
  users,
  requests,
  search,
  onApprove,
  onDelete,
  onSetTier,
}: Props) {
  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();

    return requests.filter((request) => {
      const name = (request.name ?? "").toLowerCase();
      const email = (request.email ?? "").toLowerCase();
      return !query || name.includes(query) || email.includes(query);
    });
  }, [requests, search]);

  const guestUsers = useMemo(
    () => users.filter((user) => user.tier === "guest" && matchesSearch(user, search)),
    [users, search]
  );

  const freeUsers = useMemo(
    () => users.filter((user) => user.tier === "free" && matchesSearch(user, search)),
    [users, search]
  );

  const paidUsers = useMemo(
    () => users.filter((user) => user.tier === "paid" && matchesSearch(user, search)),
    [users, search]
  );

  return (
    <Tabs defaultValue="guest" className="w-full space-y-6">
      <TabsList className="grid w-full max-w-3xl grid-cols-4">
        <TabsTrigger value="guest">Guest ({guestUsers.length})</TabsTrigger>
        <TabsTrigger value="free">Free ({freeUsers.length})</TabsTrigger>
        <TabsTrigger value="paid">Paid ({paidUsers.length})</TabsTrigger>
        <TabsTrigger value="requests">Requests ({filteredRequests.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="guest">
        <UserTable data={guestUsers} onDelete={onDelete} onSetTier={onSetTier} />
      </TabsContent>

      <TabsContent value="free">
        <UserTable data={freeUsers} onDelete={onDelete} onSetTier={onSetTier} />
      </TabsContent>

      <TabsContent value="paid">
        <UserTable data={paidUsers} onDelete={onDelete} onSetTier={onSetTier} />
      </TabsContent>

      <TabsContent value="requests">
        <RequestTable data={filteredRequests} onApprove={onApprove} />
      </TabsContent>
    </Tabs>
  );
}
