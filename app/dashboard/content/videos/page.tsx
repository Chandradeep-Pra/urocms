"use client"

import { useState } from "react";
import { Plus, Play, Edit, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const chapters = [
  { id: "1", title: "Anatomy of Urinary System" },
  { id: "2", title: "BPH & Prostate" },
  { id: "3", title: "Urolithiasis" },
];

interface VideoItem {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  chapterId: string;
}

const mockVideos: VideoItem[] = [
  { id: "1", title: "Renal Anatomy Overview", description: "Complete walkthrough of renal anatomy with 3D models.", videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", chapterId: "1" },
  { id: "2", title: "BPH Surgery Techniques", description: "TURP and laser prostatectomy demonstration.", videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", chapterId: "2" },
  { id: "3", title: "ESWL Procedure", description: "Extracorporeal shock wave lithotripsy explained.", videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", chapterId: "3" },
];

const getYoutubeId = (url: string) => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?]+)/);
  return match ? match[1] : null;
};

const VideosPage = () => {
  const [videos, setVideos] = useState(mockVideos);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", videoUrl: "", chapterId: "" });

  const handleSave = () => {
    if (!form.title || !form.videoUrl) { toast.error("Fill required fields"); return; }
    setVideos((prev) => [...prev, { id: Date.now().toString(), ...form }]);
    setDialogOpen(false);
    setForm({ title: "", description: "", videoUrl: "", chapterId: "" });
    toast.success("Video added");
  };

  const handleDelete = () => {
    if (deleteId) {
      setVideos((prev) => prev.filter((v) => v.id !== deleteId));
      setDeleteId(null);
      toast.success("Video deleted");
    }
  };

  const getChapterName = (id: string) => chapters.find((c) => c.id === id)?.title || "Unassigned";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">{videos.length} videos</p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" /> Add Video
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl rounded-2xl border border-slate-200 bg-white p-0 overflow-hidden">

  {/* HEADER */}
  <div className="px-6 py-5 border-b border-slate-100 bg-slate-50">
    <DialogHeader>
      <DialogTitle className="text-lg font-semibold text-slate-800">
        Add Educational Video
      </DialogTitle>
      <p className="text-sm text-slate-500 mt-1">
        Attach a YouTube or Google Drive video for learners.
      </p>
    </DialogHeader>
  </div>

  {/* BODY */}
  <div className="px-6 py-6 space-y-6">

    {/* Title */}
    <div className="space-y-2">
      <Label className="text-sm font-medium text-slate-700">
        Video Title
      </Label>
      <Input
        value={form.title}
        onChange={(e) =>
          setForm({ ...form, title: e.target.value })
        }
        placeholder="e.g. Cystoscopy Technique Overview"
        className="border-slate-200 focus:border-teal-500 focus:ring-teal-500"
      />
    </div>

    {/* Description */}
    <div className="space-y-2">
      <Label className="text-sm font-medium text-slate-700">
        Description
      </Label>
      <Textarea
        value={form.description}
        onChange={(e) =>
          setForm({ ...form, description: e.target.value })
        }
        placeholder="Brief overview of what this video covers..."
        rows={3}
        className="border-slate-200 focus:border-teal-500 focus:ring-teal-500 resize-none"
      />
    </div>

    {/* URL Section */}
    <div className="space-y-2">
      <Label className="text-sm font-medium text-slate-700">
        Video URL
      </Label>
      <div className="flex items-center rounded-xl border border-slate-200 focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500 px-3 bg-white">
        <span className="text-slate-400 text-sm mr-2">🔗</span>
        <Input
          value={form.videoUrl}
          onChange={(e) =>
            setForm({ ...form, videoUrl: e.target.value })
          }
          placeholder="https://youtube.com/watch?v=..."
          className="border-0 focus-visible:ring-0 bg-transparent"
        />
      </div>
      <p className="text-xs text-slate-500">
        Supported: YouTube or public Google Drive links
      </p>
    </div>

    {/* Chapter Select */}
    <div className="space-y-2">
      <Label className="text-sm font-medium text-slate-700">
        Attach to Chapter (Optional)
      </Label>
      <Select
        value={form.chapterId}
        onValueChange={(v) =>
          setForm({ ...form, chapterId: v })
        }
      >
        <SelectTrigger className="border-slate-200 focus:border-teal-500 focus:ring-teal-500">
          <SelectValue placeholder="Select chapter" />
        </SelectTrigger>
        <SelectContent>
          {chapters.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  </div>

  {/* FOOTER */}
  <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
    <Button
      variant="ghost"
      onClick={() => setDialogOpen(false)}
      className="text-slate-600 hover:text-slate-800"
    >
      Cancel
    </Button>

    <Button
      onClick={handleSave}
      className="bg-teal-600 hover:bg-teal-700 text-white px-6 shadow-sm"
    >
      Save Video
    </Button>
  </div>

</DialogContent>

        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((v) => {
          const ytId = getYoutubeId(v.videoUrl);
          return (
            <Card key={v.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              {/* Thumbnail */}
              <div
                className="relative aspect-video bg-muted cursor-pointer group"
                onClick={() => setPreviewUrl(v.videoUrl)}
              >
                {ytId ? (
                  <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt={v.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center"><Play className="h-10 w-10 text-muted-foreground" /></div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-foreground/0 group-hover:bg-foreground/20 transition-colors">
                  <Play className="h-10 w-10 text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground">{v.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{v.description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">{getChapterName(v.chapterId)}</Badge>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7"><Edit className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(v.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Preview */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          {previewUrl && getYoutubeId(previewUrl) && (
            <div className="aspect-video">
              <iframe
                src={`https://www.youtube.com/embed/${getYoutubeId(previewUrl)}`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Video</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default VideosPage;
