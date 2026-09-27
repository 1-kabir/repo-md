"use client";

import { useState } from "react";

export default function CopyButton({
  text,
  label = "Copy command",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      className={`copy-btn${copied ? " is-copied" : ""}`}
      onClick={copy}
      aria-label={copied ? "Copied" : label}
    >
      {copied ? "copied ✓" : "copy"}
    </button>
  );
}
