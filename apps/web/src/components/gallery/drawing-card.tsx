import { Authors } from "@/components/account/authors";
import { MODE_LABEL, authorsLabel, type GalleryDrawing } from "@/lib/gallery";

/** A gallery drawing as a thumbnail; a button when `onSelect` is given. */
export function DrawingCard({
  drawing,
  onSelect,
}: {
  drawing: GalleryDrawing;
  onSelect?: () => void;
}) {
  const image = (
    <img
      src={drawing.imageUrl}
      alt={`Desenho de ${authorsLabel(drawing)}`}
      loading="lazy"
      className="w-full bg-white"
      style={{ aspectRatio: "800 / 600" }}
    />
  );
  if (!onSelect) return image;
  return (
    <button
      onClick={onSelect}
      className="block w-full outline-none ring-brand hover:ring-4 focus-visible:ring-4"
    >
      {image}
    </button>
  );
}

/** Who drew it, the theme (party) and when. */
export function DrawingCaption({ drawing }: { drawing: GalleryDrawing }) {
  return (
    <div className="flex flex-col gap-1">
      <Authors
        className="text-ink"
        authors={drawing.authors.map((a) => ({
          name: a.name,
          avatarUrl: a.avatarUrl,
        }))}
      />
      {drawing.theme && (
        <p className="font-display font-bold text-lg leading-tight">
          "{drawing.theme}"
        </p>
      )}
      <p className="text-sm text-muted">
        {MODE_LABEL[drawing.gameMode]} ·{" "}
        {new Date(drawing.createdAt).toLocaleDateString("pt-BR")}
      </p>
    </div>
  );
}
