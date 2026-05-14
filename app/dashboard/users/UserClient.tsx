"use client";

import { useState } from "react";
import { toast } from "sonner";
import UserTabs from "@/components/Users/UserTabs";
import { UserSearchBar } from "@/components/Users/UserSearchBar";
import { adminFetch } from "@/lib/client/adminApi";
import type { AdminUser, UserTier } from "@/lib/server/guestService";

export default function UsersClient({ users }: { users: AdminUser[] }) {
  const [search, setSearch] = useState("");
  const [userList, setUserList] = useState(users);

  const handleSetTier = async (id: string, tier: UserTier) => {
    try {
      const res = await adminFetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tier }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to update user tier");
      }

      setUserList((current) =>
        current.map((user) => (user.id === id ? { ...user, tier } : user))
      );
      toast.success(`User moved to ${tier}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to update user tier");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await adminFetch(`/api/users/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to delete user");
      }

      setUserList((current) => current.filter((user) => user.id !== id));
      toast.success("User deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete user");
    }
  };

  return (
    <div className="space-y-6">
      <UserSearchBar value={search} onChange={setSearch} />

      <UserTabs
        users={userList}
        search={search}
        onDelete={handleDelete}
        onSetTier={handleSetTier}
      />
    </div>
  );
}
