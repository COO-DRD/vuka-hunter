"use client";

import { SignUp } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <SignUp
        appearance={{
          baseTheme: dark,
          variables: {
            colorPrimary:         "#F59E0B",
            colorBackground:      "#18181B",
            colorText:            "#F4F4F5",
            colorInputBackground: "#09090B",
            colorInputText:       "#F4F4F5",
            borderRadius:         "0.75rem",
            fontFamily:           "var(--font-geist-sans)",
          },
          elements: {
            card:              "bg-zinc-900 border border-zinc-800 shadow-xl",
            headerTitle:       "text-zinc-100 font-black",
            headerSubtitle:    "text-zinc-400",
            formButtonPrimary: "bg-amber-500 hover:bg-amber-600 text-black font-bold",
            footerActionLink:  "text-amber-400 hover:text-amber-300",
            formFieldInput:    "bg-zinc-950 border-zinc-700 text-zinc-100",
          },
        }}
      />
    </div>
  );
}
