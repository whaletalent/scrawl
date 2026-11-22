"use client";
import { useRouter } from "next/navigation";
import { AccountPage } from "@/components/account/account-page";
import { AvatarEditor } from "@/components/account/avatar-editor";
import { accountErrorMessage, saveAvatar } from "@/lib/account";

export default function AvatarPage() {
  const router = useRouter();
  return (
    <AccountPage for="ready" title="Redesenhar avatar" wide>
      {({ refresh }) => (
        <AvatarEditor
          saveLabel="Salvar avatar"
          onSave={async (png) => {
            const failed = await saveAvatar(png);
            if (failed) return accountErrorMessage(failed);
            await refresh();
            router.push("/profile/");
            return null;
          }}
        />
      )}
    </AccountPage>
  );
}
