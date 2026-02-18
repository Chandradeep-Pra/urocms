"use client";

import { useMemo } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { RequestTable } from "./RequestTable";
import { UserTable } from "./UserTable";



interface User {
  id: string;
  name: string;
  email: string;
  tier: "paid" | "free";
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
  onToggleTier: (id: string) => void;
}

export default function UserTabs({
  users,
  requests,
  search,
  onApprove,
  onDelete,
  onToggleTier,
}: Props) {
  /* -------- FILTER LOGIC -------- */

  const filteredRequests = useMemo(() => {
    return requests.filter(
      (r) =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.email.toLowerCase().includes(search.toLowerCase())
    );
  }, [requests, search]);

  const paidUsers = useMemo(() => {
    return users.filter(
      (u) =>
        u.tier === "paid" &&
        (u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase()))
    );
  }, [users, search]);

  const freeUsers = useMemo(() => {
    return users.filter(
      (u) =>
        u.tier === "free" &&
        (u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase()))
    );
  }, [users, search]);

  /* -------- UI -------- */

  return (
    <Tabs defaultValue="requests" className="w-full space-y-6">
      <TabsList className="grid w-full max-w-md grid-cols-3">
        <TabsTrigger value="requests">
          Requests ({filteredRequests.length})
        </TabsTrigger>

        <TabsTrigger value="paid">
          Paid Users ({paidUsers.length})
        </TabsTrigger>

        <TabsTrigger value="free">
          Free Users ({freeUsers.length})
        </TabsTrigger>
      </TabsList>

      {/* REQUESTS */}
      <TabsContent value="requests">
        <RequestTable
          data={filteredRequests}
          onApprove={onApprove}
        />
      </TabsContent>

      {/* PAID */}
      <TabsContent value="paid">
        <UserTable
          data={paidUsers}
          onDelete={onDelete}
          onToggleTier={onToggleTier}
        />
      </TabsContent>

      {/* FREE */}
      <TabsContent value="free">
        <UserTable
          data={freeUsers}
          onDelete={onDelete}
          onToggleTier={onToggleTier}
        />
      </TabsContent>
    </Tabs>
  );
}
