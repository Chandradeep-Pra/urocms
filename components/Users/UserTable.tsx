"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Trash2, Eye } from "lucide-react";
import { DataTable } from "./DataTable";

interface User {
  id: string;
  name: string;
  email: string;
  tier: "paid" | "free";
  createdAt: string;
}

interface Props {
  data: User[];
  onToggleTier: (id: string) => void;
  onDelete: (id: string) => void;
}

export function UserTable({
  data,
  onToggleTier,
  onDelete,
}: Props) {
  return (
    <DataTable
      data={data}
      columns={[
        {
          header: "Name",
          accessor: (u) => (
            <span className="font-medium">{u.name}</span>
          ),
        },
        {
          header: "Email",
          accessor: (u) => (
            <span className="text-slate-500">{u.email}</span>
          ),
        },
        {
          header: "Status",
          accessor: (u) => (
            <Badge
              className={`cursor-pointer ${
                u.tier === "paid"
                  ? "bg-teal-600 text-white"
                  : "bg-slate-200 text-slate-700"
              }`}
              onClick={() => onToggleTier(u.id)}
            >
              {u.tier}
            </Badge>
          ),
        },
        {
          header: "Date",
          accessor: (u) => (
            <span className="text-slate-500">{u.createdAt}</span>
          ),
        },
        {
          header: "",
          accessor: (u) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete(u.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ),
        },
      ]}
    />
  );
}
