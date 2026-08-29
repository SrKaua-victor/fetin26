import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Loader } from "./Icons";

/**
 * Seletor em folha deslizante. Substitui o <select> nativo: alvos de toque
 * grandes (o motorista mexe nisso dentro do ônibus) e a mesma identidade
 * visual do resto do app.
 *
 * options: [{ value, title, subtitle?, color?, mono? }]
 */
export default function PickerField({
  id,
  label,
  icon,
  value,
  options,
  onChange,
  placeholder = "Selecione",
  sheetTitle,
  loading = false,
  loadingText = "Carregando…",
  emptyText = "Nada disponível",
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const listRef = useRef(null);

  const selected = options.find((o) => o.value === value) || null;
  const blocked = disabled || loading || options.length === 0;

  // Escape fecha; o fundo não rola enquanto a folha está aberta
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    const previous = document.body.style.overflow;
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Abre já com o foco na opção atual
  useEffect(() => {
    if (!open || !listRef.current) return;
    const list = listRef.current;
    const target =
      list.querySelector('[aria-selected="true"]') || list.querySelector('[role="option"]');
    target?.focus();
  }, [open]);

  function pick(next) {
    onChange(next);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onListKeyDown(e) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const items = Array.from(listRef.current.querySelectorAll('[role="option"]'));
    const at = items.indexOf(document.activeElement);
    const to =
      e.key === "Home" ? 0
      : e.key === "End" ? items.length - 1
      : e.key === "ArrowDown" ? Math.min(items.length - 1, at + 1)
      : Math.max(0, at - 1);
    items[to]?.focus();
  }

  const triggerText = selected
    ? selected.title
    : loading ? loadingText
    : options.length === 0 ? emptyText
    : placeholder;

  return (
    <div className="picker-wrap">
      {label && (
        <span className="label" id={`${id}-label`}>
          {label}
        </span>
      )}

      <button
        type="button"
        id={id}
        ref={triggerRef}
        className={`picker${selected ? " picker-filled" : ""}`}
        onClick={() => setOpen(true)}
        disabled={blocked}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={label ? `${id}-label ${id}` : undefined}
      >
        <span className="picker-badge" style={badgeTint(selected?.color)}>
          {loading ? <Loader size={18} className="spin" /> : icon}
        </span>

        <span className="picker-body">
          <span
            className={`picker-title${selected ? "" : " picker-title-empty"}${
              selected?.mono ? " picker-title-mono" : ""
            }`}
          >
            {triggerText}
          </span>
          {selected?.subtitle && <span className="picker-sub">{selected.subtitle}</span>}
        </span>

        <ChevronDown size={20} className="picker-chevron" />
      </button>

      {/* A folha vai para o <body> em vez de ficar nesta árvore. Dentro do
          .content — que é position:relative com z-index 1 — ela ficava presa
          naquele contexto de empilhamento, e a .action-bar, com z-index maior,
          cobria as opções: dava para ver a lista, mas não para tocar nela. */}
      {open &&
        createPortal(
          <>
            <div className="backdrop" onClick={() => setOpen(false)} />
            <div className="sheet" role="dialog" aria-modal="true" aria-label={sheetTitle || label}>
              <div className="sheet-grip" />
              <div className="picker-sheet-title">{sheetTitle || label}</div>

              <div
                className="picker-list"
                role="listbox"
                ref={listRef}
                onKeyDown={onListKeyDown}
                aria-label={sheetTitle || label}
              >
                {options.map((option) => {
                  const on = option.value === value;
                  return (
                    <button
                      type="button"
                      key={option.value}
                      role="option"
                      aria-selected={on}
                      className={`picker-option${on ? " picker-option-on" : ""}`}
                      onClick={() => pick(option.value)}
                    >
                      <span className="picker-badge" style={badgeTint(option.color)}>
                        {icon}
                      </span>
                      <span className="picker-body">
                        <span className={`picker-title${option.mono ? " picker-title-mono" : ""}`}>
                          {option.title}
                        </span>
                        {option.subtitle && <span className="picker-sub">{option.subtitle}</span>}
                      </span>
                      {on && (
                        <span className="picker-check">
                          <Check size={15} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}

// Tinge o quadradinho com a cor da linha, quando ela tem uma
function badgeTint(color) {
  if (!color || !/^#[0-9a-f]{6}$/i.test(color)) return undefined;
  return { background: `${color}24`, color };
}
