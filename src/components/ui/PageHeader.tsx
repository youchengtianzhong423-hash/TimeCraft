interface Props {
  title: string;
  description?: string;
  right?: React.ReactNode;
  /** タイトル下に表示するコントロール（Undo/Redo ボタンなど） */
  left?: React.ReactNode;
}

export function PageHeader({ title, description, right, left }: Props) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-sm text-muted max-w-2xl">{description}</p>
        )}
        {left && <div className="mt-2 flex items-center gap-1">{left}</div>}
      </div>
      {right && <div className="flex flex-wrap gap-2">{right}</div>}
    </div>
  );
}
