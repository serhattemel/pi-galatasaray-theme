import type { ExtensionAPI, ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

const THEME_NAME = "Galatasaray";
const STATUS_KEY = "galatasaray-theme";
const POLL_INTERVAL_MS = 1000;
const FULL_LOGO_MIN_WIDTH = 72;
const COMPACT_LOGO_MIN_WIDTH = 36;
const BRAND_ONLY_MIN_WIDTH = 20;
const CONTEXT_BAR_COLORS = [
  [255, 243, 176], // #FFF3B0
  [255, 230, 129], // #FFE681
  [255, 212, 81], // #FFD451
  [253, 185, 18], // #FDB912
  [233, 120, 47], // #E9782F
  [216, 95, 50], // #D85F32
  [195, 63, 55], // #C33F37
  [181, 46, 56], // #B52E38
  [163, 38, 56], // #A32638
  [126, 21, 48], // #7E1530
] as const;
const CONTEXT_BAR_WIDTH = CONTEXT_BAR_COLORS.length;

const LOGO_LINES = String.raw`
              ▒▓▓▓▓▓▓▓▓▓▒
            ▒▓▓▓▓▓▓▓▓▓▓▓▓▓▒
          ▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒
         ▒▓▓▓▓▒         ▒▓▓▓▓▒
         ▒▓▓▓▒           ▒▓▓▓▒
         ▒▓▓▓▒
         ▒▓▓▓▓▒
          ▒▓▓▓▓▓▒░████░
          ░█▒▓▓▓▓▓▒░████████░
       ░█████░▒▓▓▓▓▓▓▒░████████░
     ░████████░ ▒▓▓▓▓▓▓▓▒░██████░
    ░█████░        ▒▓▓▓▓▓▓▓▒░██░
  ░█████░             ▒▓▓▓▓▓▓▓▒
 ░████░                  ▒▓▓▓▓▓▒
 ░███░                     ▒▓▓▓▓▒
░███░▒▓▓▓▒                  ░█████████░
░███░▒▓▓▓▒                  ░█████████░
░███░▒▓▓▓▒                   ▒▓▓▓▒░███░
░███░▒▓▓▓▒                   ▒▓▓▓▒░███░
░███░▒▓▓▓▓▒                 ▒▓▓▓▓▒░███░
 ░███░▒▓▓▓▓▒               ▒▓▓▓▓▒░███░
 ░████░▒▓▓▓▓▓▒          ▒▓▓▓▓▓▓▒░███░
   ░████░▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒░████░
    ░█████░▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒░█████░
      ░████████░▒▓▓▓▓▓▒░████████░
        ░█████████████████████░
           ░██████████████░
`
  .trimEnd()
  .split("\n")
  .slice(1)
  .map((line) => line.trimEnd());

const LOGO_INDENT = Math.min(
  ...LOGO_LINES.filter(Boolean).map((line) => line.match(/^ */)?.[0].length ?? 0),
);

const NORMALIZED_LOGO_LINES = LOGO_LINES.map((line) => line.slice(LOGO_INDENT));
const LOGO_WIDTH = Math.max(...NORMALIZED_LOGO_LINES.map((line) => line.length));

const COMPACT_LOGO_LINES = String.raw`
       ▒▓▓▓▓▓▓
     ▒▓▓▓▓▓▓▓▓▓▒
     ▒▓▓▒    ▒▓▓▒
     ▒▓▓▒░██░
   ░███░▒▓▓▓▒░████░
  ░██░     ▒▓▓▓▓██░
 ░██░        ▒▓▓▓▒
░██░▒▓▒        ░████░
░██░▒▓▒        ░████░
░██░▒▓▒        ▒▓▒░██░
 ░██▒▓▓▒      ▒▓▓▒░██░
  ░██▒▓▓▓▓▓▓▓▓▓▓▒░██░
   ░████▒▓▓▓▓▒████░
     ░██████████░
`
  .trimEnd()
  .split("\n")
  .slice(1)
  .map((line) => line.trimEnd());

const COMPACT_LOGO_WIDTH = Math.max(...COMPACT_LOGO_LINES.map((line) => line.length));

function centerLine(line: string, width: number): string {
  const padding = Math.max(0, Math.floor((width - visibleWidth(line)) / 2));
  return truncateToWidth(`${" ".repeat(padding)}${line}`, width, "");
}

function colorLogoLine(line: string, theme: Theme, logoWidth = LOGO_WIDTH): string {
  const canvas = line.padEnd(logoWidth);
  return (canvas.match(/[▓▒]+|[^▓▒]+/gu) ?? [])
    .map((segment) =>
      segment.startsWith("▓") || segment.startsWith("▒")
        ? theme.fg("accent", segment)
        : theme.fg("error", segment),
    )
    .join("");
}

function colorContextCell(
  theme: Theme,
  color: (typeof CONTEXT_BAR_COLORS)[number],
  text: string,
): string {
  const [red, green, blue] = color;
  const ansi =
    theme.getColorMode() === "256color"
      ? `\x1b[38;5;${
          16 +
          36 * Math.round((red / 255) * 5) +
          6 * Math.round((green / 255) * 5) +
          Math.round((blue / 255) * 5)
        }m`
      : `\x1b[38;2;${red};${green};${blue}m`;
  return `${ansi}${text}\x1b[39m`;
}

function buildContextStatus(ctx: ExtensionContext, theme: Theme): string {
  const brand = [
    theme.fg("error", theme.bold("GS")),
    theme.fg("dim", "·"),
    theme.fg("accent", theme.bold("1905")),
  ].join(" ");
  const usage = ctx.getContextUsage();
  const percent = usage?.percent;
  const isKnown = typeof percent === "number" && Number.isFinite(percent);
  const visualPercent = isKnown ? Math.min(100, Math.max(0, percent)) : 0;
  const filledCells = Math.round((visualPercent / 100) * CONTEXT_BAR_WIDTH);
  const percentageText = isKnown ? `${Math.round(percent)}%` : "?%";
  const percentage = !isKnown
    ? theme.fg("dim", percentageText)
    : percent > 90
      ? theme.fg("error", percentageText)
      : percent > 70
        ? theme.fg("warning", percentageText)
        : theme.fg("text", percentageText);
  const bar = Array.from({ length: CONTEXT_BAR_WIDTH }, (_, index) => {
    if (index >= filledCells) return theme.fg("dim", "░");
    return colorContextCell(theme, CONTEXT_BAR_COLORS[index]!, "█");
  }).join("");

  return [
    brand,
    theme.fg("dim", "·"),
    percentage,
    theme.fg("dim", "[") + bar + theme.fg("dim", "]"),
  ].join(" ");
}

export default function (pi: ExtensionAPI) {
  let interval: ReturnType<typeof setInterval> | undefined;
  let headerInstalled = false;
  let indicatorInstalled = false;
  let statusInstalled = false;
  let lastStatus: string | undefined;
  let lastStatusTheme: Theme | undefined;

  const resetUi = (ctx?: ExtensionContext) => {
    if (interval) {
      clearInterval(interval);
      interval = undefined;
    }

    if (ctx?.mode === "tui") {
      if (headerInstalled) ctx.ui.setHeader(undefined);
      if (indicatorInstalled) ctx.ui.setWorkingIndicator();
      if (statusInstalled) ctx.ui.setStatus(STATUS_KEY, undefined);
    }

    headerInstalled = false;
    indicatorInstalled = false;
    statusInstalled = false;
    lastStatus = undefined;
    lastStatusTheme = undefined;
  };

  const updateContextStatus = (ctx: ExtensionContext) => {
    if (ctx.mode !== "tui" || ctx.ui.theme.name !== THEME_NAME) return;

    const status = buildContextStatus(ctx, ctx.ui.theme);
    if (status !== lastStatus) {
      ctx.ui.setStatus(STATUS_KEY, status);
      lastStatus = status;
    }
    statusInstalled = true;
  };

  const syncUi = (ctx: ExtensionContext) => {
    if (ctx.mode !== "tui") return;

    const shouldInstall = ctx.ui.theme.name === THEME_NAME;

    if (!shouldInstall) {
      if (headerInstalled) ctx.ui.setHeader(undefined);
      if (indicatorInstalled) ctx.ui.setWorkingIndicator();
      if (statusInstalled) ctx.ui.setStatus(STATUS_KEY, undefined);
      headerInstalled = false;
      indicatorInstalled = false;
      statusInstalled = false;
      lastStatus = undefined;
      lastStatusTheme = undefined;
      return;
    }

    const statusThemeChanged = lastStatusTheme !== ctx.ui.theme;
    if (statusThemeChanged) {
      lastStatus = undefined;
      lastStatusTheme = ctx.ui.theme;
    }

    if (!headerInstalled) {
      ctx.ui.setHeader((_tui, theme) => ({
        render(width: number): string[] {
          const separatorMiddle = Math.floor(width / 2);
          const separator =
            theme.fg("error", "-".repeat(separatorMiddle)) +
            theme.fg("accent", "-".repeat(width - separatorMiddle));
          const title =
            theme.fg("error", theme.bold("GALATA")) +
            theme.fg("accent", theme.bold("SARAY"));
          const subtitle = [
            theme.fg("error", theme.bold("1905")),
            theme.fg("dim", "·"),
            theme.fg("muted", "Pi Agent"),
          ].join(" ");

          const brand = [centerLine(title, width), centerLine(subtitle, width)];

          if (width >= FULL_LOGO_MIN_WIDTH) {
            return [
              "",
              separator,
              ...NORMALIZED_LOGO_LINES.map((line) =>
                centerLine(colorLogoLine(line, theme), width),
              ),
              "",
              ...brand,
              separator,
              "",
            ];
          }

          if (width >= COMPACT_LOGO_MIN_WIDTH) {
            return [
              "",
              separator,
              ...COMPACT_LOGO_LINES.map((line) =>
                centerLine(colorLogoLine(line, theme, COMPACT_LOGO_WIDTH), width),
              ),
              "",
              ...brand,
              separator,
              "",
            ];
          }

          if (width >= BRAND_ONLY_MIN_WIDTH) {
            return ["", separator, ...brand, separator, ""];
          }

          const minimalBrand =
            theme.fg("error", theme.bold("GS")) +
            theme.fg("dim", " · ") +
            theme.fg("accent", theme.bold("1905"));
          return ["", centerLine(minimalBrand, width), ""];
        },
        invalidate() {},
      }));

      headerInstalled = true;
    }

    if (!indicatorInstalled) {
      const spinnerFrames = ["◐", "◓", "◑", "◒"];
      ctx.ui.setWorkingIndicator({
        frames: spinnerFrames.map((frame, index) => {
          const boldFrame = ctx.ui.theme.bold(frame);
          return index % 2 === 0
            ? ctx.ui.theme.fg("error", boldFrame)
            : ctx.ui.theme.fg("accent", boldFrame);
        }),
        intervalMs: 300,
      });
      indicatorInstalled = true;
    }

    if (!statusInstalled || statusThemeChanged) updateContextStatus(ctx);
  };

  const refreshContextStatus = (ctx: ExtensionContext) => {
    if (ctx.mode !== "tui") return;

    if (ctx.ui.theme.name !== THEME_NAME || !statusInstalled) {
      syncUi(ctx);
      return;
    }

    updateContextStatus(ctx);
  };

  pi.on("session_start", (_event, ctx) => {
    resetUi(ctx);
    syncUi(ctx);

    if (ctx.mode === "tui") {
      interval = setInterval(() => syncUi(ctx), POLL_INTERVAL_MS);
      interval.unref?.();
    }
  });

  pi.on("turn_end", (_event, ctx) => refreshContextStatus(ctx));
  pi.on("session_compact", (_event, ctx) => refreshContextStatus(ctx));
  pi.on("model_select", (_event, ctx) => refreshContextStatus(ctx));
  pi.on("session_tree", (_event, ctx) => refreshContextStatus(ctx));

  pi.on("session_shutdown", (_event, ctx) => {
    resetUi(ctx);
  });
}
