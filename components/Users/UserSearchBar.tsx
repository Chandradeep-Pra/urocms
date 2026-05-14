"use client";

import { SearchBar } from "@/components/dashboard/shared/SearchBar";

export function UserSearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <SearchBar
      value={value}
      onChange={onChange}
      placeholder="Search users..."
      className="max-w-sm"
    />
  );
}
