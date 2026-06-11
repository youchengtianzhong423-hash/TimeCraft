"use client";

import { useEffect, useState } from "react";
import { HelpCircle, X } from "lucide-react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";

const ROWS = [
  { action: "元に戻す", win: "Ctrl + Z", mac: "Command + Z" },
  { action: "やり直す", win: "Ctrl + Y / Ctrl + Shift + Z", mac: "Command + Shift + Z" },
  { action: "ボックス複製", win: "Alt + ドラッグ", mac: "Option + ドラッグ" },
  { action: "ボックス編集", win: "ダブルクリック", mac: "ダブルクリック" },
  { action: "選択中ボックス削除", win: "Delete / Backspace", mac: "Delete / Backspace" },
  { action: "操作キャンセル", win: "Escape", mac: "Escape" },
  { action: "横方向複製", win: "左右ハンドルをドラッグ", mac: "左右ハンドルをドラッグ" },
  { action: "時間変更", win: "上下端をドラッグ", mac: "上下端をドラッグ" },
] as const;

export function ShortcutHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-white text-muted hover:text-slate-700 hover:bg-slate-50 transition-colors"
        title="操作方法・ショートカット"
        aria-label="操作方法・ショートカット"
      >
        <HelpCircle size={16} />
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="操作方法・ショートカット"
        size="md"
      >
        <div className="space-y-4 text-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="py-2 pr-3 font-medium">操作</th>
                  <th className="py-2 pr-3 font-medium">Windows</th>
                  <th className="py-2 font-medium">Mac</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.action} className="border-b border-slate-100">
                    <td className="py-2 pr-3 text-slate-800">{row.action}</td>
                    <td className="py-2 pr-3 text-slate-600 font-mono">
                      {row.win}
                    </td>
                    <td className="py-2 text-slate-600 font-mono">{row.mac}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted leading-relaxed">
            文字入力中は、Delete や Backspace によるボックス削除は実行されません。
          </p>
          <div className="flex justify-end">
            <Button size="sm" variant="secondary" onClick={() => setOpen(false)}>
              <X size={14} />
              閉じる
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
