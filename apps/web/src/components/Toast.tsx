"use client";

import { useEffect } from "react";

/** Auto-dismissing success toast — confirmation the action actually happened. */
export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3200);
    return () => clearTimeout(t);
  }, [message, onClose]);
  return <div className="toast">✓ {message}</div>;
}
