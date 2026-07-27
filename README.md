# Galatasaray Theme for Pi Agent

Unofficial Galatasaray-inspired theme and startup interface for [Pi Agent](https://github.com/earendil-works/pi-mono).

## Features

- Galatasaray-inspired red and yellow color palette
- Custom block-art startup logo
- Custom startup header, working indicator, and status badge

## Installation

Copy the files into your global Pi configuration directory:

```text
themes/galatasaray.json       -> ~/.pi/agent/themes/galatasaray.json
extensions/galatasaray-ui.ts  -> ~/.pi/agent/extensions/galatasaray-ui.ts
```

On Windows, `~` normally corresponds to `C:\Users\<username>`.

Then:

1. Start Pi Agent.
2. Open `/settings` and select **Galatasaray** as the theme.
3. Run `/reload` or restart Pi.

## Uninstall

Delete the two installed files and restart Pi:

```text
~/.pi/agent/themes/galatasaray.json
~/.pi/agent/extensions/galatasaray-ui.ts
```

## Disclaimer

This is an unofficial fan-made project. It is not affiliated with, endorsed by, or sponsored by Galatasaray Spor Kulübü.
