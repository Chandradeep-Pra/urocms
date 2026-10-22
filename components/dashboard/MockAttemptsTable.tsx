"use client";

import type { AdminMockAttemptRow } from "@/lib/server/mockAttemptTracking";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function formatTime(seconds: number) {
  const rounded = Math.floor(seconds);
  return `${Math.floor(rounded / 60)}m ${rounded % 60}s`;
}

export default function MockAttemptsTable({ rows }: { rows: AdminMockAttemptRow[] }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-zinc-200">
      <Table className="min-w-[760px]" aria-label="Student mock attempts">
        <TableHeader>
          <TableRow className="bg-zinc-50">
            <TableHead className="px-4">Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Marks</TableHead>
            <TableHead>Time spent</TableHead>
            <TableHead className="pr-4 text-right">Total attempts</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length ? rows.map(row => (
            <TableRow key={row.candidate.email || row.candidate.name}>
              <TableCell className="px-4 font-medium">{row.candidate.name}</TableCell>
              <TableCell>{row.candidate.email || "Not recorded"}</TableCell>
              <TableCell>{row.marks}</TableCell>
              <TableCell>
                {row.timeTakenSeconds === null ? "Not recorded" : (
                  <>
                    <span>{formatTime(row.timeTakenSeconds)}</span>
                    {row.timedAttempts < row.totalAttempts ? (
                      <span className="mt-1 block text-xs text-zinc-500">
                        {row.timedAttempts} of {row.totalAttempts} attempts timed
                      </span>
                    ) : null}
                  </>
                )}
              </TableCell>
              <TableCell className="pr-4 text-right tabular-nums">{row.totalAttempts}</TableCell>
            </TableRow>
          )) : (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-zinc-500">No attempts recorded yet.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
