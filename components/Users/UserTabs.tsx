"use client";

import { useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AdminUser } from "@/lib/server/guestService";
import { UserTable } from "./UserTable";

interface Props {
  users: AdminUser[];
  search: string;
  onDelete: (id: string) => void;
  onSetTier: (id: string, tier: AdminUser["tier"]) => void;
}

function matchesSearch(user: AdminUser, search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return true;

  const assignedCourses = Array.isArray(user.assignedCourses)
    ? user.assignedCourses.join(" ").toLowerCase()
    : "";

  return (
    (user.name ?? "").toLowerCase().includes(query) ||
    (user.email ?? "").toLowerCase().includes(query) ||
    assignedCourses.includes(query)
  );
}

export default function UserTabs({ users, search, onDelete, onSetTier }: Props) {
  const freeUsers = useMemo(
    () => users.filter((user) => user.tier === "free" && matchesSearch(user, search)),
    [users, search]
  );

  const paidUsers = useMemo(
    () => users.filter((user) => user.tier === "paid" && matchesSearch(user, search)),
    [users, search]
  );

  return (
    <Tabs defaultValue="free" className="w-full space-y-6">
      <TabsList className="grid w-full max-w-xl grid-cols-2">
        <TabsTrigger value="free">Free ({freeUsers.length})</TabsTrigger>
        <TabsTrigger value="paid">Paid ({paidUsers.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="free">
        <UserTable data={freeUsers} onDelete={onDelete} onSetTier={onSetTier} />
      </TabsContent>

      <TabsContent value="paid">
        <UserTable data={paidUsers} onDelete={onDelete} onSetTier={onSetTier} showAssignedCourses />
      </TabsContent>
    </Tabs>
  );
}
