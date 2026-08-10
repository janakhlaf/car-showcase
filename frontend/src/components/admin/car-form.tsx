

/**
 * CarForm — create/edit vehicles with:
 *  · inline brand creation
 *  · image thumbnail + gallery uploads (POST /api/upload)
 *  · Sketchfab URL or local GLB/GLTF model upload
 *  · structured specs + features tag editor
 * Server-side Zod validation remains the source of truth; 422 issues are
 * surfaced via toast.
 */
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { adminApi } from "@/lib/admin-auth";
import {
  ArrowLeft,
  Box,
  ImagePlus,
  Loader2,
  Plus,
  Save,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { Brand, CarSpecs, CarWithBrand } from "@/db/schema";
import { cn } from "@/lib/utils";

const inputCls =
  "w-full rounded-xl border border-white/10 bg-obsidian-900/80 px-4 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-champagne-400/60";
const labelCls = "text-[11px] font-semibold tracking-[0.2em] text-zinc-500 uppercase";

async function uploadFiles(files: File[]): Promise<string[]> {
  const fd = new FormData();
  files.forEach((f) => fd.append("files", f));

  const res = await adminApi.post<{ data: { urls: string[] } }>(
    "/api/upload",
    fd
  );

  return res.data.data.urls;
}

const specFields: Array<{ key: keyof CarSpecs; label: string; type: "number" | "text"; step?: string; placeholder: string }> = [
  { key: "horsepower", label: "Power (hp)", type: "number", placeholder: "e.g. 690" },
  { key: "topSpeed", label: "Top speed (mph)", type: "number", placeholder: "e.g. 205" },
  { key: "acceleration", label: "0–60 mph (s)", type: "number", step: "0.1", placeholder: "e.g. 3.0" },
  { key: "weight", label: "Weight (lbs)", type: "number", placeholder: "e.g. 3303" },
  { key: "seats", label: "Seats", type: "number", placeholder: "e.g. 2" },
  { key: "engine", label: "Powertrain", type: "text", placeholder: "e.g. 4.0L Twin-Turbo V8" },
  { key: "transmission", label: "Gearbox", type: "text", placeholder: "e.g. 8-Speed Dual-Clutch" },
  { key: "drivetrain", label: "Driven wheels", type: "text", placeholder: "RWD / AWD" },
];

export function CarForm({
  mode,
  initial,
  brands: initialBrands,
}: {
  mode: "create" | "edit";
  initial?: CarWithBrand;
  brands: Brand[];
}) {
  const navigate = useNavigate();
  const [brands, setBrands] = useState(initialBrands);
  const [newBrand, setNewBrand] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [featureDraft, setFeatureDraft] = useState("");
  type CarVariantForm = {
  colorName: string;
  colorHex: string;
  thumbnailUrl: string;
  modelUrl: string;
  isDefault: boolean;
};

const [variants, setVariants] = useState<CarVariantForm[]>([
  {
    colorName: initial?.color ?? "",
    colorHex: initial?.colorHex ?? "#8a8d91",
    thumbnailUrl: initial?.thumbnail ?? "",
    modelUrl: initial?.modelPath ?? "",
    isDefault: true,
  },
]);

  const thumbInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: initial?.name ?? "",
    brandId: initial?.brandId ?? brands[0]?.id ?? 0,
    year: initial?.year ?? 2025,
    price: initial?.price ?? 150000,
    color: initial?.color ?? "",
    colorHex: initial?.colorHex ?? "#8a8d91",
    description: initial?.description ?? "",
    thumbnail: initial?.thumbnail ?? "",
    images: initial?.images ?? ([] as string[]),
    sketchfabUrl: initial?.sketchfabUrl ?? "",
    modelPath: initial?.modelPath ?? "",
    featured: initial?.featured ?? false,
  });
  const [specs, setSpecs] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(initial?.specs ?? {}).map(([k, v]) => [k, String(v)])),
  );
  const [features, setFeatures] = useState<string[]>(initial?.features ?? []);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  function addVariant() {
  setVariants((current) => [
    ...current,
    {
      colorName: "",
      colorHex: "#8a8d91",
      thumbnailUrl: "",
      modelUrl: "",
      isDefault: false,
    },
  ]);
}

function updateVariant(
  index: number,
  key: keyof CarVariantForm,
  value: string | boolean
) {
  setVariants((current) =>
    current.map((variant, i) =>
      i === index
        ? { ...variant, [key]: value }
        : variant
    )
  );
}

function removeVariant(index: number) {
  setVariants((current) => {
    if (current.length === 1) {
      toast.error("At least one color is required");
      return current;
    }

    return current.filter((_, i) => i !== index);
  });
}

function setDefaultVariant(index: number) {
  setVariants((current) =>
    current.map((variant, i) => ({
      ...variant,
      isDefault: i === index,
    }))
  );
}

  async function addBrand() {
    const name = newBrand.trim();
    if (name.length < 2) return toast.error("Brand name is too short");
    try {
      const res = await axios.post<{ data: Brand }>("/api/brands", { name });
      const created = res.data.data;
      setBrands((list) => [...list.filter((b) => b.id !== created.id), created].sort((a, b) => a.name.localeCompare(b.name)));
      set("brandId", created.id);
      setNewBrand("");
      toast.success(`Marque “${created.name}” ready`);
    } catch {
      toast.error("Could not create the brand");
    }
  }

  async function onUpload(kind: "thumbnail" | "gallery" | "model", files: FileList | null) {
    if (!files?.length) return;
    setUploading(kind);
    try {
      const urls = await uploadFiles(Array.from(files));
      if (kind === "thumbnail") set("thumbnail", urls[0]);
      if (kind === "gallery") set("images", [...form.images, ...urls].slice(0, 10));
      if (kind === "model") set("modelPath", urls[0]);
      toast.success(kind === "model" ? "3D model uploaded" : `${urls.length} image${urls.length > 1 ? "s" : ""} uploaded`);
    } catch (error) {
      toast.error(axios.isAxiosError(error) ? (error.response?.data?.error ?? "Upload failed") : "Upload failed");
    } finally {
      setUploading(null);
    }
  }
  async function onVariantUpload(
  index: number,
  kind: "thumbnail" | "model",
  files: FileList | null
) {
  if (!files?.length) return;

  const uploadKey = `variant-${index}-${kind}`;
  setUploading(uploadKey);

  try {
    const urls = await uploadFiles(Array.from(files));

    if (kind === "thumbnail") {
      updateVariant(index, "thumbnailUrl", urls[0]);
    }

    if (kind === "model") {
      updateVariant(index, "modelUrl", urls[0]);
    }

    toast.success(
      kind === "thumbnail"
        ? "Color image uploaded"
        : "Color 3D model uploaded"
    );
  } catch (error) {
    toast.error(
      axios.isAxiosError(error)
        ? error.response?.data?.error ?? "Upload failed"
        : "Upload failed"
    );
  } finally {
    setUploading(null);
  }
}

  function addFeature() {
    const value = featureDraft.trim();
    if (!value) return;
    if (features.includes(value)) return toast.error("Feature already added");
    if (features.length >= 12) return toast.error("Maximum 12 features");
    setFeatures((f) => [...f, value]);
    setFeatureDraft("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.brandId) return toast.error("Choose a marque first");
    setSaving(true);
    try {
      const cleanSpecs: CarSpecs = {};
      for (const f of specFields) {
        const raw = specs[f.key]?.trim();
        if (!raw) continue;
        (cleanSpecs as Record<string, unknown>)[f.key] = f.type === "number" ? Number(raw) : raw;
      }
      const payload = {
        ...form,
        year: Number(form.year),
        price: Number(form.price),
        brandId: Number(form.brandId),
        sketchfabUrl: form.sketchfabUrl || null,
        modelPath: form.modelPath || null,
        specs: cleanSpecs,
        features,
        variants,
      };
      if (mode === "create") {
  await adminApi.post(
    "/api/cars",
    payload
  );

  toast.success(
    "Vehicle added to the collection"
  );

} else {
  await adminApi.put(
    `/api/cars/${initial!.id}`,
    payload
  );

  toast.success(
    "Vehicle updated"
  );
}
      navigate("/admin");
      
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const data = error.response?.data as { error?: string; issues?: Array<{ field: string; message: string }> };
        const first = data?.issues?.[0];
        toast.error(data?.error ?? "Save failed", {
          description: first ? `${first.field}: ${first.message}` : undefined,
        });
      } else {
        toast.error("Save failed");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-5xl px-5 pt-28 pb-16 lg:px-8">
      <Link
        to="/admin"
        className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-zinc-500 uppercase transition-colors hover:text-champagne-300"
      >
        <ArrowLeft className="size-3.5" /> Dashboard
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl font-bold tracking-tight">
          {mode === "create" ? "Add a vehicle" : `Edit ${initial?.name ?? "vehicle"}`}
        </h1>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-champagne-400 px-7 py-3 text-sm font-bold tracking-[0.12em] text-obsidian-950 uppercase transition-colors hover:bg-champagne-300 disabled:opacity-60"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {saving ? "Saving…" : mode === "create" ? "Add to collection" : "Save changes"}
        </button>
      </div>

      {/* ── Basics ─────────────────────────────────────────────── */}
      <section className="glass mt-8 rounded-3xl p-6 md:p-8" aria-label="Basics">
        <h2 className="font-display text-sm font-semibold tracking-[0.24em] text-champagne-400 uppercase">Basics</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Model name</span>
            <input required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. 911 GT3 RS" className={cn(inputCls, "mt-2")} />
          </label>

          <div>
            <span className={labelCls}>Marque</span>
            <div className="mt-2 flex gap-2">
              <select
                value={form.brandId}
                onChange={(e) => set("brandId", Number(e.target.value))}
                className={cn(inputCls, "appearance-none")}
                aria-label="Brand"
              >
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-2 flex gap-2">
              <input
                value={newBrand}
                onChange={(e) => setNewBrand(e.target.value)}
                placeholder="New marque…"
                className={inputCls}
                aria-label="New brand name"
              />
              <button
                type="button"
                onClick={addBrand}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-champagne-400/40 px-4 text-xs font-bold tracking-widest text-champagne-300 uppercase transition-colors hover:bg-champagne-400 hover:text-obsidian-950"
              >
                <Plus className="size-3.5" /> Add
              </button>
            </div>
          </div>

          <label className="block">
            <span className={labelCls}>Model year</span>
            <input required type="number" min={1950} max={2035} value={form.year} onChange={(e) => set("year", Number(e.target.value))} className={cn(inputCls, "mt-2")} />
          </label>
          <label className="block">
            <span className={labelCls}>Price (USD)</span>
            <input required type="number" min={1000} value={form.price} onChange={(e) => set("price", Number(e.target.value))} className={cn(inputCls, "mt-2")} />
          </label>

          <label className="flex cursor-pointer items-center gap-3 self-end pb-1 select-none">
            <button
              type="button"
              role="switch"
              aria-checked={form.featured}
              onClick={() => set("featured", !form.featured)}
              className={cn(
                "relative h-6 w-11 rounded-full border transition-colors",
                form.featured ? "border-champagne-400 bg-champagne-400/30" : "border-white/15 bg-white/5",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 size-4.5 rounded-full transition-all",
                  form.featured ? "left-[22px] bg-champagne-300" : "left-1 bg-zinc-500",
                )}
              />
            </button>
            <span className="flex items-center gap-1.5 text-sm text-zinc-300">
              <Star className={cn("size-4", form.featured && "fill-champagne-400 text-champagne-400")} />
              Feature on the homepage
            </span>
          </label>
        </div>
      </section>

      {/* ── Color Variants ─────────────────────────────────────── */}
<section className="glass mt-6 rounded-3xl p-6 md:p-8" aria-label="Factory colors">
  <div className="flex flex-wrap items-center justify-between gap-4">
    <div>
      <h2 className="font-display text-sm font-semibold tracking-[0.24em] text-champagne-400 uppercase">
        Factory Colors
      </h2>

      <p className="mt-2 text-xs text-zinc-500">
        Add the available colors for this vehicle.
      </p>
    </div>

    <button
      type="button"
      onClick={addVariant}
      className="inline-flex items-center gap-2 rounded-xl border border-champagne-400/40 px-4 py-2.5 text-xs font-bold tracking-widest text-champagne-300 uppercase transition-colors hover:bg-champagne-400 hover:text-obsidian-950"
    >
      <Plus className="size-3.5" />
      Add Color
    </button>
  </div>

  <div className="mt-6 space-y-4">
    {variants.map((variant, index) => (
      <div
        key={index}
        className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-semibold text-zinc-200">
            Color {index + 1}
          </span>

          <div className="flex items-center gap-3">
            {variant.isDefault ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-champagne-300">
                <Star className="size-3.5 fill-champagne-400" />
                Default
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setDefaultVariant(index)}
                className="text-xs text-zinc-500 transition-colors hover:text-champagne-300"
              >
                Set as default
              </button>
            )}

            {variants.length > 1 && (
              <button
                type="button"
                onClick={() => removeVariant(index)}
                className="inline-flex items-center gap-1 text-xs text-red-400/70 hover:text-red-400"
              >
                <Trash2 className="size-3.5" />
                Delete
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 grid items-end gap-5 sm:grid-cols-[1fr_1fr_auto]">
          <label className="block">
            <span className={labelCls}>Paint name</span>

            <input
              required
              value={variant.colorName}
              onChange={(e) =>
                updateVariant(
                  index,
                  "colorName",
                  e.target.value
                )
              }
              placeholder="e.g. Volcano Blue"
              className={cn(inputCls, "mt-2")}
            />
          </label>

          <label className="block">
            <span className={labelCls}>Hex code</span>

            <input
              required
              value={variant.colorHex}
              onChange={(e) =>
                updateVariant(
                  index,
                  "colorHex",
                  e.target.value
                )
              }
              pattern="#[0-9a-fA-F]{6}"
              placeholder="#3D69A4"
              className={cn(
                inputCls,
                "mt-2 font-mono uppercase"
              )}
            />
          </label>

          <label className="block">
            <span className={labelCls}>Picker</span>

            <input
              type="color"
              value={
                /^#[0-9a-fA-F]{6}$/.test(
                  variant.colorHex
                )
                  ? variant.colorHex
                  : "#8a8d91"
              }
              onChange={(e) =>
                updateVariant(
                  index,
                  "colorHex",
                  e.target.value
                )
              }
              className="mt-2 h-[42px] w-16 cursor-pointer rounded-xl border border-white/10 bg-transparent"
            />
          </label>
        </div>
        {/* Image + 3D model for THIS color */}
<div className="mt-5 grid gap-5 md:grid-cols-2">

  {/* COLOR IMAGE */}
  <div>
    <span className={labelCls}>Color image *</span>

    <input
      id={`variant-thumbnail-${index}`}
      type="file"
      accept="image/*"
      hidden
      onChange={(e) =>
        onVariantUpload(index, "thumbnail", e.target.files)
      }
    />

    <button
      type="button"
      disabled={uploading !== null}
      onClick={() =>
        document
          .getElementById(`variant-thumbnail-${index}`)
          ?.click()
      }
      className="mt-2 inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:border-champagne-400/50 hover:text-champagne-300 disabled:opacity-50"
    >
      {uploading === `variant-${index}-thumbnail` ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <ImagePlus className="size-3.5" />
      )}

      Upload image
    </button>

    {variant.thumbnailUrl && (
      <div className="mt-3">
        <img
          src={variant.thumbnailUrl}
          alt={variant.colorName || `Color ${index + 1}`}
          className="h-28 w-48 rounded-xl border border-white/10 object-cover"
        />

        <p className="mt-2 text-xs text-green-400">
          ✓ Image uploaded
        </p>
      </div>
    )}
  </div>


  {/* COLOR 3D MODEL */}
  <div>
    <span className={labelCls}>3D model GLB / GLTF *</span>

    <input
      id={`variant-model-${index}`}
      type="file"
      accept=".glb,.gltf"
      hidden
      onChange={(e) =>
        onVariantUpload(index, "model", e.target.files)
      }
    />

    <button
      type="button"
      disabled={uploading !== null}
      onClick={() =>
        document
          .getElementById(`variant-model-${index}`)
          ?.click()
      }
      className="mt-2 inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:border-champagne-400/50 hover:text-champagne-300 disabled:opacity-50"
    >
      {uploading === `variant-${index}-model` ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Upload className="size-3.5" />
      )}

      Upload GLB / GLTF
    </button>

    {variant.modelUrl && (
      <p className="mt-3 text-xs text-green-400">
        ✓ 3D model uploaded
      </p>
    )}
  </div>

</div>
      </div>
    ))}
  </div>
</section>

      {/* ── Story ──────────────────────────────────────────────── */}
      <section className="glass mt-6 rounded-3xl p-6 md:p-8" aria-label="Description">
        <h2 className="font-display text-sm font-semibold tracking-[0.24em] text-champagne-400 uppercase">The story</h2>
        <textarea
          required
          minLength={10}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={4}
          placeholder="A short editorial paragraph about this machine…"
          className={cn(inputCls, "mt-4 resize-y")}
        />
      </section>

      {/* ── Media ──────────────────────────────────────────────── */}
      <section className="glass mt-6 rounded-3xl p-6 md:p-8" aria-label="Media">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold tracking-[0.24em] text-champagne-400 uppercase">Photography</h2>
          <div className="flex gap-2">
            <input ref={galleryInputRef} type="file" accept="image/*" multiple hidden onChange={(e) => onUpload("gallery", e.target.files)} />
            <button type="button" disabled={uploading !== null} onClick={() => galleryInputRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3.5 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:border-champagne-400/50 hover:text-champagne-300 disabled:opacity-50">
              {uploading === "gallery" ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
              Gallery upload
            </button>
          </div>
        </div>

        <label className="mt-5 block">
          <span className={labelCls}>Thumbnail URL</span>
          <input required value={form.thumbnail} onChange={(e) => set("thumbnail", e.target.value)} placeholder="https://… or /api/uploads/image.jpg" className={cn(inputCls, "mt-2")} />
        </label>
        {form.thumbnail && (
          <img src={form.thumbnail} alt="Thumbnail preview" className="mt-3 h-28 w-48 rounded-xl border border-white/10 object-cover" />
        )}

        <div className="mt-6">
          <span className={labelCls}>Gallery ({form.images.length}/10)</span>
          <div className="mt-3 space-y-2.5">
            {form.images.map((url, i) => (
              <div key={`${url}-${i}`} className="flex items-center gap-2.5">
                <img src={url} alt="" className="h-10 w-16 shrink-0 rounded-lg border border-white/10 object-cover" />
                <input
                  value={url}
                  onChange={(e) => set("images", form.images.map((u, j) => (j === i ? e.target.value : u)))}
                  className={inputCls}
                  aria-label={`Gallery image ${i + 1}`}
                />
                <button
                  type="button"
                  onClick={() => set("images", form.images.filter((_, j) => j !== i))}
                  aria-label="Remove image"
                  className="grid size-9 shrink-0 place-items-center rounded-lg text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
            {form.images.length < 10 && (
              <button
                type="button"
                onClick={() => set("images", [...form.images, ""])}
                className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-white/15 px-3.5 py-2 text-xs font-semibold text-zinc-400 transition-colors hover:border-champagne-400/50 hover:text-champagne-300"
              >
                <Plus className="size-3.5" /> Add image URL
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── 3D model ───────────────────────────────────────────── */}
      <section className="glass mt-6 rounded-3xl p-6 md:p-8" aria-label="3D model">
        <h2 className="font-display text-sm font-semibold tracking-[0.24em] text-champagne-400 uppercase">3D model</h2>
        <p className="mt-2 text-xs leading-relaxed text-zinc-500">
          Priority: Sketchfab embed → uploaded GLB/GLTF → the procedural studio car rendered in the
          factory paint above.
        </p>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Sketchfab model URL</span>
            <input
              value={form.sketchfabUrl ?? ""}
              onChange={(e) => set("sketchfabUrl", e.target.value)}
              placeholder="https://sketchfab.com/3d-models/…"
              className={cn(inputCls, "mt-2")}
            />
          </label>
          <div>
            <span className={labelCls}>Or local GLB / GLTF</span>
            <div className="mt-2 flex gap-2">
              <input
                value={form.modelPath ?? ""}
                onChange={(e) => set("modelPath", e.target.value)}
                placeholder="/api/uploads/model.glb"
                className={inputCls}
                aria-label="Model path"
              />
              <input ref={modelInputRef} type="file" accept=".glb,.gltf" hidden onChange={(e) => onUpload("model", e.target.files)} />
              <button
                type="button"
                disabled={uploading !== null}
                onClick={() => modelInputRef.current?.click()}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 px-4 text-xs font-bold tracking-widest text-zinc-300 uppercase transition-colors hover:border-champagne-400/50 hover:text-champagne-300 disabled:opacity-50"
              >
                {uploading === "model" ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                Upload
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Specs ──────────────────────────────────────────────── */}
      <section className="glass mt-6 rounded-3xl p-6 md:p-8" aria-label="Specifications">
        <h2 className="font-display text-sm font-semibold tracking-[0.24em] text-champagne-400 uppercase">Technical specifications</h2>
        <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
          {specFields.map((f) => (
            <label key={f.key} className="block">
              <span className={labelCls}>{f.label}</span>
              <input
                type={f.type}
                step={f.step}
                value={specs[f.key] ?? ""}
                onChange={(e) => setSpecs((s) => ({ ...s, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className={cn(inputCls, "mt-2")}
              />
            </label>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
      <section className="glass mt-6 rounded-3xl p-6 md:p-8" aria-label="Features">
        <h2 className="font-display text-sm font-semibold tracking-[0.24em] text-champagne-400 uppercase">Signature features</h2>
        <div className="mt-4 flex gap-2">
          <input
            value={featureDraft}
            onChange={(e) => setFeatureDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addFeature();
              }
            }}
            placeholder="Type a feature and press Enter…"
            className={inputCls}
          />
          <button
            type="button"
            onClick={addFeature}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-champagne-400/40 px-4 text-xs font-bold tracking-widest text-champagne-300 uppercase transition-colors hover:bg-champagne-400 hover:text-obsidian-950"
          >
            <Plus className="size-3.5" /> Add
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {features.map((feature) => (
            <span key={feature} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] py-1.5 pr-2 pl-4 text-xs text-zinc-300">
              {feature}
              <button
                type="button"
                onClick={() => setFeatures((f) => f.filter((x) => x !== feature))}
                aria-label={`Remove ${feature}`}
                className="grid size-5 place-items-center rounded-full text-zinc-500 hover:bg-red-500/15 hover:text-red-400"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          {features.length === 0 && <p className="text-xs text-zinc-600">No features added yet.</p>}
        </div>
      </section>

      <div className="mt-8 flex justify-end gap-3">
        <Link
          to="/admin"
          className="rounded-full border border-white/10 px-6 py-3 text-sm font-semibold text-zinc-300 transition-colors hover:border-white/30"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-champagne-400 px-8 py-3 text-sm font-bold tracking-[0.12em] text-obsidian-950 uppercase transition-colors hover:bg-champagne-300 disabled:opacity-60"
        >
          {saving && <Loader2 className="size-4 animate-spin" />}
          {mode === "create" ? "Add to collection" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
