"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { DataTable } from "./DataTable";

interface Request {
  id: string;
  name: string;
  email: string;
  type: string;
  createdAt: string;
}

interface Props {
  data: Request[];
  onApprove: (id: string) => void;
}

export function RequestTable({ data, onApprove }: Props) {
  console.log("Rendering RequestTable with data:", data);
  return (
    <DataTable
      data={data}
      columns={[
        {
          header: "Name",
          accessor: (r) => <span className="font-medium">{r.name}</span>,
        },
        {
          header: "Email",
          accessor: (r) => (
            <span className="text-slate-500">{r.email}</span>
          ),
        },
        {
          header: "Status",
          accessor: (r) => (
            <Badge className="bg-amber-100 text-amber-700">
              {r.type}
            </Badge>
          ),
        },
        {
          header: "Date",
          accessor: (r) => (
            <span className="text-slate-500">{r.createdAt}</span>
          ),
        },
        {
          header: "",
          accessor: (r) => (
            <Button
              size="sm"
              className="bg-teal-600 hover:bg-teal-700 text-white"
              onClick={() => onApprove(r.id)}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Approve
            </Button>
          ),
        },
      ]}
    />
  );
}
