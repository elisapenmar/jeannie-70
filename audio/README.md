`party.m4a` is generated, not hand-placed. To rebuild it from a new recording:

    python3 scripts/make-audio.py "/path/to/song.mp3"

That trims to 1:45 and fades the last seven seconds, because the full track
outstays its welcome on a page people are reading. It also prints the tempo,
which belongs in `BPM` at the top of `js/disco.js` so the mirror ball flashes
in time.

AAC rather than mp3 because macOS decodes mp3 but will not encode it, and a
fade cannot be applied without re-encoding. Every browser these guests will
use plays AAC. The player hides itself if this file is missing.
