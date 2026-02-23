interface Props {
  sections: any[];
  activeSection: string;
  setActiveSection: (id: string) => void;
}

export default function SectionSidebar({
  sections,
  activeSection,
  setActiveSection,
}: Props) {
  return (
    <div className="w-64 p-4 space-y-2">
      <button
        onClick={() => setActiveSection("all")}
        className={`w-full text-left px-4 py-2 rounded-lg ${
          activeSection === "all"
            ? "bg-black text-white"
            : "hover:bg-zinc-100"
        }`}
      >
        All Videos
      </button>

      {sections.map((s) => (
        <button
          key={s.id}
          onClick={() => setActiveSection(s.id)}
          className={`w-full text-left px-4 py-2 rounded-lg ${
            activeSection === s.id
              ? "bg-black text-white"
              : "hover:bg-zinc-100"
          }`}
        >
          {s.title}
        </button>
      ))}
    </div>
  );
}