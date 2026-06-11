"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, X, ListPlus } from "lucide-react";
import { useTimeCraftStore } from "@/store/useTimeCraftStore";
import { BOX_TYPES, getBoxTypeMeta } from "@/lib/boxTypes";
import type { BoxTemplate, BoxType } from "@/lib/types";
import { Button } from "./ui/Button";
import { FieldRow, Input, Textarea } from "./ui/Field";
import { cn } from "@/lib/cn";
import { getLocalDateKey } from "@/lib/date";

interface DraftState {
  id?: string;
  title: string;
  type: BoxType;
  defaultDurationMinutes: number;
  purpose: string;
  memo: string;
}

const emptyDraft = (): DraftState => ({
  title: "",
  type: "priority",
  defaultDurationMinutes: 120,
  purpose: "",
  memo: "",
});

export function TemplatePanel() {
  const templates = useTimeCraftStore((s) => s.templates);
  const addTemplate = useTimeCraftStore((s) => s.addTemplate);
  const updateTemplate = useTimeCraftStore((s) => s.updateTemplate);
  const removeTemplate = useTimeCraftStore((s) => s.removeTemplate);
  const addBox = useTimeCraftStore((s) => s.addBox);
  const bumpTemplateUse = useTimeCraftStore((s) => s.bumpTemplateUse);

  const [editing, setEditing] = useState<DraftState | null>(null);

  const startCreate = () => setEditing(emptyDraft());
  const startEdit = (t: BoxTemplate) =>
    setEditing({
      id: t.id,
      title: t.title,
      type: t.type,
      defaultDurationMinutes: t.defaultDurationMinutes,
      purpose: t.purpose ?? "",
      memo: t.memo ?? "",
    });
  const cancel = () => setEditing(null);

  const submit = () => {
    if (!editing) return;
    const title = editing.title.trim();
    if (!title) return;
    const dur =
      editing.defaultDurationMinutes > 0 ? editing.defaultDurationMinutes : 120;
    const payload = {
      title,
      type: editing.type,
      defaultDurationMinutes: dur,
      purpose: editing.purpose.trim() || undefined,
      memo: editing.memo.trim() || undefined,
    };
    if (editing.id) {
      updateTemplate(editing.id, payload);
    } else {
      addTemplate(payload);
    }
    setEditing(null);
  };

  const addToPoolFromTemplate = (t: BoxTemplate) => {
    const today = getLocalDateKey();
    addBox({
      title: t.title,
      type: t.type,
      date: today,
      startTime: "09:00",
      endTime: "10:00",
      plannedDuration: t.defaultDurationMinutes,
      purpose: t.purpose,
      memo: t.memo,
      repeatRule: "none",
      isPooled: true,
      templateId: t.id,
    });
    bumpTemplateUse(t.id);
  };

  const sorted = [...templates].sort((a, b) => {
    if (a.useCount !== b.useCount) return b.useCount - a.useCount;
    return a.createdAt.localeCompare(b.createdAt);
  });

  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">タスクテンプレート</h3>
          <p className="text-xs text-muted mt-1">
            よく使うタスクを登録しておくと、ボックス作成時に「テンプレートから作成」で
            ワンクリック適用できます。「やることリストに追加」を押せば未配置の状態でリストに置けます。
          </p>
        </div>
        {!editing && (
          <Button size="sm" onClick={startCreate}>
            <Plus size={14} />
            新規
          </Button>
        )}
      </div>

      {editing && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-slate-900">
              {editing.id ? "テンプレートを編集" : "新しいテンプレート"}
            </div>
            <button
              type="button"
              onClick={cancel}
              className="p-1 rounded hover:bg-white/50 text-slate-500"
              aria-label="キャンセル"
            >
              <X size={14} />
            </button>
          </div>

          <div className="space-y-3">
            <FieldRow label="タイトル" required>
              <Input
                placeholder="例：YouTube台本作成 / 朝の散歩"
                value={editing.title}
                onChange={(e) =>
                  setEditing({ ...editing, title: e.target.value })
                }
                autoFocus
              />
            </FieldRow>

            <FieldRow label="ボックス種別" required>
              <div className="grid grid-cols-3 md:grid-cols-3 gap-2">
                {BOX_TYPES.map((t) => {
                  const active = t.type === editing.type;
                  return (
                    <button
                      key={t.type}
                      type="button"
                      onClick={() => setEditing({ ...editing, type: t.type })}
                      className={cn(
                        "px-2.5 py-2 rounded-lg border text-left transition-colors",
                        active
                          ? `${t.bg} ${t.border} ring-2 ring-offset-1 ring-current ${t.text}`
                          : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700",
                      )}
                    >
                      <div className="text-sm font-medium flex items-center gap-1.5">
                        <span>{t.emoji}</span>
                        {t.shortLabel}
                      </div>
                    </button>
                  );
                })}
              </div>
            </FieldRow>

            <FieldRow
              label="既定の所要時間（分）"
              hint="作成時にこの分数で開始・終了時刻が自動セットされます"
            >
              <Input
                type="number"
                min={15}
                step={15}
                value={editing.defaultDurationMinutes}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    defaultDurationMinutes: Number(e.target.value) || 0,
                  })
                }
              />
            </FieldRow>

            <FieldRow label="目的（任意）">
              <Input
                placeholder="例：来月の動画ストック / 健康維持"
                value={editing.purpose}
                onChange={(e) =>
                  setEditing({ ...editing, purpose: e.target.value })
                }
              />
            </FieldRow>

            <FieldRow label="メモ（任意）">
              <Textarea
                placeholder="持ち物、参考リンクなど（テンプレ適用時に引き継がれます）"
                value={editing.memo}
                onChange={(e) =>
                  setEditing({ ...editing, memo: e.target.value })
                }
              />
            </FieldRow>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={cancel}>
              キャンセル
            </Button>
            <Button onClick={submit} disabled={!editing.title.trim()}>
              {editing.id ? "保存" : "追加"}
            </Button>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted">
          まだテンプレートがありません。
          <br />
          「新規」から最初のテンプレートを作成しましょう。
        </div>
      ) : (
        <ul className="space-y-2">
          {sorted.map((t) => {
            const meta = getBoxTypeMeta(t.type);
            const h = Math.floor(t.defaultDurationMinutes / 60);
            const m = t.defaultDurationMinutes % 60;
            const dur = h ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
            return (
              <li
                key={t.id}
                className={cn(
                  "rounded-xl border p-3 flex items-center gap-3",
                  meta.bgSoft,
                  meta.border,
                )}
              >
                <div className="text-2xl shrink-0">{meta.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        "text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded",
                        meta.bg,
                        meta.text,
                      )}
                    >
                      {meta.shortLabel}
                    </span>
                    <span className="font-medium text-slate-900 truncate">
                      {t.title}
                    </span>
                    <span className="text-xs text-muted">{dur}</span>
                    {t.useCount > 0 && (
                      <span className="text-[10px] text-muted">
                        使用 {t.useCount} 回
                      </span>
                    )}
                  </div>
                  {(t.purpose || t.memo) && (
                    <div className="text-xs text-slate-600 mt-0.5 truncate">
                      {t.purpose || t.memo}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => addToPoolFromTemplate(t)}
                    className="p-2 rounded-lg hover:bg-white/60 text-slate-600 hover:text-indigo-600 transition-colors"
                    title="やることリストに追加"
                  >
                    <ListPlus size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(t)}
                    className="p-2 rounded-lg hover:bg-white/60 text-slate-600"
                    title="編集"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`「${t.title}」を削除しますか？`)) {
                        removeTemplate(t.id);
                      }
                    }}
                    className="p-2 rounded-lg hover:bg-rose-50 text-slate-500 hover:text-rose-600"
                    title="削除"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
