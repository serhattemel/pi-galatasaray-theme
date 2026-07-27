import type { ExtensionAPI, ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

const THEME_NAME = "Galatasaray";
const STATUS_KEY = "galatasaray-theme";
const POLL_INTERVAL_MS = 1000;
const FULL_LOGO_MIN_WIDTH = 72;
const COMPACT_LOGO_MIN_WIDTH = 36;
const BRAND_ONLY_MIN_WIDTH = 20;

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

export default function (pi: ExtensionAPI) {
  let interval: ReturnType<typeof setInterval> | undefined;
  let headerInstalled = false;
  let indicatorInstalled = false;
  let statusInstalled = false;

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
      return;
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

    if (!statusInstalled) {
      const status = [
        ctx.ui.theme.fg("error", ctx.ui.theme.bold("GS")),
        ctx.ui.theme.fg("dim", "·"),
        ctx.ui.theme.fg("accent", ctx.ui.theme.bold("1905")),
      ].join(" ");
      ctx.ui.setStatus(STATUS_KEY, status);
      statusInstalled = true;
    }
  };

  pi.on("session_start", (_event, ctx) => {
    resetUi(ctx);
    syncUi(ctx);

    if (ctx.mode === "tui") {
      interval = setInterval(() => syncUi(ctx), POLL_INTERVAL_MS);
      interval.unref?.();
    }
  });

  pi.on("session_shutdown", (_event, ctx) => {
    resetUi(ctx);
  });
}
