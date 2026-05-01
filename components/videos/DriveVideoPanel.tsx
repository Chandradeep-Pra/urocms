"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  Copy,
  ExternalLink,
  Folder,
  FolderOpen,
  Loader2,
  MailPlus,
  Trash2,
  RefreshCw,
  Video,
  CloudBackup,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DriveFolderItem {
  id: string;
  name: string;
  webViewLink: string;
  modifiedTime: string | null;
}

interface DriveVideoItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  previewUrl: string;
  thumbnailLink: string | null;
  iconLink: string | null;
  modifiedTime: string | null;
  size: string | null;
}

interface DriveFolderResponse {
  folderId: string;
  folderCount: number;
  count: number;
  folders: DriveFolderItem[];
  videos: DriveVideoItem[];
}

interface DrivePermissionItem {
  id: string;
  type: string;
  role: string;
  emailAddress: string | null;
  displayName: string | null;
  domain: string | null;
  allowFileDiscovery: boolean | null;
  deleted: boolean;
}

const SHARE_ROLES = ["reader", "commenter", "writer"] as const;

function formatBytes(size: string | null) {
  const value = Number(size ?? 0);
  if (!value || Number.isNaN(value)) return "Unknown size";
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default function DriveVideoPanel() {
  const [folderIdInput, setFolderIdInput] = useState("");
  const [rootFolders, setRootFolders] = useState<DriveFolderItem[]>([]);
  const [activeFolderId, setActiveFolderId] = useState("");
  const [folderHistory, setFolderHistory] = useState<DriveFolderItem[]>([]);
  const [childFolders, setChildFolders] = useState<DriveFolderItem[]>([]);
  const [videos, setVideos] = useState<DriveVideoItem[]>([]);
  const [permissions, setPermissions] = useState<DrivePermissionItem[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] =
    useState<(typeof SHARE_ROLES)[number]>("reader");
  const [permissionRoleDrafts, setPermissionRoleDrafts] = useState<
    Record<string, string>
  >({});
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [loadingContents, setLoadingContents] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [submittingInvite, setSubmittingInvite] = useState(false);
  const [mutatingPermissionId, setMutatingPermissionId] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);

  const loadAccessibleFolders = async () => {
    try {
      setLoadingFolders(true);
      const res = await fetch("/api/videos/drive-folders");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to fetch Drive folders");
      }

      const folders = data.folders || [];
      setRootFolders(folders);

      const preferredFolderId = data.configuredFolderId || folders?.[0]?.id || "";
      if (preferredFolderId) {
        setFolderIdInput((current) => current || preferredFolderId);
        setActiveFolderId((current) => current || preferredFolderId);
      }
    } catch (fetchError: any) {
      setError(fetchError.message || "Failed to fetch Drive folders");
    } finally {
      setLoadingFolders(false);
    }
  };

  const loadFolderContents = async (folderIdOverride?: string) => {
    try {
      setLoadingContents(true);
      setError(null);

      const queryFolderId = (folderIdOverride ?? folderIdInput).trim();
      const search = queryFolderId ? `?folderId=${encodeURIComponent(queryFolderId)}` : "";
      const res = await fetch(`/api/videos/drive-library${search}`);
      const data: DriveFolderResponse & { error?: string } = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to fetch Drive folder contents");
      }

      setChildFolders(data.folders || []);
      setVideos(data.videos || []);
      setActiveFolderId(data.folderId || queryFolderId);
      if (data.folderId) {
        setFolderIdInput(data.folderId);
      }
    } catch (fetchError: any) {
      setChildFolders([]);
      setVideos([]);
      setError(fetchError.message || "Failed to fetch Drive folder contents");
    } finally {
      setLoadingContents(false);
    }
  };

  const loadPermissions = async (itemId: string) => {
    try {
      setLoadingPermissions(true);
      setPermissionsError(null);

      const res = await fetch(
        `/api/videos/drive-permissions?itemId=${encodeURIComponent(itemId)}`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to fetch Drive permissions");
      }

      const nextPermissions = data.permissions || [];
      setPermissions(nextPermissions);
      setPermissionRoleDrafts(
        Object.fromEntries(
          nextPermissions.map((permission: DrivePermissionItem) => [
            permission.id,
            permission.role,
          ])
        )
      );
    } catch (fetchError: any) {
      setPermissions([]);
      setPermissionsError(fetchError.message || "Failed to fetch Drive permissions");
    } finally {
      setLoadingPermissions(false);
    }
  };

  useEffect(() => {
    loadAccessibleFolders();
  }, []);

  useEffect(() => {
    if (activeFolderId) {
      loadFolderContents(activeFolderId);
      loadPermissions(activeFolderId);
    }
  }, [activeFolderId]);

  const currentFolderName = useMemo(() => {
    if (folderHistory.length) {
      return folderHistory[folderHistory.length - 1].name;
    }

    return rootFolders.find((folder) => folder.id === activeFolderId)?.name || "Selected folder";
  }, [activeFolderId, folderHistory, rootFolders]);

  const summary = useMemo(() => {
    const folderPart = `${childFolders.length} folder${childFolders.length === 1 ? "" : "s"}`;
    const videoPart = `${videos.length} video${videos.length === 1 ? "" : "s"}`;
    return `${folderPart}, ${videoPart}`;
  }, [childFolders.length, videos.length]);

  const visiblePermissions = useMemo(
    () => permissions.filter((permission) => !permission.deleted),
    [permissions]
  );

  const canMutatePermission = (permission: DrivePermissionItem) =>
    permission.type === "user" &&
    permission.role !== "owner" &&
    permission.role !== "organizer" &&
    permission.role !== "fileOrganizer";

  const copyVideoLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Drive link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  const openFolder = (folder: DriveFolderItem) => {
    setFolderHistory((current) => [...current, folder]);
    setActiveFolderId(folder.id);
    setFolderIdInput(folder.id);
  };

  const goBack = () => {
    setFolderHistory((current) => {
      const nextHistory = current.slice(0, -1);
      const previousFolder = nextHistory[nextHistory.length - 1];

      if (previousFolder) {
        setActiveFolderId(previousFolder.id);
        setFolderIdInput(previousFolder.id);
      } else {
        const fallbackRoot = rootFolders.find((folder) => folder.id === folderIdInput) || rootFolders[0];
        if (fallbackRoot) {
          setActiveFolderId(fallbackRoot.id);
          setFolderIdInput(fallbackRoot.id);
        }
      }

      return nextHistory;
    });
  };

  const addPermission = async () => {
    const emailAddress = inviteEmail.trim().toLowerCase();

    if (!activeFolderId || !emailAddress) {
      toast.error("Folder and email are required");
      return;
    }

    try {
      setSubmittingInvite(true);
      const res = await fetch("/api/videos/drive-permissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemId: activeFolderId,
          emailAddress,
          role: inviteRole,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to add permission");
      }

      setInviteEmail("");
      await loadPermissions(activeFolderId);
      toast.success("Share access updated");
    } catch (mutationError: any) {
      toast.error(mutationError.message || "Could not update share list");
    } finally {
      setSubmittingInvite(false);
    }
  };

  const updatePermissionRole = async (permission: DrivePermissionItem) => {
    const nextRole = permissionRoleDrafts[permission.id] || permission.role;

    if (!activeFolderId || nextRole === permission.role) {
      return;
    }

    try {
      setMutatingPermissionId(permission.id);
      const res = await fetch("/api/videos/drive-permissions", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemId: activeFolderId,
          permissionId: permission.id,
          role: nextRole,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to update permission");
      }

      await loadPermissions(activeFolderId);
      toast.success("Permission role updated");
    } catch (mutationError: any) {
      toast.error(mutationError.message || "Could not update permission");
    } finally {
      setMutatingPermissionId(null);
    }
  };

  const removePermission = async (permission: DrivePermissionItem) => {
    if (!activeFolderId) return;

    const confirmed = window.confirm(
      `Remove ${permission.emailAddress || permission.displayName || "this access"} from this folder?`
    );

    if (!confirmed) return;

    try {
      setMutatingPermissionId(permission.id);
      const res = await fetch(
        `/api/videos/drive-permissions?itemId=${encodeURIComponent(
          activeFolderId
        )}&permissionId=${encodeURIComponent(permission.id)}`,
        { method: "DELETE" }
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to remove permission");
      }

      await loadPermissions(activeFolderId);
      toast.success("Access removed");
    } catch (mutationError: any) {
      toast.error(mutationError.message || "Could not remove access");
    } finally {
      setMutatingPermissionId(null);
    }
  };

  return (
    <aside className="w-[340px] shrink-0 border-l border-slate-200 bg-white/90 xl:w-[360px]">
      <div className="sticky top-0 space-y-4 border-b border-slate-200 bg-white/95 p-4 backdrop-blur">
        <div className="space-y-1">
          <CloudBackup size={42} color={"white"} className="m-1 text-xl p-2 bg-blue-800 rounded-full" />
          <p className="text-sm font-semibold text-slate-900">  Shared Drive Videos</p>
          <p className="text-xs leading-5 text-slate-500">
            Browse shared folders, drill into subfolders, and copy Drive links into the library.
          </p>
        </div>

        <div className="space-y-2">
          <Select
            value={activeFolderId || undefined}
            onValueChange={(value) => {
              const folder = rootFolders.find((item) => item.id === value);
              setFolderHistory(folder ? [folder] : []);
              setActiveFolderId(value);
              setFolderIdInput(value);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={loadingFolders ? "Loading folders..." : "Select accessible folder"}
              />
            </SelectTrigger>
            <SelectContent>
              {rootFolders.map((folder) => (
                <SelectItem key={folder.id} value={folder.id}>
                  {folder.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            value={folderIdInput}
            onChange={(e) => setFolderIdInput(e.target.value)}
            placeholder="Or paste a Drive folder ID manually"
          />

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={loadingContents}
              onClick={() => {
                setFolderHistory([]);
                loadFolderContents(folderIdInput);
              }}
            >
              {loadingContents ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!activeFolderId}
              onClick={() =>
                window.open(`https://drive.google.com/drive/folders/${activeFolderId}`, "_blank")
              }
            >
              <FolderOpen className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Status</p>
          <p className="mt-1 text-sm font-medium text-slate-800">{summary}</p>
          <p className="mt-1 text-xs text-slate-500">
            {loadingFolders ? "Loading accessible folders..." : `${rootFolders.length} accessible root folders`}
          </p>
          {activeFolderId && (
            <p className="mt-1 break-all text-xs text-slate-500">Folder: {currentFolderName}</p>
          )}
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          {permissionsError && (
            <p className="mt-2 text-xs text-red-600">{permissionsError}</p>
          )}
        </div>

        {folderHistory.length > 0 && (
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={goBack}>
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <p className="truncate text-xs text-slate-500">
              {folderHistory.map((folder) => folder.name).join(" / ")}
            </p>
          </div>
        )}
      </div>

      <div className="h-[calc(100vh-250px)] overflow-y-auto p-4">
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Shared With</p>
                <p className="mt-1 text-xs text-slate-500">
                  {loadingPermissions
                    ? "Loading permissions..."
                    : `${visiblePermissions.length} visible permission${
                        visiblePermissions.length === 1 ? "" : "s"
                      } on this folder`}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!activeFolderId || loadingPermissions}
                onClick={() => activeFolderId && loadPermissions(activeFolderId)}
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>

            <div className="mt-3 space-y-2">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                  Add Access
                </p>
                <div className="mt-3 space-y-2">
                  <Input
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="name@example.com"
                    type="email"
                  />
                  <div className="flex gap-2">
                    <Select
                      value={inviteRole}
                      onValueChange={(value) =>
                        setInviteRole(value as (typeof SHARE_ROLES)[number])
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SHARE_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!activeFolderId || submittingInvite}
                      onClick={addPermission}
                    >
                      {submittingInvite ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MailPlus className="h-4 w-4" />
                      )}
                      Add
                    </Button>
                  </div>
                </div>
              </div>

              {visiblePermissions.map((permission) => {
                const label =
                  permission.emailAddress ||
                  permission.displayName ||
                  permission.domain ||
                  permission.type;

                return (
                  <div
                    key={permission.id}
                    className="rounded-xl border border-slate-200 bg-white p-3"
                  >
                    <p className="truncate text-sm font-medium text-slate-900">
                      {label}
                    </p>
                    <p className="mt-1 text-xs capitalize text-slate-500">
                      {permission.role} access via {permission.type}
                    </p>
                    {permission.allowFileDiscovery !== null && (
                      <p className="mt-1 text-xs text-slate-500">
                        Discoverable: {permission.allowFileDiscovery ? "Yes" : "No"}
                      </p>
                    )}
                    {canMutatePermission(permission) && (
                      <div className="mt-3 flex gap-2">
                        <Select
                          value={permissionRoleDrafts[permission.id] || permission.role}
                          onValueChange={(value) =>
                            setPermissionRoleDrafts((current) => ({
                              ...current,
                              [permission.id]: value,
                            }))
                          }
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SHARE_ROLES.map((role) => (
                              <SelectItem key={role} value={role}>
                                {role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={mutatingPermissionId === permission.id}
                          onClick={() => updatePermissionRole(permission)}
                        >
                          {mutatingPermissionId === permission.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Save"
                          )}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={mutatingPermissionId === permission.id}
                          onClick={() => removePermission(permission)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}

              {!loadingPermissions && !visiblePermissions.length && !permissionsError && (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-3 text-xs text-slate-500">
                  No direct permission entries were returned for this folder.
                </div>
              )}
            </div>
          </div>

          {childFolders.map((folder) => (
            <button
              key={folder.id}
              type="button"
              onClick={() => openFolder(folder)}
              className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:bg-slate-100"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <Folder className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{folder.name}</p>
                {folder.modifiedTime && (
                  <p className="mt-1 text-xs text-slate-500">
                    Updated {new Date(folder.modifiedTime).toLocaleDateString()}
                  </p>
                )}
              </div>
            </button>
          ))}

          {videos.map((video) => (
            <div key={video.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
                  {video.thumbnailLink ? (
                    <img
                      src={video.thumbnailLink}
                      alt={video.name}
                      className="h-full w-full rounded-2xl object-cover"
                    />
                  ) : (
                    <Video className="h-4 w-4" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium text-slate-900">{video.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatBytes(video.size)}</p>
                  {video.modifiedTime && (
                    <p className="mt-1 text-xs text-slate-500">
                      Updated {new Date(video.modifiedTime).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => copyVideoLink(video.webViewLink)}
                >
                  <Copy className="h-4 w-4" />
                  Copy Link
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.open(video.webViewLink, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                  Open
                </Button>
              </div>
            </div>
          ))}

          {!loadingContents && !childFolders.length && !videos.length && !error && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
              No folders or videos found at this level.
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
