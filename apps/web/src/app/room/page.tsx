import { Suspense } from "react";
import { RoomClient } from "./room-client";

export default function RoomPage() {
  // useSearchParams() needs a Suspense boundary in a static export.
  return (
    <Suspense>
      <RoomClient />
    </Suspense>
  );
}
