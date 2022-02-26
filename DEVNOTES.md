# ffmpeg

This is an experimental branch of snatch containing ffmpeg binary which can mix given temporary audio and video files into a single file to import into the application.

## Why isn't this default?

Because it's _slowwwwww_. Super slow, so slow that it's about twice as fast if not more to manually snatch the audio and the video separately instead of waiting for ffmpeg to handle such large resolution videos, and bundling FFMPEG causes the tool's final ZXP size to jump exponentially. The smaller it is, the quicker it loads and runs -- and this is what I'd prefer to be default.

For the sake of completion and a bit of documentation on my end, I'm including this branch, but it's going to be an experimental opt-in one.
