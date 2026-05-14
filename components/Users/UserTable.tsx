"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Crown, MoreHorizontal, Trash2, UserCheck, UserRoundPlus } from "lucide-react";
import { ConfirmDialog } from "@/components/dashboard/shared/ConfirmDialog";
import type { AdminUser } from "@/lib/server/guestService";
import { AssignedCoursesCell } from "./AssignedCoursesCell";
import { DataTable } from "./DataTable";

interface Props {
  data: AdminUser[];
  onSetTier: (id: string, tier: AdminUser["tier"]) => void;
  onDelete: (id: string) => void;
  showAssignedCourses?: boolean;
}

function getBadgeClass(tier: AdminUser["tier"]) {
  if (tier === "paid") return "bg-teal-600 text-white";
  if (tier === "free") return "bg-amber-100 text-amber-800";
  return "bg-slate-200 text-slate-700";
}

function getTierAction(user: AdminUser) {
  if (user.tier === "guest") {
    return {
      label: "Move to Free",
      nextTier: "free" as const,
      icon: UserRoundPlus,
    };
  }

  if (user.tier === "free") {
    return {
      label: "Move to Paid",
      nextTier: "paid" as const,
      icon: Crown,
    };
  }

  return {
    label: "Move to Free",
    nextTier: "free" as const,
    icon: UserCheck,
  };
}

export function UserTable({
  data,
  onSetTier,
  onDelete,
  showAssignedCourses = false,
}: Props) {
  return (
    <DataTable
      data={data}
      columns={[
        {
          header: "Name",
          accessor: (user) => (
            <span className="font-medium">{user.name?.trim() ? user.name : "No Name"}</span>
          ),
        },
        {
          header: "Email",
          accessor: (user) => <span className="text-slate-500">{user.email}</span>,
        },
        {
          header: "Status",
          accessor: (user) => <Badge className={getBadgeClass(user.tier)}>{user.tier}</Badge>,
        },
        {
          header: "Date",
          accessor: (user) => <span className="text-slate-500">{user.createdAt}</span>,
        },
        ...(showAssignedCourses
          ? [
              {
                header: "Course Assigned",
                accessor: (user: AdminUser) => (
                  <AssignedCoursesCell courses={user.assignedCourses} />
                ),
              },
            ]
          : []),
        {
          header: "",
          accessor: (user) => {
            const action = getTierAction(user);
            const ActionIcon = action.icon;

            return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onSetTier(user.id, action.nextTier)}>
                    <ActionIcon className="mr-2 h-4 w-4" />
                    {action.label}
                  </DropdownMenuItem>
                  <ConfirmDialog
                    title="Delete user?"
                    description="This will remove the user record and linked auth user."
                    confirmLabel="Delete User"
                    destructive
                    onConfirm={() => onDelete(user.id)}
                    trigger={
                      <DropdownMenuItem
                        className="text-destructive"
                        onSelect={(event) => event.preventDefault()}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    }
                  />
                </DropdownMenuContent>
              </DropdownMenu>
            );
          },
        },
      ]}
    />
  );
}
