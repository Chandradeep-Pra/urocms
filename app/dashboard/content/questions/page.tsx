"use client";

import QuestionBankManager, { QuestionBank } from "@/components/questions/QuestionBankManager";
import QuestionCreator from "@/components/questions/QuestionCreator";
import { useEffect, useState } from "react";
import { toast } from "sonner";




export default function QuestionsPage() {
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchBanks();
  }, []);

  async function fetchBanks() {
    try {
      const res = await fetch("/api/question-banks");
      const data = await res.json();
      setBanks(data.banks ?? []);
    } catch {
      toast.error("Failed to load banks");
    } finally {
      setLoading(false);
    }
  }
 

  return (
    <div className="space-y-12">
      <QuestionBankManager
        banks={banks}
        setBanks={setBanks}
        fetchBanks={fetchBanks}
      />

      <QuestionCreator
        banks={banks}
        setBanks={setBanks}
      />
    </div>
  );
}
