"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import UserTabs from "@/components/Users/UserTabs";
import type { AdminUser, UserTier } from "@/lib/server/guestService";

export default function UsersClient({ users }: { users: AdminUser[] }) {
  const [search, setSearch] = useState("");
  const [userList, setUserList] = useState(users);

  const handleSetTier = async (id: string, tier: UserTier) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
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
      const res = await fetch(`/api/users/${id}`, {
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
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <UserTabs
        users={userList}
        requests={[]}
        search={search}
        onApprove={() => {}}
        onDelete={handleDelete}
        onSetTier={handleSetTier}
      />
    </div>
  );
}
