"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import UserTabs from "@/components/Users/UserTabs";

interface Guest {
  id: string;
  name: string;
  email: string;
  tier: "free";
  createdAt: string;
}

export default function UsersClient({ guests }: { guests: Guest[] }) {
  const [search, setSearch] = useState("");

  return (
    <div className="space-y-6">

      {/* SEARCH */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <UserTabs
        users={guests}
        requests={[]}
        search={search}
        onApprove={() => {}}
        onDelete={() => {}}
        onToggleTier={() => {}}
      />
    </div>
  );
}
