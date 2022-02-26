<template>
  <Wrapper class="home-wrapper">
    <Progress-Bar delay="0ms" duration="60ms" :percent="progress" :size="3" />
    <Input
      label="URL"
      flat
      v-model="url"
      placeholder="http://youtube.com/..."
      @update="checkURL"
      clearable
      @focus="hasFocus = true"
      @blur="hasFocus = false"
      prefs-id="url"
      @prefs="(data) => (url = data.value)"
    />
    <Fold label="Settings" :open="true">
      <div class="picker-row">
        <div style="width: 24px">
          <Toggle v-model="useCustomDir" />
        </div>
        <File-Picker
          folder
          clearable
          :disabled="!useCustomDir"
          :fullPath="true"
          label="Output folder"
          prefs-id="folder"
          @prefs="updateOutput"
          @input="updateOutput"
          @clear="() => (outputFolder = '')"
        />
      </div>
      <div class="toggle-wrapper">
        <Toggle
          label="Audio only"
          v-model="audioOnly"
          style="margin-right: 16px"
        />
        <Toggle
          label="Video only"
          v-model="videoOnly"
          style="margin-right: 16px"
        />
        <Toggle label="Best of both" v-model="bestQuality" />
      </div>
    </Fold>
    <Fold label="Preview" :open="true">
      <div class="skeleton">
        <div class="skeleton-content">
          <div v-if="!hasValidURL" class="placeholder">
            <Anno uppercase>{{ urlErrorMessage }}</Anno>
          </div>
          <img class="video-thumbnail" v-else :src="thumbnail" />
        </div>
      </div>
      <div style="margin-top: 8px"></div>
      <Anno
        size="11px"
        :color="!validURL ? 'var(--color-btn-disabled-text)' : ''"
        >{{ vidDescription }}</Anno
      >
    </Fold>
    <Divider />
    <Button
      :disabled="!canDownload"
      :label="contextualLabelString"
      uppercase
      :icon="hasDownloaded ? 'check' : isDownloading ? '' : 'download'"
      block
      @click="beginDownload"
      :color="
        isComplete ? 'var(--color-selection)' : 'var(--color-button-primary)'
      "
    />
  </Wrapper>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import { evalScript } from "brutalism";
import spy from "cep-spy";
const fs = require("fs");
const ytdl = require("ytdl-core");
const cp = require("child_process");
const readline = require("readline");
const ffmpegLocale = `${spy.path.root}/ffmpeg`;

// Promisified shell commands for running FFMPEG async:
import util from "util";
const exec = util.promisify(require("child_process").exec);

export default {
  components: {
    "Progress-Bar": require("../components/ProgressBar.vue").default,
  },
  data: () => ({
    progress: 0,
    url: "",
    validURL: false,
    title: "",
    thumbnail: "",
    quality: "highest",
    hasFocus: false,
    testedURL: false,
    channelLink: "",
    channelName: "",
    outputFolder: "",
    totalChunkSize: 0,
    addedAudioChunks: false,
    addedVideoChunks: false,
    hasDownloaded: false,
    isDownloading: false,
    useRootDir: false,
    chunkPrefix: 0,
    isComplete: false,
    contextText: "",
    hasError: false,
    errorText: "",
  }),
  async mounted() {
    this.getSettings();
    console.log(this.settings);
    // If the panel was mounted and prefs are filled, automatically query the URL:
    if (this.url.length) this.checkURL(this.url);
  },
  computed: {
    ...mapGetters("settings", ["settings"]),
    contextualLabelString() {
      return this.isComplete
        ? "Done"
        : this.isDownloading && !this.hasDownloaded
        ? `${this.contextText} ${this.progress}%`
        : this.hasDownloaded
        ? this.contextText
        : `Snatch ${this.snatchContext}`;
    },
    snatchContext() {
      return this.videoOnly
        ? "best video"
        : this.audioOnly
        ? "best audio"
        : this.bestQuality
        ? "best video/audio"
        : "fastest good quality";
    },
    useCustomDir: {
      get() {
        return !this.settings.useRootDir;
      },
      set(val) {
        this.setUseRootDir(!val);
      },
    },
    audioOnly: {
      get() {
        return this.settings.audioOnly;
      },
      set(val) {
        this.setAudioOnly(val);
      },
    },
    videoOnly: {
      get() {
        return this.settings.videoOnly;
      },
      set(val) {
        this.setVideoOnly(val);
      },
    },
    bestQuality: {
      get() {
        return this.settings.bestQuality;
      },
      set(val) {
        this.setBestQuality(val);
      },
    },
    canDownload() {
      return this.hasValidURL && !this.isDownloading && !this.hasDownloaded;
    },
    vidDescription() {
      return this.validURL ? this.realTitle : "No title";
    },
    realTitle() {
      return this.title && this.validURL ? this.title : "N/A";
    },
    urlErrorMessage() {
      return this.hasNoURL
        ? "No URL queried"
        : !this.testedURL
        ? "Ready to query"
        : this.hasFocus
        ? "Ready to query"
        : !this.validURL
        ? "Invalid URL"
        : "Working...";
    },
    hasNoURL() {
      return !this.url || !this.url.length;
    },
    hasValidURL() {
      return !this.hasNoURL && this.validURL;
    },
    outputPath() {
      // @NOTE - Could be replaced with dynamic formats, but it might be too taking things a bit too far
      return `${this.outputFolder}/${this.title}.mp${
        this.audioOnly ? "3" : "4"
      }`;
    },
  },
  watch: {
    settings: {
      handler() {
        if (this.hasDownloaded) {
          this.isComplete = false;
          this.hasDownloaded = false;
          this.isDownloading = false;
        }
      },
      deep: true,
    },
  },
  methods: {
    ...mapActions("settings", [
      "setUseRootDir",
      "setUrl",
      "setBestQuality",
      "setOutputDir",
      "setAudioOnly",
      "setVideoOnly",
      "getSettings",
    ]),
    async ytdlOptions() {
      // Likely be best to generate a dropdown containing all format options.
      // Still unsure how to best solve 1080p, may opt for a CLI tool entirely instead
      if (this.videoOnly) {
        let info = await ytdl.getInfo(this.url);
        let videoFormats = ytdl
          .filterFormats(info.formats, "videoonly")
          .filter(
            (format) =>
              format.container == "mp4" &&
              format.hasAudio == false &&
              format.itag !== 399
          )
          .sort((a, b) => b.height - a.height);
        console.log(videoFormats[0]);
        console.log(videoFormats[0].itag);
        return { quality: videoFormats[0].itag };
      } else
        return {
          filter: this.audioOnly ? "audioonly" : "audioandvideo",
          quality: this.audioOnly ? "highest" : "highestvideo",
        };
    },
    updateOutput(data) {
      if (Array.isArray(data) && data.length) this.outputFolder = data[0];
      else {
        console.error("Unexpected non-Array fed into File-Picker:", data);
      }
    },
    createError(text) {
      this.isDownloading = false;
      this.hasDownloaded = false;
      this.isComplete = false;
      this.contextText = "";
      this.percent = 0;
      this.hasError = true;
      this.errorText = text;
    },
    async checkURL(data) {
      this.setUrl(data);
      this.testedURL = false;
      this.hasDownloaded = false;
      try {
        let info = await ytdl.getInfo(data).catch((err) => {
          console.log("Caught exception");
          this.validURL = false;
          this.testedURL = true;
        });
        this.title = info.player_response.videoDetails.title.replace(
          /[/\\?%*:|"<>]/g,
          "-"
        );
        this.thumbnail =
          info.player_response.microformat.playerMicroformatRenderer.thumbnail.thumbnails[0].url;
        this.channelLink = info.player_response.videoDetails.ownerProfileUrl;
        this.channelName =
          info.player_response.videoDetails.author.name ||
          info.player_response.videoDetails.author;
        this.validURL = true;
        this.testedURL = true;
      } catch (err) {
        console.log(err);
        this.validURL = false;
        this.testedURL = true;
        this.clearData();
        return false;
      }
    },
    async getParentRootFromJSX() {
      console.log("Get root parent:");
      let result;
      if (spy.appName == "AEFT") {
        result = await evalScript(`(function() {
          return app.project.file.fsName;
        }())`);
      } else {
        result = await evalScript(`(function() {
          return File(app.project.path).parent.fsName;
        }())`);
      }
      if (/evalscript\serror/i.test(result)) {
        console.error("Eval error, silent failure");
        this.createError("Project must be saved first");
        return null;
      }
      return result.replace(/\\/g, "/").replace(/\/$/, "");
    },
    async beginDownload() {
      if (!this.canDownload) {
        console.error("Func is running without valid URL or params");
        return null;
      }
      this.progress = this.chunkPrefix = 0;
      this.isDownloading = true;
      this.hasDownloaded = false;
      this.isComplete = false;
      if (!this.useCustomDir) {
        this.contextText = "Retrieving project filepath";
        let parentRoot = await this.getParentRootFromJSX();
        if (parentRoot) {
          console.log(this.outputFolder);
          this.outputFolder = parentRoot;
        } else {
          this.isDownloading = false;
          return null;
        }
      }

      // Ensure that no read/write streams fail from conflicting pre-existing file access
      try {
        if (fs.existsSync(this.outputPath)) fs.unlinkSync(this.outputPath);
      } catch (err) {
        this.createError(
          "File with this same name is already in use by the app"
        );
        console.error(`Not able to delete previous file:`, err);
      }

      let download;
      if (this.bestQuality) download = await this.downloadAndMuxVideo();
      else download = await this.downloadAndInjectVideoYTDL();
      if (download) {
        let injection = await evalScript(this.generateJSXText());
        console.log(injection);
      }
      this.isDownloading = false;
      this.isComplete = true;
    },
    async downloadTest() {
      const { stdout, stderr } = await exec(`"${ffmpegLocale}/ffmpeg" -help`);
      console.log(stdout, stderr);
    },
    async getHighestAudio(uid) {
      this.contextText = "Snatching audio";
      return new Promise((resolve, reject) => {
        ytdl(this.url, {
          filter: "audioonly",
          quality: "highest",
        })
          .on("progress", (chunkSize, downloaded, size) => {
            if (!this.chunkPrefix) this.chunkPrefix = size;
            this.progress = Math.round(
              (downloaded / this.totalChunkSize) * 100
            );
          })
          .on("finish", () => {
            resolve(true);
          })
          .pipe(fs.createWriteStream(`${this.outputFolder}/${uid}.mp3`));
      });
    },
    async getHighestVideo(uid) {
      this.contextText = "Snatching video";
      return new Promise((resolve, reject) => {
        ytdl(this.url, {
          filter: "videoonly",
          quality: "highest",
        })
          .on("progress", (chunkSize, downloaded, size) => {
            this.progress = Math.round(
              ((downloaded + this.chunkPrefix) / this.totalChunkSize) * 100
            );
          })
          .on("finish", () => {
            resolve(true);
          })
          .pipe(fs.createWriteStream(`${this.outputFolder}/${uid}.mp4`));
      });
    },
    async downloadAndMuxVideo() {
      this.contextText = "Prepping";
      const uid = new Date().getTime().toString();

      let info = await ytdl.getInfo(this.url);
      let audioLength = ytdl.chooseFormat(info.formats, {
        filter: "audioonly",
        quality: "highest",
      }).contentLength;
      let videoLength = ytdl.chooseFormat(info.formats, {
        filter: "videoonly",
        quality: "highest",
      }).contentLength;
      this.totalChunkSize = +audioLength + +videoLength;
      const audio = await this.getHighestAudio(uid);
      const video = await this.getHighestVideo(uid);
      this.hasDownloaded = true;
      // let debugString = `"${} -v warning -progress /dev/stdout -i in.mp4 out.mp4`
      let cmdString = `"${ffmpegLocale}/ffmpeg" -i "${this.outputFolder}/${uid}.mp4" -i "${this.outputFolder}/${uid}.mp3" -c:v libx264 -c:a aac -map 0:v:0 -map 1:a:0 "${this.outputFolder}/${this.title}.mp4"`;
      this.contextText = "Muxing (this can take a while)";
      const { stdout, stderr } = await exec(cmdString);
      console.log(stdout, stderr);
      this.contextText = "Cleaning up temp files...";
      fs.unlinkSync(`${this.outputFolder}/${uid}.mp3`);
      fs.unlinkSync(`${this.outputFolder}/${uid}.mp4`);
      this.contextText = "Importing...";
      let injection = await evalScript(this.generateJSXText());
      if (injection) {
        console.log("Done");
      }
      this.isDownloading = false;
      this.isComplete = true;
      this.contextText = "Done";
      // fs.unlinkSync()
    },
    async downloadAndInjectVideoYTDL() {
      this.contextText = "Determining best format";
      let opts = await this.ytdlOptions();
      return new Promise((resolve, reject) => {
        this.contextText = "Snatching";
        this.progress = 0;
        this.hasDownloaded = false;
        this.isDownloading = true;
        ytdl(this.url, opts)
          .on("progress", (chunkSize, downloaded, size) => {
            this.progress = Math.round((downloaded / size) * 100);
          })
          .on("finish", () => {
            this.hasDownloaded = true;
            this.isDownloading = false;
            resolve(true);
          })
          .on("error", (err) => {
            console.error(err);
            reject(false);
          })
          .pipe(fs.createWriteStream(this.outputPath));
      });
    },
    generateJSXText() {
      if (spy.appName == "PPRO") {
        return `app.project.importFiles([new File("${this.outputPath
          .replace(/\\/gm, "/")
          .replace(/\//gm, "\\\\")}").fsName]);`;
      } else {
        return `app.project.importFile(new ImportOptions(new File("${this.outputPath
          .replace(/\\/gm, "/")
          .replace(/\//gm, "\\\\")}")));`;
      }
    },
    clearData() {
      this.progress = 0;
      this.title = "";
      this.validURL = false;
      this.channelLink = "";
      this.channelName = "";
      this.hasDownloaded = false;
      this.isDownloading = false;
    },
  },
};
</script>

<style>
.home-wrapper {
  min-height: 580;
  min-width: 300px;
}

.picker-row {
  display: flex;
  flex-wrap: none;
  justify-content: center;
  align-items: center;
}
.toggle-wrapper {
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

.skeleton {
  width: 100%;
  box-sizing: border-box;
  background: var(--button);
}
.input-contents.pseudo {
  margin-top: -5px;
}
.skeleton-content {
  box-sizing: border-box;
  width: 100%;
  padding-top: 56.25%;
  height: 0px;
  position: relative;
  overflow: hidden;
}

.video-thumbnail {
  position: absolute;
  top: 0;
  left: 0;
  display: block;
  width: 100%;
  height: auto;
}

.placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
.file-picker-clear-icon.input {
  margin: 0px 0px 12px 0px;
}
</style>