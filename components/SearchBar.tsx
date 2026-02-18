"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";

interface SearchBarProps<T> {
  data: T[];
  keys: (keyof T)[];
  onResults: (results: T[]) => void;
  placeholder?: string;
}

export default function SearchBar<T extends Record<string, any>>({
  data,
  keys,
  onResults,
  placeholder = "Search...",
}: SearchBarProps<T>) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!query) {
      onResults(data);
      return;
    }

    const lower = query.toLowerCase();

    const filtered = data.filter((item) =>
      keys.some((key) =>
        String(item[key]).toLowerCase().includes(lower)
      )
    );

    onResults(filtered);
  }, [query, data]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
      />
    </div>
  );
}
