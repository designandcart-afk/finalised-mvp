"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/UI";
import { DemoProject, DemoUpload } from "@/lib/demoData";
import { uploadFiles } from "@/lib/uploadAdapter";
import { useProjects } from "@/lib/contexts/projectsContext";
import AuthGuard from "@/components/AuthGuard";

// Suggested options (designer can still type anything)
const AREAS = [
  "Living Room",
  "Dining",
  "Bedroom",
  "Master Bedroom",
  "Kids Room",
  "Kitchen",
  "Bathroom",
  "Balcony",
  "Study",
];

const SCOPES = [
  "One Area",
  "1 BHK",
  "2 BHK",
  "3 BHK",
  "4 BHK",
  "Villa",
  "Penthouse",
  "Studio Apartment",
  "Commercial Space",
  "Others",
];

  type SortKey = "date" | "date-asc" | "name" | "name-desc";export default function DashboardPage() {
  const { projects, addProject } = useProjects();

  const [form, setForm] = useState<{
    name: string;
    scope: string;
    address: string;
    pincode: string;
    notes: string;
    areaInput: string;
    areas: string[];
    files: File[];
    uploading: boolean;
  }>({
    name: "",
    scope: "",
    address: "",
    pincode: "",
    notes: "",
    areaInput: "",
    areas: [],
    files: [],
    uploading: false,
  });

  const [scopeFocus, setScopeFocus] = useState(false);
  const [areaFocus, setAreaFocus] = useState(false);

  const [query, setQuery] = useState("");  // search query
  const [sortBy, setSortBy] = useState<SortKey>("date"); // date (newest) | name
  const [statusFilter, setStatusFilter] = useState<string>("all"); // all | wip | completed | on-hold

  function onFilesSelected(list: FileList | null) {
    if (!list) return;
    setForm((f) => ({ ...f, files: Array.from(list) }));
  }

  async function handleCreate() {
    if (!form.name) return;
    setForm((f) => ({ ...f, uploading: true }));

    // First create the project without files
    const created = await addProject({
      name: form.name.trim(),
      scope: form.scope.trim() || "wip",
      address: form.address.trim() || undefined,
      pincode: form.pincode?.trim() || undefined,
      notes: form.notes.trim() || undefined,
      areas: form.areas.length ? form.areas : undefined,
      area: form.areas[0] || undefined,
      status: "wip",
      uploads: [],
    });

    // Then upload files with the project ID if project was created
    if (created && form.files.length > 0) {
      try {
        const result = await uploadFiles(form.files.map((file) => ({ 
          file,
          projectId: created.id,
          type: 'file'
        })));
        
        // Save file info to project_user_files table
        const { supabase } = await import('@/lib/supabase');
        const { data: userData } = await supabase.auth.getUser();
        
        if (userData.user) {
          const fileRecords = result.map(f => ({
            project_id: created.id,
            user_id: userData.user.id,
            file_url: f.url,
            file_name: f.name,
            file_type: f.name.split('.').pop()?.toLowerCase() || 'file',
            file_size: f.size
          }));
          
          const { error: insertError } = await supabase
            .from('project_user_files')
            .insert(fileRecords);
          
          if (insertError) {
            console.error('Error saving file records:', insertError);
          } else {
            console.log('Files uploaded and saved to project_user_files:', fileRecords.length, 'files');
          }
        }
      } catch (error) {
        console.error('File upload failed:', error);
        // Project is already created, files can be uploaded later
      }
    }

    if (created) {
      setForm({
        name: "",
        scope: "",
        address: "",
        pincode: "",
        notes: "",
        areaInput: "",
        areas: [],
        files: [],
        uploading: false,
      });
    } else {
      setForm((f) => ({ ...f, uploading: false }));
      // Optionally show error to user
      // alert('Failed to create project.');
    }
  }

  const inputBase =
    "w-full rounded-2xl border border-black/10 px-4 py-3 outline-none bg-white text-[#2e2e2e] " +
    "placeholder:text-[#2e2e2e]/40 focus:ring-2 focus:ring-[#d96857]/30";

  // Soft suggestion chips (no browser dropdown)
  function SuggestChips({
    items,
    onPick,
    visible,
    filter,
  }: {
    items: string[];
    onPick: (v: string) => void;
    visible: boolean;
    filter: string;
  }) {
    if (!visible) return null;
    const q = filter.trim().toLowerCase();
    const filtered = q ? items.filter((i) => i.toLowerCase().includes(q)) : items;
    if (!filtered.length) return null;
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {filtered.slice(0, 8).map((it) => (
          <button
            key={it}
            type="button"
            onMouseDown={() => onPick(it)}
            className="text-sm text-[#2e2e2e] bg-[#f9f8f7] border border-black/10 rounded-full px-3 py-1 hover:border-[#d96857]/40"
          >
            {it}
          </button>
        ))}
      </div>
    );
  }

  // Filter + sort projects for display
  const visibleProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = projects.filter((p) => {
      // Search filter
      const matchesSearch = !q || [
        p.name,
        p.scope,
        p.area ?? "",
        p.address ?? "",
        p.status ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
      
      // Status filter
      const matchesStatus = statusFilter === "all" || 
        (p.status && p.status.toLowerCase().replace(/\s+/g, '-') === statusFilter);
      
      return matchesSearch && matchesStatus;
    });

    list = list.sort((a, b) => {
      if (sortBy === "date") return b.createdAt - a.createdAt; // newest first
      if (sortBy === "date-asc") return a.createdAt - b.createdAt; // oldest first
      if (sortBy === "name") return a.name.localeCompare(b.name, undefined, { sensitivity: "base" }); // A-Z
      if (sortBy === "name-desc") return b.name.localeCompare(a.name, undefined, { sensitivity: "base" }); // Z-A
      return 0;
    });

    return list;
  }, [projects, query, sortBy, statusFilter]);

  return (
    <AuthGuard>
      <main className="px-6 md:px-10 py-6 min-h-screen bg-[#f2f0ed]">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add Project */}
        <div id="create-project-form" className="bg-white shadow-xl shadow-black/5 rounded-3xl p-6 border border-black/5">
          <h2 className="text-xl font-semibold text-[#2e2e2e] mb-4">Add Project</h2>

          <div className="space-y-4">
            <input
              className={inputBase}
              placeholder="Project name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              autoComplete="off"
              data-form-type="other"
              name="project-name"
            />

            {/* Scope of Work — free type with soft suggestion chips */}
            <div>
              <input
                className={inputBase}
                placeholder="Scope of Work (type or pick)"
                value={form.scope}
                onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value }))}
                onFocus={() => setScopeFocus(true)}
                onBlur={() => setTimeout(() => setScopeFocus(false), 100)}
              />
              <SuggestChips
                items={SCOPES}
                filter={form.scope}
                visible={scopeFocus}
                onPick={(v) => setForm((f) => ({ ...f, scope: v }))}
              />
            </div>

            {/* Area — multi-entry chips with suggestions and custom input */}
            <div>
              <div className="flex flex-wrap gap-2 mb-2">
                {form.areas.map((area, idx) => (
                  <span key={area + idx} className="flex items-center bg-[#f9f8f7] border border-black/10 rounded-full px-3 py-1 text-sm">
                    {area}
                    <button
                      type="button"
                      className="ml-2 text-[#d96857] hover:text-red-500"
                      onClick={() => setForm(f => ({ ...f, areas: f.areas.filter((_, i) => i !== idx) }))}
                      aria-label={`Remove area ${area}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <input
                className={inputBase}
                placeholder="Add area (type or pick, press Enter)"
                value={form.areaInput}
                onChange={e => setForm(f => ({ ...f, areaInput: e.target.value }))}
                onFocus={() => setAreaFocus(true)}
                onBlur={() => setTimeout(() => setAreaFocus(false), 100)}
                onKeyDown={e => {
                  if ((e.key === 'Enter' || e.key === ',') && form.areaInput.trim()) {
                    e.preventDefault();
                    const newArea = form.areaInput.trim();
                    if (!form.areas.includes(newArea)) {
                      setForm(f => ({ ...f, areas: [...f.areas, newArea], areaInput: '' }));
                    } else {
                      setForm(f => ({ ...f, areaInput: '' }));
                    }
                  }
                }}
              />
              <SuggestChips
                items={AREAS.filter(a => !form.areas.includes(a))}
                filter={form.areaInput}
                visible={areaFocus}
                onPick={v => {
                  if (!form.areas.includes(v)) {
                    setForm(f => ({ ...f, areas: [...f.areas, v], areaInput: '' }));
                  } else {
                    setForm(f => ({ ...f, areaInput: '' }));
                  }
                }}
              />
            </div>

            <input
              className={inputBase}
              placeholder="Address"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              autoComplete="new-project-address"
            />

            <input
              className={inputBase}
              placeholder="Pincode"
              value={form.pincode || ''}
              onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))}
              type="text"
              pattern="[0-9]{6}"
              maxLength={6}
              autoComplete="postal-code"
            />

            <textarea
              className={inputBase}
              placeholder="Notes"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />

            {/* File Upload */}
            <div className="relative">
              <input
                id="project-files"
                aria-label="Upload files"
                type="file"
                multiple
                accept="image/*,.pdf,.ppt,.pptx,.doc,.docx,.zip"
                onChange={(e) => onFilesSelected(e.target.files)}
                className="hidden"
              />
              <label
                htmlFor="project-files"
                className="flex items-center justify-center gap-3 w-full rounded-2xl border-2 border-dashed border-zinc-300 px-4 py-6 bg-[#f9f9f8] hover:bg-white hover:border-[#d96857]/40 transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-full bg-[#d96857]/30 text-[#d96857] flex items-center justify-center group-hover:bg-[#d96857] group-hover:text-white group-hover:scale-110 transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div className="text-sm">
                  <div className="font-medium text-[#2e2e2e]/70">Add files</div>
                  <div className="text-xs text-[#2e2e2e]/60 mt-0.5">
                    {form.files.length > 0 ? `${form.files.length} file(s) selected` : 'Images, PDFs, or documents'}
                  </div>
                </div>
              </label>
            </div>

            {form.files.length > 0 && (
              <div className="rounded-2xl border border-black/10 p-3 text-sm text-[#2e2e2e]/80 bg-[#f9f8f7]">
                <div className="mb-1 font-medium">{form.files.length} file(s) selected</div>
                <ul className="list-disc pl-5 space-y-1">
                  {form.files.map((f, i) => (
                    <li key={i}>
                      {f.name}{" "}
                      <span className="text-xs text-[#2e2e2e]/60">
                        ({Math.round(f.size / 1024)} KB)
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-col items-center pt-2">
              <Button
                onClick={handleCreate}
                disabled={form.uploading}
                className="bg-[#d96857] hover:bg-[#d96857]/90 rounded-2xl px-8 py-3 text-white disabled:opacity-60 min-w-[200px]"
              >
                {form.uploading ? "Uploading…" : "Create Project"}
              </Button>
              <p className="text-xs text-zinc-500 mt-3 text-center max-w-md">
                Create your project to receive a free quote for your 3D visualization work.
              </p>
            </div>
          </div>
        </div>

        {/* Projects */}
        <div className="lg:col-span-2 bg-white shadow-xl shadow-black/5 rounded-3xl p-6 border border-black/5">
          <h2 className="text-xl font-semibold text-[#2e2e2e] mb-5">Projects</h2>

          {/* Single Filter Bar: Search + Status + Sort */}
          <div className="flex items-center gap-3 mb-6 pb-5 border-b border-zinc-100">
            {/* Search */}
            <div className="flex-1 relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2e2e2e]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects…"
                className="w-full rounded-full border-0 pl-10 pr-4 py-2.5 bg-[#f2f0ed] text-[#2e2e2e] placeholder:text-[#2e2e2e]/40 focus:outline-none focus:ring-2 focus:ring-[#d96857]/20 transition-all"
              />
            </div>

            {/* Status Dropdown */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none rounded-full border-0 pl-10 pr-10 py-2.5 bg-[#f2f0ed] text-[#2e2e2e]/60 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#d96857]/20 transition-all cursor-pointer hover:bg-[#d96857]/5"
              >
                <option value="all">All Status</option>
                <option value="in_progress">In Progress</option>
                <option value="on_hold">On Hold</option>
                <option value="designs_shared">Designs Shared</option>
                <option value="approved">Approved</option>
                <option value="ordered">Ordered</option>
                <option value="closed">Closed</option>
              </select>
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2e2e2e]/50 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2e2e2e]/50 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="appearance-none rounded-full border-0 pl-10 pr-10 py-2.5 bg-[#f2f0ed] text-[#2e2e2e]/60 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#d96857]/20 transition-all cursor-pointer hover:bg-[#d96857]/5"
              >
                <option value="date">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="name">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
              </select>
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2e2e2e]/50 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2e2e2e]/50 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {visibleProjects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${encodeURIComponent(p.id)}`}
                className="block rounded-2xl border-2 border-zinc-200 p-5 hover:shadow-lg hover:border-[#d96857]/30 hover:-translate-y-0.5 transition-all duration-200 bg-white group"
              >
                <h3 className="text-[#d96857] font-semibold text-lg group-hover:text-[#c85746] transition-colors">{p.name}</h3>
                <p className="text-sm text-zinc-600 mt-1 font-medium">
                  {p.scope || "wip"}
                  {p.areas && p.areas.length ? ` · ${p.areas[0]}` : p.area ? ` · ${p.area}` : ""}
                </p>
                {p.address && <p className="mt-1.5 text-sm text-zinc-500">{p.address}</p>}

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-[#2e2e2e]/50">
                    {new Date(p.createdAt).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}
                  </span>
                  {p.status && (
                    <span className={`text-xs rounded-full px-3 py-1 font-medium transition-colors ${
                      p.status === 'in_progress' ? 'bg-[#d96857]/5 text-[#d96857] border border-[#d96857]/15' :
                      p.status === 'on_hold' ? 'bg-[#2e2e2e]/5 text-[#2e2e2e]/70 border border-[#2e2e2e]/10' :
                      p.status === 'designs_shared' ? 'bg-[#d96857]/8 text-[#c85746] border border-[#d96857]/20' :
                      p.status === 'approved' ? 'bg-[#d96857]/10 text-[#b84535] border border-[#d96857]/25' :
                      p.status === 'ordered' ? 'bg-[#d96857]/12 text-[#a53d2e] border border-[#d96857]/30' :
                      p.status === 'closed' ? 'bg-[#2e2e2e]/8 text-[#2e2e2e] border border-[#2e2e2e]/15' :
                      'bg-[#d96857]/5 text-[#d96857] border border-[#d96857]/15'
                    }`}>
                      {p.status === 'in_progress' ? 'In Progress' :
                       p.status === 'on_hold' ? 'On Hold' :
                       p.status === 'designs_shared' ? 'Designs Shared' :
                       p.status === 'approved' ? 'Approved' :
                       p.status === 'ordered' ? 'Ordered' :
                       p.status === 'closed' ? 'Closed' :
                       p.status}
                    </span>
                  )}
                </div>

                {p.uploads && p.uploads.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs text-[#2e2e2e]/60 mb-1">
                      {p.uploads.length} upload{p.uploads.length > 1 ? "s" : ""}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {p.uploads.slice(0, 3).map((u) => (
                        <a
                          key={u.id}
                          href={u.url}
                          target="_blank"
                          className="text-xs underline text-[#2e2e2e]/80 bg-[#f9f8f7] border border-black/10 rounded-full px-3 py-1"
                        >
                          {u.name.length > 18 ? u.name.slice(0, 18) + "…" : u.name}
                        </a>
                      ))}
                      {p.uploads.length > 3 && (
                        <span className="text-xs text-[#2e2e2e]/60">
                          +{p.uploads.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </Link>
            ))}

            {/* Empty state */}
            {visibleProjects.length === 0 && projects.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-16 px-8">
                <div className="w-24 h-24 mb-6 rounded-full bg-[#d96857]/10 flex items-center justify-center">
                  <svg className="w-12 h-12 text-[#d96857]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-[#2e2e2e] mb-2">No Projects Yet</h3>
                <p className="text-zinc-500 text-center max-w-md mb-6">
                  Start your journey by creating your first project. Get a free quote for professional 3D visualization services.
                </p>
                <button
                  onClick={() => {
                    const formSection = document.querySelector('[id="create-project-form"]');
                    formSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="bg-[#d96857] hover:bg-[#c85746] text-white px-6 py-3 rounded-full font-medium transition-colors shadow-md hover:shadow-lg"
                >
                  Create Your First Project
                </button>
              </div>
            )}
            
            {/* No results state */}
            {visibleProjects.length === 0 && projects.length > 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-12 px-8">
                <div className="w-16 h-16 mb-4 rounded-full bg-zinc-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-[#2e2e2e] mb-2">No Projects Found</h3>
                <p className="text-zinc-500 text-sm mb-4">
                  Try adjusting your search or filter criteria
                </p>
                <button
                  onClick={() => {
                    setQuery("");
                    setStatusFilter("all");
                  }}
                  className="text-[#d96857] hover:text-[#c85746] text-sm font-medium transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
    </AuthGuard>
  );
}
