# Wrapazon Music

Amazon Music in its own window. Sign in once, and the session stays on this computer.

## Run

Chromium must be installed at `/usr/lib/chromium/chromium`. To use another binary, set `WRAPAZON_CHROME`.

```bash
./wrapazon
```

The first time you run `./wrapazon` from the project, it adds Wrapazon Music to your application menu and installs a symlink at `~/.local/bin/wrapazon`. After that, the `wrapazon` command works when `~/.local/bin` is on your PATH.

Your login stays in `~/.local/share/wrapazon-music`. That folder is not in this repository, and it must never be committed.
