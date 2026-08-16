import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, MonitorCog, CarFront, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { adminApi } from "@/lib/admin-auth";

type CarOption = {
  id: number;
  name: string;
  year: number;
  brandName: string;
};

export function WebsiteContentPage() {
  const navigate = useNavigate();

  const [cars, setCars] = useState<CarOption[]>([]);
  const [heroCarId, setHeroCarId] = useState("");
  const [initialHeroCarId, setInitialHeroCarId] = useState("");
  const [featuredCarIds, setFeaturedCarIds] =
  useState(["", "", ""]);

const [initialFeaturedCarIds, setInitialFeaturedCarIds] =
  useState(["", "", ""]);

const [savingFeatured, setSavingFeatured] =
  useState(false);
  const [featuredEyebrow, setFeaturedEyebrow] =
  useState("");

const [featuredTitle, setFeaturedTitle] =
  useState("");

const [featuredLinkText, setFeaturedLinkText] =
  useState("");

const [initialFeaturedText, setInitialFeaturedText] =
  useState({
    eyebrow: "",
    title: "",
    linkText: "",
  });

const [savingFeaturedText, setSavingFeaturedText] =
  useState(false);
  const [editorialContent, setEditorialContent] = useState({
  eyebrow: "The Veloce Standard",
  titleBefore: "Obsessive curation,",
  titleAccent: "uncompromising",
  titleAfter: "care",

  imageUrl:
    "https://images.pexels.com/photos/12959473/pexels-photo-12959473.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",

  certificationNumber: "120+",
  certificationLabel: "Point certification",

  item1Title: "Concierge Authentication",
  item1Text:
    "Every vehicle is inspected, verified and certified by our master technicians before entering the collection.",

  item2Title: "Complete Provenance",
  item2Text:
    "Full documented history, service records and originality reports accompany each machine.",

  item3Title: "Global Delivery",
  item3Text:
    "Enclosed transport, customs handling and white-glove handover anywhere in the world.",
});

const [initialEditorialContent, setInitialEditorialContent] =
  useState(editorialContent);

const [savingEditorial, setSavingEditorial] =
  useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);


  useEffect(() => {
    async function loadPage() {
      try {
        /*
         * 1. Check current admin + permissions
         */
        const meResponse =
          await adminApi.get("/api/admin/me");

        const permissions: string[] =
          meResponse.data.data?.permissions ?? [];

        if (
          !permissions.includes(
            "site_content.edit"
          )
        ) {
          toast.error(
            "You do not have permission to edit website content"
          );

          navigate("/admin", {
            replace: true,
          });

          return;
        }

        /*
         * 2. Load available cars
         * 3. Load current site settings
         */
        const [
          carsResponse,
          settingsResponse,
        ] = await Promise.all([
          axios.get(
            "/api/cars?limit=200"
          ),

          axios.get(
            "/api/site-settings"
          ),
        ]);

        setCars(
          carsResponse.data.data ?? []
        );

        const currentHeroCarId =
          settingsResponse.data.data
            ?.heroCarId;

        const value =
          currentHeroCarId !== null &&
          currentHeroCarId !== undefined
            ? String(currentHeroCarId)
            : "";

        setHeroCarId(value);
        setInitialHeroCarId(value);

        const featuredValues = [
              settingsResponse.data.data?.featuredCar1Id,
              settingsResponse.data.data?.featuredCar2Id,
              settingsResponse.data.data?.featuredCar3Id,
            ].map((id) =>
              id !== null && id !== undefined
                ? String(id)
                : ""
            );

            setFeaturedCarIds(featuredValues);
            setInitialFeaturedCarIds(featuredValues);
            const featuredEyebrowValue =
  settingsResponse.data.data?.featuredEyebrow ??
  "The Collection";

const featuredTitleValue =
  settingsResponse.data.data?.featuredTitle ??
  "Featured machines";

const featuredLinkTextValue =
  settingsResponse.data.data?.featuredLinkText ??
  "View full collection";


setFeaturedEyebrow(featuredEyebrowValue);
setFeaturedTitle(featuredTitleValue);
setFeaturedLinkText(featuredLinkTextValue);

setInitialFeaturedText({
  eyebrow: featuredEyebrowValue,
  title: featuredTitleValue,
  linkText: featuredLinkTextValue,
});
const editorialValue = {
  eyebrow:
    settingsResponse.data.data?.editorialEyebrow ??
    "The Veloce Standard",

  titleBefore:
    settingsResponse.data.data?.editorialTitleBefore ??
    "Obsessive curation,",

  titleAccent:
    settingsResponse.data.data?.editorialTitleAccent ??
    "uncompromising",

  titleAfter:
    settingsResponse.data.data?.editorialTitleAfter ??
    "care",

  imageUrl:
    settingsResponse.data.data?.editorialImageUrl ??
    "https://images.pexels.com/photos/12959473/pexels-photo-12959473.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",

  certificationNumber:
    settingsResponse.data.data?.editorialCertificationNumber ??
    "120+",

  certificationLabel:
    settingsResponse.data.data?.editorialCertificationLabel ??
    "Point certification",

  item1Title:
    settingsResponse.data.data?.editorialItem1Title ??
    "Concierge Authentication",

  item1Text:
    settingsResponse.data.data?.editorialItem1Text ??
    "Every vehicle is inspected, verified and certified by our master technicians before entering the collection.",

  item2Title:
    settingsResponse.data.data?.editorialItem2Title ??
    "Complete Provenance",

  item2Text:
    settingsResponse.data.data?.editorialItem2Text ??
    "Full documented history, service records and originality reports accompany each machine.",

  item3Title:
    settingsResponse.data.data?.editorialItem3Title ??
    "Global Delivery",

  item3Text:
    settingsResponse.data.data?.editorialItem3Text ??
    "Enclosed transport, customs handling and white-glove handover anywhere in the world.",
};

setEditorialContent(editorialValue);
setInitialEditorialContent(editorialValue);

      } catch (error) {
        console.error(
          "Could not load website content:",
          error
        );

        toast.error(
          "Could not load website content"
        );

        navigate("/admin", {
          replace: true,
        });

      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, [navigate]);


  async function saveHeroVehicle() {
    if (!heroCarId) {
      toast.error(
        "Please select a hero vehicle"
      );

      return;
    }

    setSaving(true);

    try {
      await adminApi.put(
        "/api/site-settings/hero-car",
        {
          heroCarId:
            Number(heroCarId),
        }
      );

      setInitialHeroCarId(
        heroCarId
      );

      toast.success(
        "Hero vehicle updated"
      );

    } catch (error) {
      const message =
        axios.isAxiosError(error)
          ? error.response?.data?.error ??
            "Could not update hero vehicle"
          : "Could not update hero vehicle";

      toast.error(message);

    } finally {
      setSaving(false);
    }
  }

  async function saveFeaturedVehicles() {
  if (
    featuredCarIds.some((id) => !id)
  ) {
    toast.error(
      "Please select all three featured vehicles"
    );
    return;
  }

  if (
    new Set(featuredCarIds).size !== 3
  ) {
    toast.error(
      "Featured vehicles must be different"
    );
    return;
  }

  setSavingFeatured(true);

  try {
    await adminApi.put(
      "/api/site-settings/featured-cars",
      {
        featuredCarIds:
          featuredCarIds.map(Number),
      }
    );

    setInitialFeaturedCarIds(
      [...featuredCarIds]
    );

    toast.success(
      "Featured vehicles updated"
    );

  } catch (error) {
    const message =
      axios.isAxiosError(error)
        ? error.response?.data?.error ??
          "Could not update featured vehicles"
        : "Could not update featured vehicles";

    toast.error(message);

  } finally {
    setSavingFeatured(false);
  }
}

async function saveFeaturedText() {
  if (!featuredEyebrow.trim()) {
    toast.error("Featured eyebrow is required");
    return;
  }

  if (!featuredTitle.trim()) {
    toast.error("Featured title is required");
    return;
  }

  if (!featuredLinkText.trim()) {
    toast.error("Featured link text is required");
    return;
  }

  setSavingFeaturedText(true);

  try {
    await adminApi.put(
      "/api/site-settings/featured-text",
      {
        featuredEyebrow: featuredEyebrow.trim(),
        featuredTitle: featuredTitle.trim(),
        featuredLinkText: featuredLinkText.trim(),
      }
    );

    setInitialFeaturedText({
      eyebrow: featuredEyebrow.trim(),
      title: featuredTitle.trim(),
      linkText: featuredLinkText.trim(),
    });

    toast.success("Featured text updated");

  } catch (error) {
    const message =
      axios.isAxiosError(error)
        ? error.response?.data?.error ??
          "Could not update featured text"
        : "Could not update featured text";

    toast.error(message);

  } finally {
    setSavingFeaturedText(false);
  }
}

async function saveEditorialContent() {
  setSavingEditorial(true);

  try {
    await adminApi.put(
      "/api/site-settings/editorial",
      {
        editorialEyebrow:
          editorialContent.eyebrow.trim(),

        editorialTitleBefore:
          editorialContent.titleBefore.trim(),

        editorialTitleAccent:
          editorialContent.titleAccent.trim(),

        editorialTitleAfter:
          editorialContent.titleAfter.trim(),

        editorialImageUrl:
          editorialContent.imageUrl.trim(),

        editorialCertificationNumber:
          editorialContent.certificationNumber.trim(),

        editorialCertificationLabel:
          editorialContent.certificationLabel.trim(),

        editorialItem1Title:
          editorialContent.item1Title.trim(),

        editorialItem1Text:
          editorialContent.item1Text.trim(),

        editorialItem2Title:
          editorialContent.item2Title.trim(),

        editorialItem2Text:
          editorialContent.item2Text.trim(),

        editorialItem3Title:
          editorialContent.item3Title.trim(),

        editorialItem3Text:
          editorialContent.item3Text.trim(),
      }
    );

    setInitialEditorialContent({
      ...editorialContent,
    });

    toast.success(
      "Editorial content updated"
    );

  } catch (error) {
    const message =
      axios.isAxiosError(error)
        ? error.response?.data?.error ??
          "Could not update editorial content"
        : "Could not update editorial content";

    toast.error(message);

  } finally {
    setSavingEditorial(false);
  }
}


  if (loading) {
    return (
      <div className="min-h-screen bg-obsidian-950 pt-40 text-center text-zinc-500">
        Loading website content...
      </div>
    );
  }


  const hasChanges =
    heroCarId !== initialHeroCarId;


  return (
    <div className="min-h-screen bg-obsidian-950 px-5 pb-20 pt-28 text-white">
      <div className="mx-auto max-w-5xl">

        {/* Back */}
        <button
          type="button"
          onClick={() =>
            navigate("/admin")
          }
          className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Back to Admin
        </button>


        {/* Header */}
        <div className="border-b border-white/10 pb-8">
          <div className="flex items-center gap-3">
            <MonitorCog className="size-5 text-champagne-400" />

            <p className="text-xs font-semibold tracking-[0.22em] text-champagne-400 uppercase">
              CMS
            </p>
          </div>

          <h1 className="mt-3 font-display text-4xl font-bold md:text-5xl">
            Website Content
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            Manage the content and vehicles displayed across the public website.
          </p>
        </div>


        {/* Home Page */}
        <section className="mt-10">
          <p className="text-xs font-semibold tracking-[0.2em] text-zinc-500 uppercase">
            Home Page
          </p>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.025] p-6 md:p-8">

            <div className="flex items-start gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                <CarFront className="size-5 text-champagne-400" />
              </div>

              <div>
                <h2 className="font-display text-xl font-semibold">
                  Hero Vehicle
                </h2>

                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  Choose the vehicle displayed as the main vehicle on the homepage.
                </p>
              </div>
            </div>


            <div className="mt-7">
              <label
                htmlFor="hero-car"
                className="mb-2 block text-xs font-semibold tracking-[0.15em] text-zinc-500 uppercase"
              >
                Main Hero Vehicle
              </label>

              <select
                id="hero-car"
                value={heroCarId}
                onChange={(e) =>
                  setHeroCarId(
                    e.target.value
                  )
                }
                disabled={saving}
                className="w-full rounded-xl border border-white/10 bg-obsidian-900 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-champagne-400/50 disabled:opacity-50"
              >
                <option value="">
                  Select a vehicle
                </option>

                {cars.map((car) => {
                  const normalizedName =
                    car.name
                      .replace(
                        new RegExp(
                          `^${car.year}\\s+`,
                          "i"
                        ),
                        ""
                      )
                      .replace(
                        new RegExp(
                          `^${car.brandName}\\s+`,
                          "i"
                        ),
                        ""
                      )
                      .trim();

                  return (
                    <option
                      key={car.id}
                      value={car.id}
                    >
                      {car.year} {car.brandName} {normalizedName}
                    </option>
                  );
                })}
              </select>

              <p className="mt-3 text-xs leading-5 text-zinc-600">
                The selected vehicle is stored in the CMS and will be used as the homepage hero vehicle.
              </p>
            </div>


            <div className="mt-7 flex justify-end">
              <button
                type="button"
                onClick={
                  saveHeroVehicle
                }
                disabled={
                  saving ||
                  !heroCarId ||
                  !hasChanges
                }
                className="inline-flex items-center gap-2 rounded-full bg-champagne-400 px-6 py-2.5 text-xs font-bold tracking-[0.12em] text-black uppercase transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving && (
                  <Loader2 className="size-4 animate-spin" />
                )}

                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>
            </div>

          </div>
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.025] p-6 md:p-8">

  <div className="flex items-start gap-4">
    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
      <CarFront className="size-5 text-champagne-400" />
    </div>

    <div>
      <h2 className="font-display text-xl font-semibold">
        Featured Vehicles
      </h2>

      <p className="mt-1 text-sm leading-6 text-zinc-500">
        Choose the three vehicles displayed in the Featured Machines section.
      </p>
    </div>
  </div>

  <div className="mt-7 grid gap-4 md:grid-cols-3">
    {featuredCarIds.map((selectedId, index) => (
      <div key={index}>
        <label
          htmlFor={`featured-car-${index}`}
          className="mb-2 block text-xs font-semibold tracking-[0.15em] text-zinc-500 uppercase"
        >
          Featured Vehicle {index + 1}
        </label>

        <select
          id={`featured-car-${index}`}
          value={selectedId}
          onChange={(e) => {
            const next = [...featuredCarIds];
            next[index] = e.target.value;
            setFeaturedCarIds(next);
          }}
          disabled={savingFeatured}
          className="w-full rounded-xl border border-white/10 bg-obsidian-900 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-champagne-400/50 disabled:opacity-50"
        >
          <option value="">
            Select a vehicle
          </option>

          {cars.map((car) => {
            const normalizedName =
              car.name
                .replace(
                  new RegExp(
                    `^${car.year}\\s+`,
                    "i"
                  ),
                  ""
                )
                .replace(
                  new RegExp(
                    `^${car.brandName}\\s+`,
                    "i"
                  ),
                  ""
                )
                .trim();

            return (
              <option
                key={car.id}
                value={car.id}
              >
                {car.year} {car.brandName} {normalizedName}
              </option>
            );
          })}
        </select>
      </div>
    ))}
  </div>

  <div className="mt-7 flex justify-end">
    <button
      type="button"
      onClick={saveFeaturedVehicles}
      disabled={
        savingFeatured ||
        featuredCarIds.some((id) => !id) ||
        featuredCarIds.every(
          (id, index) =>
            id === initialFeaturedCarIds[index]
        )
      }
      className="inline-flex items-center gap-2 rounded-full bg-champagne-400 px-6 py-2.5 text-xs font-bold tracking-[0.12em] text-black uppercase transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
    >
      {savingFeatured && (
        <Loader2 className="size-4 animate-spin" />
      )}

      {savingFeatured
        ? "Saving..."
        : "Save Featured"}
    </button>
  </div>
  
</div>
<div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.025] p-6 md:p-8">

  <div className="flex items-start gap-4">
    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
      <MonitorCog className="size-5 text-champagne-400" />
    </div>

    <div>
      <h2 className="font-display text-xl font-semibold">
        Featured Section Text
      </h2>

      <p className="mt-1 text-sm leading-6 text-zinc-500">
        Edit the text displayed above the featured vehicle collection.
      </p>
    </div>
  </div>

  <div className="mt-7 grid gap-5">

    <div>
      <label
        htmlFor="featured-eyebrow"
        className="mb-2 block text-xs font-semibold tracking-[0.15em] text-zinc-500 uppercase"
      >
        Eyebrow Text
      </label>

      <input
        id="featured-eyebrow"
        type="text"
        value={featuredEyebrow}
        onChange={(e) =>
          setFeaturedEyebrow(e.target.value)
        }
        disabled={savingFeaturedText}
        className="w-full rounded-xl border border-white/10 bg-obsidian-900 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-champagne-400/50 disabled:opacity-50"
      />
    </div>

    <div>
      <label
        htmlFor="featured-title"
        className="mb-2 block text-xs font-semibold tracking-[0.15em] text-zinc-500 uppercase"
      >
        Section Title
      </label>

      <input
        id="featured-title"
        type="text"
        value={featuredTitle}
        onChange={(e) =>
          setFeaturedTitle(e.target.value)
        }
        disabled={savingFeaturedText}
        className="w-full rounded-xl border border-white/10 bg-obsidian-900 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-champagne-400/50 disabled:opacity-50"
      />
    </div>

    <div>
      <label
        htmlFor="featured-link-text"
        className="mb-2 block text-xs font-semibold tracking-[0.15em] text-zinc-500 uppercase"
      >
        Link Text
      </label>

      <input
        id="featured-link-text"
        type="text"
        value={featuredLinkText}
        onChange={(e) =>
          setFeaturedLinkText(e.target.value)
        }
        disabled={savingFeaturedText}
        className="w-full rounded-xl border border-white/10 bg-obsidian-900 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-champagne-400/50 disabled:opacity-50"
      />
    </div>

  </div>

  <div className="mt-7 flex justify-end">
    <button
      type="button"
      onClick={saveFeaturedText}
      disabled={
        savingFeaturedText ||
        !featuredEyebrow.trim() ||
        !featuredTitle.trim() ||
        !featuredLinkText.trim() ||
        (
          featuredEyebrow === initialFeaturedText.eyebrow &&
          featuredTitle === initialFeaturedText.title &&
          featuredLinkText === initialFeaturedText.linkText
        )
      }
      className="inline-flex items-center gap-2 rounded-full bg-champagne-400 px-6 py-2.5 text-xs font-bold tracking-[0.12em] text-black uppercase transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
    >
      {savingFeaturedText && (
        <Loader2 className="size-4 animate-spin" />
      )}

      {savingFeaturedText
        ? "Saving..."
        : "Save Text"}
    </button>
  </div>

</div>
<div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.025] p-6 md:p-8">

  <div className="flex items-start gap-4">
    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
      <MonitorCog className="size-5 text-champagne-400" />
    </div>

    <div>
      <h2 className="font-display text-xl font-semibold">
        Editorial Section
      </h2>

      <p className="mt-1 text-sm leading-6 text-zinc-500">
        Edit the editorial content displayed on the homepage.
      </p>
    </div>
    
  </div>
  <div className="mt-7 grid gap-5">

  <div>
    <label
      className="mb-2 block text-xs font-semibold tracking-[0.15em] text-zinc-500 uppercase"
    >
      Eyebrow
    </label>

    <input
      type="text"
      value={editorialContent.eyebrow}
      onChange={(e) =>
        setEditorialContent({
          ...editorialContent,
          eyebrow: e.target.value,
        })
      }
      disabled={savingEditorial}
      className="w-full rounded-xl border border-white/10 bg-obsidian-900 px-4 py-3 text-sm text-white outline-none focus:border-champagne-400/50 disabled:opacity-50"
    />
  </div>


  <div>
    <label
      className="mb-2 block text-xs font-semibold tracking-[0.15em] text-zinc-500 uppercase"
    >
      Title Before Accent
    </label>

    <input
      type="text"
      value={editorialContent.titleBefore}
      onChange={(e) =>
        setEditorialContent({
          ...editorialContent,
          titleBefore: e.target.value,
        })
      }
      disabled={savingEditorial}
      className="w-full rounded-xl border border-white/10 bg-obsidian-900 px-4 py-3 text-sm text-white outline-none focus:border-champagne-400/50 disabled:opacity-50"
    />
  </div>


  <div>
    <label
      className="mb-2 block text-xs font-semibold tracking-[0.15em] text-zinc-500 uppercase"
    >
      Accent Text
    </label>

    <input
      type="text"
      value={editorialContent.titleAccent}
      onChange={(e) =>
        setEditorialContent({
          ...editorialContent,
          titleAccent: e.target.value,
        })
      }
      disabled={savingEditorial}
      className="w-full rounded-xl border border-white/10 bg-obsidian-900 px-4 py-3 text-sm text-white outline-none focus:border-champagne-400/50 disabled:opacity-50"
    />
  </div>


  <div>
    <label
      className="mb-2 block text-xs font-semibold tracking-[0.15em] text-zinc-500 uppercase"
    >
      Title After Accent
    </label>

    <input
      type="text"
      value={editorialContent.titleAfter}
      onChange={(e) =>
        setEditorialContent({
          ...editorialContent,
          titleAfter: e.target.value,
        })
      }
      disabled={savingEditorial}
      className="w-full rounded-xl border border-white/10 bg-obsidian-900 px-4 py-3 text-sm text-white outline-none focus:border-champagne-400/50 disabled:opacity-50"
    />
  </div>


  <div>
  <label
    className="mb-2 block text-xs font-semibold tracking-[0.15em] text-zinc-500 uppercase"
  >
    Image URL
  </label>

  <input
    type="text"
    value={editorialContent.imageUrl}
    onChange={(e) =>
      setEditorialContent({
        ...editorialContent,
        imageUrl: e.target.value,
      })
    }
    disabled={savingEditorial}
    className="w-full rounded-xl border border-white/10 bg-obsidian-900 px-4 py-3 text-sm text-white outline-none focus:border-champagne-400/50 disabled:opacity-50"
  />
</div>


{/* ضيفي من هون */}

<div>
  <label
    className="mb-2 block text-xs font-semibold tracking-[0.15em] text-zinc-500 uppercase"
  >
    Certification Number
  </label>

  <input
    type="text"
    value={editorialContent.certificationNumber}
    onChange={(e) =>
      setEditorialContent({
        ...editorialContent,
        certificationNumber: e.target.value,
      })
    }
    disabled={savingEditorial}
    className="w-full rounded-xl border border-white/10 bg-obsidian-900 px-4 py-3 text-sm text-white outline-none focus:border-champagne-400/50 disabled:opacity-50"
  />
</div>

<div>
  <label
    className="mb-2 block text-xs font-semibold tracking-[0.15em] text-zinc-500 uppercase"
  >
    Certification Label
  </label>

  <input
    type="text"
    value={editorialContent.certificationLabel}
    onChange={(e) =>
      setEditorialContent({
        ...editorialContent,
        certificationLabel: e.target.value,
      })
    }
    disabled={savingEditorial}
    className="w-full rounded-xl border border-white/10 bg-obsidian-900 px-4 py-3 text-sm text-white outline-none focus:border-champagne-400/50 disabled:opacity-50"
  />
</div>

{/* FEATURE 1 */}
<div className="border-t border-white/10 pt-6">
  <p className="mb-4 text-xs font-semibold tracking-[0.18em] text-champagne-400 uppercase">
    Feature 01
  </p>

  <label className="mb-2 block text-xs font-semibold tracking-[0.15em] text-zinc-500 uppercase">
    Title
  </label>

  <input
    type="text"
    value={editorialContent.item1Title}
    onChange={(e) =>
      setEditorialContent({
        ...editorialContent,
        item1Title: e.target.value,
      })
    }
    disabled={savingEditorial}
    className="w-full rounded-xl border border-white/10 bg-obsidian-900 px-4 py-3 text-sm text-white outline-none focus:border-champagne-400/50 disabled:opacity-50"
  />

  <label className="mb-2 mt-4 block text-xs font-semibold tracking-[0.15em] text-zinc-500 uppercase">
    Text
  </label>

  <textarea
    value={editorialContent.item1Text}
    onChange={(e) =>
      setEditorialContent({
        ...editorialContent,
        item1Text: e.target.value,
      })
    }
    disabled={savingEditorial}
    rows={3}
    className="w-full resize-none rounded-xl border border-white/10 bg-obsidian-900 px-4 py-3 text-sm text-white outline-none focus:border-champagne-400/50 disabled:opacity-50"
  />
</div>


{/* FEATURE 2 */}
<div className="border-t border-white/10 pt-6">
  <p className="mb-4 text-xs font-semibold tracking-[0.18em] text-champagne-400 uppercase">
    Feature 02
  </p>

  <label className="mb-2 block text-xs font-semibold tracking-[0.15em] text-zinc-500 uppercase">
    Title
  </label>

  <input
    type="text"
    value={editorialContent.item2Title}
    onChange={(e) =>
      setEditorialContent({
        ...editorialContent,
        item2Title: e.target.value,
      })
    }
    disabled={savingEditorial}
    className="w-full rounded-xl border border-white/10 bg-obsidian-900 px-4 py-3 text-sm text-white outline-none focus:border-champagne-400/50 disabled:opacity-50"
  />

  <label className="mb-2 mt-4 block text-xs font-semibold tracking-[0.15em] text-zinc-500 uppercase">
    Text
  </label>

  <textarea
    value={editorialContent.item2Text}
    onChange={(e) =>
      setEditorialContent({
        ...editorialContent,
        item2Text: e.target.value,
      })
    }
    disabled={savingEditorial}
    rows={3}
    className="w-full resize-none rounded-xl border border-white/10 bg-obsidian-900 px-4 py-3 text-sm text-white outline-none focus:border-champagne-400/50 disabled:opacity-50"
  />
</div>


{/* FEATURE 3 */}
<div className="border-t border-white/10 pt-6">
  <p className="mb-4 text-xs font-semibold tracking-[0.18em] text-champagne-400 uppercase">
    Feature 03
  </p>

  <label className="mb-2 block text-xs font-semibold tracking-[0.15em] text-zinc-500 uppercase">
    Title
  </label>

  <input
    type="text"
    value={editorialContent.item3Title}
    onChange={(e) =>
      setEditorialContent({
        ...editorialContent,
        item3Title: e.target.value,
      })
    }
    disabled={savingEditorial}
    className="w-full rounded-xl border border-white/10 bg-obsidian-900 px-4 py-3 text-sm text-white outline-none focus:border-champagne-400/50 disabled:opacity-50"
  />

  <label className="mb-2 mt-4 block text-xs font-semibold tracking-[0.15em] text-zinc-500 uppercase">
    Text
  </label>

  <textarea
    value={editorialContent.item3Text}
    onChange={(e) =>
      setEditorialContent({
        ...editorialContent,
        item3Text: e.target.value,
      })
    }
    disabled={savingEditorial}
    rows={3}
    className="w-full resize-none rounded-xl border border-white/10 bg-obsidian-900 px-4 py-3 text-sm text-white outline-none focus:border-champagne-400/50 disabled:opacity-50"
  />
</div>


{/* SAVE BUTTON */}
<div className="flex justify-end border-t border-white/10 pt-6">
  <button
    type="button"
    onClick={saveEditorialContent}
    disabled={
      savingEditorial ||
      JSON.stringify(editorialContent) ===
        JSON.stringify(initialEditorialContent)
    }
    className="inline-flex items-center gap-2 rounded-full bg-champagne-400 px-6 py-2.5 text-xs font-bold tracking-[0.12em] text-black uppercase transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
  >
    {savingEditorial && (
      <Loader2 className="size-4 animate-spin" />
    )}

    {savingEditorial
      ? "Saving..."
      : "Save Editorial"}
  </button>
</div>


</div>

</div>


        </section>

      </div>
    </div>
    
  );
  
}