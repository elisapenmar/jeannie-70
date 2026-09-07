#!/usr/bin/env python3
"""Trim the song and fade it out, producing audio/party.m4a.

    python3 scripts/make-audio.py "/path/to/song.mp3"

The full track outstays its welcome on a page people are reading, so it fades
away rather than stopping dead. Output is AAC in an .m4a because macOS decodes
mp3 but will not encode it, and a fade cannot be applied without re-encoding.
Every browser these guests will use plays AAC; doing the fade in JavaScript
instead would risk silence on iPhones, which is a worse failure than a format.
"""
import pathlib, subprocess, sys, tempfile, wave
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent.parent
END        = 105.0     # hard stop, 1:45
FADE_OVER  = 7.0       # seconds of fade leading up to it


def decode(src, wav):
    subprocess.run(["afconvert", "-f", "WAVE", "-d", "LEI16@44100",
                    str(src), str(wav)], check=True)


def encode(wav, out):
    subprocess.run(["afconvert", "-f", "m4af", "-d", "aac", "-b", "128000",
                    str(wav), str(out)], check=True)


def main():
    src = pathlib.Path(sys.argv[1])
    with tempfile.TemporaryDirectory() as tmp:
        tmp = pathlib.Path(tmp)
        raw, faded = tmp / "in.wav", tmp / "out.wav"
        decode(src, raw)

        with wave.open(str(raw)) as w:
            sr, ch, n = w.getframerate(), w.getnchannels(), w.getnframes()
            a = np.frombuffer(w.readframes(n), dtype="<i2").astype(np.float32)
        a = a.reshape(-1, ch)
        print(f"source: {len(a)/sr:.1f}s, {ch}ch, {sr}Hz")

        keep = min(len(a), int(END * sr))
        a = a[:keep]

        # equal-power curve rather than a straight line: a linear fade sounds
        # like it stalls in the middle, because loudness is not linear
        f = int(FADE_OVER * sr)
        if f and f <= len(a):
            curve = np.cos(np.linspace(0, np.pi / 2, f)) ** 2
            a[-f:] *= curve[:, None]

        with wave.open(str(faded), "w") as w:
            w.setnchannels(ch); w.setsampwidth(2); w.setframerate(sr)
            w.writeframes(np.clip(a, -32768, 32767).astype("<i2").tobytes())

        out = ROOT / "audio" / "party.m4a"
        out.unlink(missing_ok=True)
        encode(faded, out)
        print(f"wrote {out.name}: {len(a)/sr:.1f}s, {out.stat().st_size//1024} KB")

        # tempo, for the mirror ball
        mono = a.mean(axis=1)
        hop = 256
        env = np.array([np.sqrt(np.mean(mono[i*hop:(i+1)*hop]**2))
                        for i in range(len(mono)//hop)])
        d = np.diff(env); d[d < 0] = 0; d -= d.mean()
        ac = np.correlate(d, d, "full")[len(d)-1:]
        fps = sr / hop
        best = max(((ac[int(fps*60/b)], b) for b in np.arange(70, 190, 0.25)
                    if int(fps*60/b) < len(ac)))
        print(f"tempo: {best[1]:.2f} BPM")


if __name__ == "__main__":
    main()
