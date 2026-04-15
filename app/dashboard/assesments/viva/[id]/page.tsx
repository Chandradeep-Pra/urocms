"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function CaseDetailsPage() {
  const { id } = useParams();
  const router = useRouter();

  const [caseData, setCaseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  /* ================= FETCH ================= */
  const fetchCase = async () => {
    try {
      const res = await fetch(`/api/viva-cases/${id}`);
      const data = await res.json();
      setCaseData(data.case);
    } catch {
      toast.error("Failed to load case");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchCase();
  }, [id]);

  /* ================= UPDATE ================= */
  const handleUpdate = async () => {
  try {
    const res = await fetch(`/api/viva-cases/${id}`, {
      method: "PATCH", // ✅ FIXED
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(caseData),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error(data);
      throw new Error(data?.error || "Update failed");
    }

    toast.success("Case updated successfully");
  } catch (err: any) {
    console.error(err);
    toast.error(err.message || "Update failed");
  }
};

  if (loading) return <p className="text-center mt-10">Loading...</p>;
  if (!caseData) return <p>No data found</p>;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* HEADER */}
      <div className="sticky top-0 z-30  backdrop-blur-xl border-b border-slate-200">
  <div className="max-w-5xl mx-auto px-6 py-4 space-y-3">

    {/* TOP ROW */}
    <div className="flex items-center justify-between">

      {/* LEFT */}
      <div className="flex items-center gap-3">

        {/* BACK ICON ONLY */}
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-slate-100 transition"
        >
          <ArrowLeft className="h-4 w-4 text-slate-600" />
        </button>

        {/* TITLE (BIG + CLEAN) */}
        <input
          value={caseData.case.title}
          onChange={(e) =>
            setCaseData({
              ...caseData,
              case: { ...caseData.case, title: e.target.value },
            })
          }
          className="text-xl font-semibold bg-transparent outline-none border-none focus:ring-0 text-slate-900 placeholder:text-slate-400"
          placeholder="Untitled Case"
        />
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-2">

        {/* LEVEL BADGE */}
        <span className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-600">
          {caseData.case.level}
        </span>

        {/* SAVE */}
        <Button
          onClick={handleUpdate}
          className="bg-teal-600 hover:bg-teal-700 text-white px-5"
        >
          Save
        </Button>
      </div>
    </div>

    {/* SUB ROW (METADATA) */}
    <div className="flex items-center gap-4 text-xs text-slate-500 pl-11">

      <span>Viva Case</span>

      <span className="h-3 w-px bg-slate-300" />

      <span>Last edited just now</span>

      <span className="h-3 w-px bg-slate-300" />

      <span>ID: {id}</span>
    </div>

  </div>
</div>

      {/* CONTENT */}
      <div className="max-w-5xl mx-auto p-6 space-y-8">

        {/* CASE INFO */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
          <h3 className="font-semibold text-slate-700">Case Details</h3>

          <Input
            value={caseData.case.title}
            onChange={(e) =>
              setCaseData({
                ...caseData,
                case: { ...caseData.case, title: e.target.value },
              })
            }
            placeholder="Title"
          />

          <Textarea
            value={caseData.case.stem}
            onChange={(e) =>
              setCaseData({
                ...caseData,
                case: { ...caseData.case, stem: e.target.value },
              })
            }
            placeholder="Clinical Stem"
          />
        </div>

        {/* ALLOWED USERS */}
<div className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
  <h3 className="font-semibold text-slate-700">
    Allowed Users (Emails)
  </h3>

  {caseData.allowedUser?.map((email: string, i: number) => (
    <div key={i} className="flex gap-2">
      <Input
        value={email}
        onChange={(e) => {
          const updated = [...caseData.allowedUser];
          updated[i] = e.target.value.toLowerCase();

          setCaseData({
            ...caseData,
            allowedUser: updated,
          });
        }}
        placeholder="Enter email"
      />

      {/* REMOVE BUTTON */}
      <Button
        variant="outline"
        onClick={() => {
          const updated = caseData.allowedUser.filter(
            (_: string, index: number) => index !== i
          );

          setCaseData({
            ...caseData,
            allowedUser: updated,
          });
        }}
      >
        Remove
      </Button>
    </div>
  ))}

  {/* ADD NEW EMAIL */}
  <Button
    variant="secondary"
    onClick={() => {
      setCaseData({
        ...caseData,
        allowedUser: [...(caseData.allowedUser || []), ""],
      });
    }}
  >
    + Add Email
  </Button>
</div>

        {/* OBJECTIVES */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
          <h3 className="font-semibold text-slate-700">Objectives</h3>

          {caseData.case.objectives.map((obj: string, i: number) => (
            <Input
              key={i}
              value={obj}
              onChange={(e) => {
                const updated = [...caseData.case.objectives];
                updated[i] = e.target.value;

                setCaseData({
                  ...caseData,
                  case: { ...caseData.case, objectives: updated },
                });
              }}
            />
          ))}
        </div>

        {/* EXHIBITS */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-6">
          <h3 className="font-semibold text-slate-700">Exhibits</h3>

          {caseData.exhibits.map((ex: any, i: number) => (
            <div
              key={i}
              className="border rounded-xl p-4 bg-slate-50 space-y-4"
            >
              <Input
                value={ex.label}
                onChange={(e) => {
                  const updated = [...caseData.exhibits];
                  updated[i].label = e.target.value;
                  setCaseData({ ...caseData, exhibits: updated });
                }}
                placeholder="Label"
              />

              {/* IMAGE PREVIEW */}
              {ex.url && (
                <div className="relative">
                  <img
                    src={ex.url}
                    alt="Exhibit"
                    className="w-full max-h-72 object-cover rounded-lg border"
                  />
                </div>
              )}

              {/* URL INPUT */}
              <div className="flex gap-2">
                <Input
                  value={ex.url}
                  onChange={(e) => {
                    const updated = [...caseData.exhibits];
                    updated[i].url = e.target.value;
                    setCaseData({ ...caseData, exhibits: updated });
                  }}
                  placeholder="Image URL"
                />

                {/* OPEN LINK */}
                {ex.url && (
                  <a
                    href={ex.url}
                    target="_blank"
                    className="flex items-center justify-center px-3 border rounded-lg hover:bg-slate-100"
                  >
                    <ExternalLink size={16} />
                  </a>
                )}
              </div>

              <Textarea
                value={ex.description}
                onChange={(e) => {
                  const updated = [...caseData.exhibits];
                  updated[i].description = e.target.value;
                  setCaseData({ ...caseData, exhibits: updated });
                }}
                placeholder="Description"
              />
            </div>
          ))}
        </div>

        {/* MARKING CRITERIA */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
          <h3 className="font-semibold text-slate-700">
            Marking Criteria
          </h3>

          <div>
            <p className="text-sm text-slate-500 mb-2">Must Mention</p>
            {caseData.marking_criteria.must_mention.map(
              (item: string, i: number) => (
                <Input
                  key={i}
                  value={item}
                  onChange={(e) => {
                    const updated = [
                      ...caseData.marking_criteria.must_mention,
                    ];
                    updated[i] = e.target.value;

                    setCaseData({
                      ...caseData,
                      marking_criteria: {
                        ...caseData.marking_criteria,
                        must_mention: updated,
                      },
                    });
                  }}
                  className="mb-2"
                />
              )
            )}
          </div>

          <div>
            <p className="text-sm text-slate-500 mb-2">Critical Fail</p>
            {caseData.marking_criteria.critical_fail.map(
              (item: string, i: number) => (
                <Input
                  key={i}
                  value={item}
                  onChange={(e) => {
                    const updated = [
                      ...caseData.marking_criteria.critical_fail,
                    ];
                    updated[i] = e.target.value;

                    setCaseData({
                      ...caseData,
                      marking_criteria: {
                        ...caseData.marking_criteria,
                        critical_fail: updated,
                      },
                    });
                  }}
                  className="mb-2"
                />
              )
            )}
          </div>
        </div>

      </div>
    </div>
  );
}