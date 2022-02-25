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
        <Toggle label="Best video quality" v-model="bestQuality" />
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
      <!-- <Anno
        size="11px"
        :color="!validURL ? 'var(--color-btn-disabled-text)' : ''"
      >
        <Link v-if="validURL" :url="channelLink">{{ channelName }}</Link>
        <div v-else>No channel</div>
      </Anno> -->
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
// const ffmpeg = require("../../ffmpeg/");

// import path from "path";
import util from "util";
const exec = util.promisify(require("child_process").exec);
// import { Pully, Presets } from "pully";
// const pully = new Pully();
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
        : "Snatch";
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
    bestQuality: {
      get() {
        return this.settings.bestQuality;
      },
      set(val) {
        this.setBestQuality(val);
      },
    },
    ytdlOptions() {
      // Likely be best to generate a dropdown containing all format options.
      // Still unsure how to best solve 1080p, may opt for a CLI tool entirely instead
      return {
        filter: this.audioOnly ? "audioonly" : "audioandvideo",
        quality: this.audioOnly ? "highest" : "highestvideo",
      };
    },
    canDownload() {
      return (
        this.hasValidURL &&
        this.outputFolder.length &&
        !this.isDownloading &&
        !this.hasDownloaded
      );
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
      // @NOTE - Should be replaced with dynamic formats
      return `${this.outputFolder}/${this.title}.mp${
        this.audioOnly ? "3" : "4"
      }`;
    },
  },
  watch: {
    settings: {
      handler(evt) {
        if (this.hasDownloaded) this.hasDownloaded = false;
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
      "getSettings",
    ]),
    updateOutput(data) {
      if (Array.isArray(data) && data.length) this.outputFolder = data[0];
      else {
        console.error("Unexpected non-Array fed into File-Picker:", data);
      }
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
    async beginDownload() {
      // PPRO apparently breaks with the JSON polyfill nowadays, good to know, glad it took an hour of debugging before I figured it out.
      // let data = {
      //   file: this.outputPath,
      //   title: this.title,
      //   options: {
      //     foo: "bar",
      //   },
      // };

      // Ensure that no read/write streams fail from conflicting pre-existing file access
      try {
        if (fs.existsSync(this.outputPath)) fs.unlinkSync(this.outputPath);
      } catch (err) {
        console.error(`Not able to delete previous file:`, err);
      }

      let download;
      if (this.bestQuality) download = await this.downloadAndMuxVideo();
      else download = await this.downloadAndInjectVideoYTDL();
      if (download) {
        let injection = await evalScript(this.generateJSXText());
        console.log(injection);
      }
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
      this.progress = this.chunkPrefix = 0;
      this.isDownloading = true;
      this.hasDownloaded = false;
      this.isComplete = false;
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
      let cmdString = `"${ffmpegLocale}/ffmpeg" -i "${this.outputFolder}/${uid}.mp4" -i "${this.outputFolder}/${uid}.mp3" -c:v copy -c:a aac -b:a 128k -ar 48000 -ac 2 "${this.outputFolder}/${this.title}.mp4"`;
      console.log(cmdString);
      this.contextText = "Mixing audio and video...";
      const { stdout, stderr } = await exec(cmdString);
      console.log(stdout, stderr);
      console.log("Muxed");
      this.contextText = "Cleaning up temp files...";
      fs.unlinkSync(`${this.outputFolder}/${uid}.mp3`);
      fs.unlinkSync(`${this.outputFolder}/${uid}.mp4`);
      this.contextText = "Importing...";
      let injection = await evalScript(this.generateJSXText());
      if (injection) {
        console.log("Done?");
      }
      this.isDownloading = false;
      this.isComplete = true;
      this.contextText = "Done";
      // fs.unlinkSync()
    },
    async downloadAndInjectVideoYTDL() {
      if (!this.canDownload) {
        console.error("Func is running without valid URL or params");
        return null;
      }
      return new Promise((resolve, reject) => {
        this.contextText = "Snatching";
        console.log(this.settings.audioOnly);
        console.log(this.outputPath);
        this.progress = 0;
        this.hasDownloaded = false;
        this.isDownloading = true;
        ytdl(this.url, this.ytdlOptions)
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