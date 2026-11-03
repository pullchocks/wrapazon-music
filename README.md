# Wrapazon Music

Amazon Music in its own window. Sign in once, and the session stays on this computer.

## Run

Chromium must be installed at `/usr/lib/chromium/chromium`. To use another binary, set `WRAPAZON_CHROME`.

From a git checkout:

```bash
./wrapazon
```

That first run adds Wrapazon Music to your application menu and links `~/.local/bin/wrapazon`. The `wrapazon` command then works when `~/.local/bin` is on your PATH.

A system package installs the `wrapazon` command and the menu entry for you.

Your login stays in the local data folder `~/.local/share/wrapazon-music`.
