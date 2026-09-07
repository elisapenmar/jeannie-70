# Mom's 70th

Animated disco birthday invitation. Static site, no build step — open `index.html`.

## Layout

    index.html        markup: hero, details, RSVP form
    css/style.css     all styling and CSS animation
    js/disco.js       mirror ball (canvas), room lights, glitter
    js/form.js        file pickers and previews (submission NOT wired yet)
    images/           mom-disco.png — transparent-background cutout

## Things to know

**Tempo.** `BPM` at the top of `js/disco.js` drives everything that flashes —
the ball's sparkle, the bloom pulse, the coloured spots. JS writes it out as
the `--beat` CSS custom property so the CSS animations stay in step. When the
song is chosen, set `BPM` to match it and the whole room pulses on the beat.

**Placeholders.** Anything in `[SQUARE BRACKETS]` in `index.html` is copy still
to be written.

**RSVP.** The form is UI only. No backend is connected, so submitting does
nothing but update the note under the button.

**Source material.** Assets live in Google Drive under
`Projects/Holidays and Events/Moms 70th`. The repo is kept outside Drive
because Drive's sync engine corrupts `.git`.

## Local preview

    python3 -m http.server 8777

then open <http://localhost:8777>.
