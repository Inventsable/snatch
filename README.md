# snatch

Inject Youtube videos directly into Premiere Pro and After Effects

![](https://thumbs.gfycat.com/ThirstyMeanArrowcrab-size_restricted.gif)

---

## Mandatory user agreement:

This is not a means to promote or facilitate piracy. This is a personal tool I've found that I could use for practicing my own video editing using **legal** content or Fair Use contexts, and by using this tool you're agreeing to my definition of a Good Faith principle: _I've built something that I offer you for free and which could be used for either good or evil, but we both agree to choose good instead of evil and when you willingly go against this it doesn't make you clever or savvy, it makes you a bad person._ If you _were_ so clever, you could and would've made it yourself.

## [By clicking this link and downloading the ZXP you're agreeing to the above and that you are solely responsible for any and all legal implications of this tool](https://github.com/Inventsable/snatch/raw/master/archive/snatch_1.1.1.zxp)

---

# FAQ

## How do I install this?

[Check out an explanation here](https://help.battleaxe.co/overlord/#installation).

## Does this support **\_\_\_\_\_\_**?

If it's anything more complex than a plain URL (no added time parameters) at the highest available quality, then probably not. I don't plan on developing this much further because I don't personally have a need for other features, plus I have no idea if any one in the world is going to use it.

## Can it support downloading segments of videos?

Theoretically, but it's something I'd need to devote a lot of time to because ytdl-core allows you to determine a start bit and end bit to download a segment, but I'd need to convert timestamps to bits reliably and build a UI component which makes timestamps easy to input.

## Can I download audio only?

As of v1.1, there are new settings that allow you to Snatch the best audio, best video, or (when both are disabled) snatch the default best combination up to 720p.

## Can it download 1080p with audio?

Currently >1080p downloads without audio because Youtube does not stream them together. I spent a few hours getting this to work through an FFMPEG binary. The short answer: yes but it's extremely slow. The long of it: right now the panel is 3mB total, adding FFMPEG brings the size up to 41mB which makes it load and run much slower. Re-encoding (at least with the settings I'd used) HD footage with HD audio was also very slow, taking about 2 minutes for a video with a runtime of 3:25. It'd actually be far quicker to Snatch the best video and Snatch the best audio or download these separately and align them in your timeline, and it doesn't make much sense for a workflow tool to be needlessly slow.

If I find that I can speed this process up, I'll revisit it.

## Can I choose the exact format of what I download?

Maybe, but this isn't as straightforward as you might think. The majority of available qualities are encoded as vp9 or other encodings that aren't support by PPRO at all, while you can download and attempt to import them PPRO will flag it as a faulty import. The list is very small when we exclude these, and I feel the Best Audio / Best Video / Good Both options are intuitive enough to cover most needs.

## I get an error saying "File of this same path is in use by the app"

PPRO is kind of greedy with file access once you import files. The panel can and should be removing any files that would share the same name as a new download, but the app may have locked read/write privileges because it's currently reading the file, even if that file is no longer in your project panel. This causes an EPERM (permissions) error, it something I can only warn a user about but not manually fix.

## It isn't working for a certain Youtube link

It doesn't support youtu.be syntax, but it also does not support:

- Videos regionally locked from your location
- Private or unlisted videos
- Rentals or purchases
- Youtube Premium content
- Non-HLS (or currently broadcasting) livestreams

## ^ Can it support those?

No, because **this is not a piracy tool.**

## Any plans for adding other platforms beyond Youtube?

Not at the moment because I was exploring the [ytdl-core](https://github.com/fent/node-ytdl-core#readme) API and this relies on it to do the heavy lifting.

## Why does this look so similar to [Timelord and Anubis from Battle Axe](https://www.battleaxe.co/)?

Because it shares the same [open source component library](https://github.com/battleaxedotco/brutalism#-brutalism) as them, which you're welcome to use too.
