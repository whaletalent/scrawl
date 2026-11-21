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
      className="w-full rounded-lg bg-white"
      style={{ aspectRatio: "800 / 600" }}
    />
  );
  if (!onSelect) return image;
  return (
    <button
      onClick={onSelect}
      className="block w-full rounded-lg hover:ring-2 hover:ring-purple-500 focus-visible:ring-2 focus-visible:ring-purple-500 outline-none transition-shadow"
    >
      {image}
    </button>
  );
}

/** Who drew it, the theme (party) and when. */
export function DrawingCaption({ drawing }: { drawing: GalleryDrawing }) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <Authors
        className="text-gray-200"
        authors={drawing.authors.map((a) => ({
          name: a.name,
          avatarUrl: a.avatarUrl,
        }))}
      />
      {drawing.theme && <p className="text-gray-400">"{drawing.theme}"</p>}
      <p className="text-xs text-gray-500">
        {MODE_LABEL[drawing.gameMode]} ·{" "}
        {new Date(drawing.createdAt).toLocaleDateString("pt-BR")}
      </p>
    </div>
  );
}
