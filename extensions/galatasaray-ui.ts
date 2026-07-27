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
const FULL_STATUS_MIN_WIDTH = 72;
const COMPACT_STATUS_MIN_WIDTH = 40;
const MINIMAL_STATUS_MIN_WIDTH = 28;
const STATUS_THEME_COLORS = [
  "error",
  "dim",
  "accent",
  "warning",
  "text",
  "muted",
  "thinkingOff",
  "thinkingMinimal",
  "thinkingLow",
  "thinkingMedium",
  "thinkingHigh",
  "thinkingXhigh",
  "thinkingMax",
] as const;

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

type ThinkingLevel = NonNullable<ExtensionContext["thinkingLevel"]>;
type ContextUsageSnapshot = ReturnType<ExtensionContext["getContextUsage"]>;

function sanitizeStatusText(text: string): string {
  return text
    .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\|$)/gu, "")
    .replace(/\x1b[PX^_][\s\S]*?(?:\x1b\\|$)/gu, "")
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/gu, "")
    .replace(/\x1b[@-_]/gu, "")
    .replace(/[\x00-\x1f\x7f-\x9f]/gu, "");
}

function getThinkingLevel(ctx: ExtensionContext): ThinkingLevel {
  return ctx.model?.reasoning ? (ctx.thinkingLevel ?? "off") : "off";
}

function thinkingLabel(level: ThinkingLevel, compact: boolean): string {
  if (!compact) return level;
  switch (level) {
    case "minimal":
      return "min";
    case "medium":
      return "med";
    case "high":
      return "hi";
    case "xhigh":
      return "xhi";
    default:
      return level;
  }
}

function colorThinkingLevel(
  level: ThinkingLevel,
  theme: Theme,
  compact = false,
): string {
  const label = thinkingLabel(level, compact);
  switch (level) {
    case "minimal":
      return theme.fg("thinkingMinimal", label);
    case "low":
      return theme.fg("thinkingLow", label);
    case "medium":
      return theme.fg("thinkingMedium", label);
    case "high":
      return theme.fg("thinkingHigh", label);
    case "xhigh":
      return theme.fg("thinkingXhigh", label);
    case "max":
      return theme.fg("thinkingMax", label);
    default:
      return theme.fg("thinkingOff", label);
  }
}

function buildContextBar(theme: Theme, visualPercent: number, width: number): string {
  const filledCells = Math.round((visualPercent / 100) * width);
  return Array.from({ length: width }, (_, index) => {
    if (index >= filledCells) return theme.fg("dim", "░");
    const colorIndex =
      width === 1
        ? 0
        : Math.round((index * (CONTEXT_BAR_COLORS.length - 1)) / (width - 1));
    return colorContextCell(theme, CONTEXT_BAR_COLORS[colorIndex]!, "█");
  }).join("");
}

function compactModelId(modelId: string, width: number): string {
  return sanitizeStatusText(truncateToWidth(sanitizeStatusText(modelId), width, "…"));
}

function getTerminalWidth(): number {
  return Math.max(1, process.stdout.columns ?? 80);
}

function getStatusThemeSignature(theme: Theme): string {
  return [
    theme.name ?? "",
    theme.getColorMode(),
    ...STATUS_THEME_COLORS.map((color) => theme.getFgAnsi(color)),
  ].join("|");
}

function formatElapsed(milliseconds: number | undefined, compact: boolean): string {
  if (milliseconds === undefined) return "--";
  if (milliseconds < 1000) return milliseconds === 0 ? "0s" : "<1s";

  const totalSeconds = Math.floor(milliseconds / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;

  const totalMinutes = Math.floor(totalSeconds / 60);
  if (compact) {
    if (totalMinutes < 60) return `${totalMinutes}m`;
    const hours = Math.floor(totalMinutes / 60);
    return hours < 100 ? `${hours}h` : "99h+";
  }

  if (totalMinutes < 60) {
    return `${totalMinutes}m${String(totalSeconds % 60).padStart(2, "0")}s`;
  }

  const hours = Math.floor(totalMinutes / 60);
  if (hours >= 100) return "99h+";
  return `${hours}h${String(totalMinutes % 60).padStart(2, "0")}m`;
}

function colorElapsed(
  theme: Theme,
  milliseconds: number | undefined,
  active: boolean,
  compact: boolean,
): string {
  const elapsed = formatElapsed(milliseconds, compact);
  return theme.fg(active ? "warning" : "text", elapsed);
}

function buildSmartStatus(
  ctx: ExtensionContext,
  theme: Theme,
  terminalWidth: number,
  usage: ContextUsageSnapshot,
  elapsedMilliseconds: number | undefined,
  requestActive: boolean,
): string {
  const percent = usage?.percent;
  const isKnown = typeof percent === "number" && Number.isFinite(percent);
  const visualPercent = isKnown ? Math.min(100, Math.max(0, percent)) : 0;
  const percentageText = isKnown ? `${Math.round(percent)}%` : "?%";
  const percentage = !isKnown
    ? theme.fg("dim", percentageText)
    : percent > 90
      ? theme.fg("error", percentageText)
      : percent > 70
        ? theme.fg("warning", percentageText)
        : theme.fg("text", percentageText);
  const modelId = ctx.model?.id ?? "no-model";
  const thinkingLevel = getThinkingLevel(ctx);
  const separator = theme.fg("dim", "·");

  if (terminalWidth >= FULL_STATUS_MIN_WIDTH) {
    const brand = [
      theme.fg("error", theme.bold("GS")),
      separator,
      theme.fg("accent", theme.bold("1905")),
    ].join(" ");
    const elapsed =
      theme.fg("accent", "⏱") +
      " " +
      colorElapsed(theme, elapsedMilliseconds, requestActive, false);
    return [
      brand,
      separator,
      percentage,
      theme.fg("dim", "[") +
        buildContextBar(theme, visualPercent, CONTEXT_BAR_WIDTH) +
        theme.fg("dim", "]"),
      separator,
      theme.fg("muted", compactModelId(modelId, 18)),
      separator,
      colorThinkingLevel(thinkingLevel, theme),
      separator,
      elapsed,
    ].join(" ");
  }

  if (terminalWidth >= COMPACT_STATUS_MIN_WIDTH) {
    return [
      theme.fg("error", theme.bold("GS")),
      separator,
      percentage,
      buildContextBar(theme, visualPercent, 5),
      separator,
      theme.fg("muted", compactModelId(modelId, 7)),
      separator,
      colorThinkingLevel(thinkingLevel, theme, true),
      separator,
      colorElapsed(theme, elapsedMilliseconds, requestActive, true),
    ].join(" ");
  }

  if (terminalWidth >= MINIMAL_STATUS_MIN_WIDTH) {
    return [
      theme.fg("error", theme.bold("GS")),
      percentage,
      theme.fg("muted", compactModelId(modelId, 5)),
      colorThinkingLevel(thinkingLevel, theme, true),
      colorElapsed(theme, elapsedMilliseconds, requestActive, true),
      buildContextBar(theme, visualPercent, 5),
    ].join(" ");
  }

  if (terminalWidth >= 20) {
    return [
      percentage,
      theme.fg("muted", compactModelId(modelId, 5)),
      colorThinkingLevel(thinkingLevel, theme, true),
      colorElapsed(theme, elapsedMilliseconds, requestActive, true),
    ].join(" ");
  }

  if (terminalWidth >= 14) {
    return [
      percentage,
      colorThinkingLevel(thinkingLevel, theme, true),
      colorElapsed(theme, elapsedMilliseconds, requestActive, true),
    ].join(" ");
  }

  if (terminalWidth >= 9) {
    return [
      percentage,
      colorElapsed(theme, elapsedMilliseconds, requestActive, true),
    ].join(" ");
  }

  return truncateToWidth(percentage, terminalWidth, "");
}

export default function (pi: ExtensionAPI) {
  let interval: ReturnType<typeof setInterval> | undefined;
  let headerInstalled = false;
  let indicatorInstalled = false;
  let statusInstalled = false;
  let lastStatus: string | undefined;
  let lastStatusThemeSignature: string | undefined;
  let lastStatusWidth: number | undefined;
  let cachedContextUsage: ContextUsageSnapshot;
  let contextUsageCached = false;
  let requestStartedAt: number | undefined;
  let lastRequestDuration: number | undefined;

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
    lastStatusThemeSignature = undefined;
    lastStatusWidth = undefined;
    cachedContextUsage = undefined;
    contextUsageCached = false;
    requestStartedAt = undefined;
    lastRequestDuration = undefined;
  };

  const getElapsedMilliseconds = () =>
    requestStartedAt === undefined
      ? lastRequestDuration
      : Math.max(0, performance.now() - requestStartedAt);

  const updateSmartStatus = (ctx: ExtensionContext, refreshContextUsage = true) => {
    if (ctx.mode !== "tui" || ctx.ui.theme.name !== THEME_NAME) return;

    if (refreshContextUsage || !contextUsageCached) {
      cachedContextUsage = ctx.getContextUsage();
      contextUsageCached = true;
    }

    const status = buildSmartStatus(
      ctx,
      ctx.ui.theme,
      getTerminalWidth(),
      cachedContextUsage,
      getElapsedMilliseconds(),
      requestStartedAt !== undefined,
    );
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
      lastStatusThemeSignature = undefined;
      lastStatusWidth = undefined;
      cachedContextUsage = undefined;
      contextUsageCached = false;
      return;
    }

    const statusThemeSignature = getStatusThemeSignature(ctx.ui.theme);
    const statusThemeChanged = lastStatusThemeSignature !== statusThemeSignature;
    const terminalWidth = getTerminalWidth();
    const statusWidthChanged = lastStatusWidth !== terminalWidth;
    if (statusThemeChanged || statusWidthChanged) {
      lastStatus = undefined;
      lastStatusThemeSignature = statusThemeSignature;
      lastStatusWidth = terminalWidth;
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

    if (!statusInstalled || statusThemeChanged || statusWidthChanged) {
      updateSmartStatus(ctx, !contextUsageCached);
    } else if (requestStartedAt !== undefined) {
      updateSmartStatus(ctx, false);
    }
  };

  const refreshSmartStatus = (ctx: ExtensionContext) => {
    if (ctx.mode !== "tui") return;

    if (ctx.ui.theme.name !== THEME_NAME || !statusInstalled) {
      syncUi(ctx);
      return;
    }

    updateSmartStatus(ctx);
  };

  pi.on("session_start", (_event, ctx) => {
    resetUi(ctx);
    syncUi(ctx);

    if (ctx.mode === "tui") {
      interval = setInterval(() => syncUi(ctx), POLL_INTERVAL_MS);
      interval.unref?.();
    }
  });

  pi.on("agent_start", (_event, ctx) => {
    if (requestStartedAt === undefined) {
      requestStartedAt = performance.now();
      lastRequestDuration = undefined;
    }
    refreshSmartStatus(ctx);
  });

  pi.on("agent_settled", (_event, ctx) => {
    if (requestStartedAt !== undefined) {
      lastRequestDuration = Math.max(0, performance.now() - requestStartedAt);
      requestStartedAt = undefined;
    }
    refreshSmartStatus(ctx);
  });

  pi.on("turn_end", (_event, ctx) => refreshSmartStatus(ctx));
  pi.on("session_compact", (_event, ctx) => refreshSmartStatus(ctx));
  pi.on("model_select", (_event, ctx) => refreshSmartStatus(ctx));
  pi.on("thinking_level_select", (_event, ctx) => refreshSmartStatus(ctx));
  pi.on("session_tree", (_event, ctx) => refreshSmartStatus(ctx));

  pi.on("session_shutdown", (_event, ctx) => {
    resetUi(ctx);
  });
}
