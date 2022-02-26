<template>
  <Wrapper class="home-wrapper">
    <div
      class="error-container"
      @mouseenter="hoverError = true"
      @mouseleave="hoverError = false"
    >
      <div class="error-content">
        <Icon name="alert-circle" style="margin-top: -6px; margin-right: 6px" />
        <Anno>{{ errorText }}</Anno>
      </div>
      <Button flat icon="close" @click="closeError" width="20px" />
    </div>
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
import omodei from "omodei";
import { evalScript } from "brutalism";
import spy from "cep-spy";
const fs = require("fs");
const ytdl = require("ytdl-core");
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
    errorText: "Something went wrong",
    hoverError: false,
  }),
  async mounted() {
    // Getting nice transitions and cubic bezier values from google motion design:
    omodei.assignLibraryByAuthor("google");
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
        // Noticed a discrepancy when toggling customDir, where File Picker value
        // was being ignored due to value not having been recently set to this.outputFolder
        if (val) {
          let storage = window.localStorage;
          let data = storage.getItem("brutalism-prefs");
          if (data) {
            data = JSON.parse(data);
            if (data && data.filepicker) {
              let target = data.filepicker.find((i) => i.id == "folder");
              if (target) this.outputFolder = target.value;
            }
          }
        }
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
    hasError(val) {
      this.setCSS("--error-top", `${val ? 0 : -70}px`);
      let newVal = this.getCSS("--error-top");
      if (val)
        setTimeout(() => {
          document.addEventListener("click", this.closeError, { once: true });
        }, 120);
      else {
        document.removeEventListener("click", this.closeError);
        this.progress = 0;
      }
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
    closeError() {
      this.hasError = false;
    },
    async ytdlOptions() {
      // Likely be best to generate a dropdown containing all format options.
      // Still unsure how to best solve 1080p, may opt for a CLI tool entirely instead
      let info = await ytdl.getInfo(this.url);
      if (this.videoOnly) {
        let videoFormats = ytdl
          .filterFormats(info.formats, "videoonly")
          .filter(
            (format) =>
              format.container == "mp4" &&
              format.hasAudio == false &&
              format.itag !== 399
          )
          .sort((a, b) => b.height - a.height);
        return { quality: videoFormats[0].itag };
      } else if (this.audioOnly) {
        let audioFormats = ytdl
          .filterFormats(info.formats, "audioonly")
          .filter((format) => /mp4/i.test(format.codecs))
          .sort((a, b) => b.audioBitrate - a.audioBitrate);
        return { quality: audioFormats[0].itag };
      } else
        return {
          filter: "audioandvideo",
          quality: "highestvideo",
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
        console.error(err);
        // Shouldn't spam the user with an error message here, reserve it for meaningful ones
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
          return File(app.project.file).parent.fsName;
        }())`);
      } else {
        result = await evalScript(`(function() {
          return File(app.project.path).parent.fsName;
        }())`);
      }
      console.log(result);
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
          if (
            (/(support files|library)/i.test(parentRoot) &&
              /adobe (after effects|premiere pro) \d{1,}/i.test(parentRoot)) ||
            (/applications/i.test(parentRoot) && /adobe/i.test(parentRoot))
          ) {
            this.createError("Must save project before using it's root path");
            return null;
          } else {
            this.outputFolder = parentRoot;
          }
        } else {
          this.isDownloading = false;
          return null;
        }
      }

      // Ensure that no read/write streams fail from conflicting pre-existing file access
      try {
        if (fs.existsSync(this.outputPath)) {
          console.log("File exists:", this.outputPath);
          fs.unlinkSync(this.outputPath);
        } else {
          console.log("File does not exist:", this.outputPath);
        }
      } catch (err) {
        this.createError(
          "File of this same path is already in use and locked by the app"
        );
        console.error(`Not able to delete previous file:`, err);
        this.isDownloading = false;
        this.progress = 0;
        this.isComplete = false;
        this.hasDownloaded = false;
        return null;
      }
      let hasError = false;
      let download = await this.downloadAndInjectVideoYTDL().catch((err) => {
        hasError = true;
        return null;
      });
      if (hasError) return null;
      if (download) {
        let injection = await evalScript(this.generateJSXText());
        console.log(injection);
      } else {
        this.createError("Youtube video not available for download");
      }
      this.isDownloading = false;
      this.isComplete = true;
    },
    async downloadAndInjectVideoYTDL() {
      this.contextText = "Determining best format";
      let opts = await this.ytdlOptions();
      return new Promise((resolve, reject) => {
        this.contextText = "Snatching";
        this.progress = 0;
        this.hasDownloaded = false;
        this.isDownloading = true;
        try {
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
              this.createError("Video unavailable");
              reject(false);
            })
            .pipe(fs.createWriteStream(this.outputPath))
            .on("error", (err) => {
              this.createError("Cannot overwrite file already in use");
              this.progress = 0;
              this.isDownloading = false;
              reject(null);
            });
        } catch (err) {
          console.error(err);
          this.createError("Video unavailable");
        }
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
      this.isComplete = false;
    },
    setCSS(prop, data) {
      document.documentElement.style.setProperty(
        `${/^\-\-/.test(prop) ? prop : "--" + prop}`,
        data
      );
    },
    getCSS(prop) {
      return window
        .getComputedStyle(document.documentElement)
        .getPropertyValue(`${/^\-\-/.test(prop) ? prop : "--" + prop}`);
    },
  },
};
</script>

<style>
:root {
  --error-top: -70px;
}
.home-wrapper {
  min-height: 580;
  min-width: 300px;
}
.error-container {
  max-height: 56px;
  height: 56px;
  margin-top: 0px;
  box-sizing: border-box;
  justify-content: center;
  display: flex;
  top: var(--error-top);
  transition: top 160ms var(--quad) 20ms;
  left: 0;
  width: 100vw;
  padding: 16px 10px 10px 10px;
  background-color: var(--color-btn-toolbar-active);
  position: absolute;
  z-index: 99;
}
.error-content {
  box-sizing: border-box;
  width: 100%;
  display: flex;
  align-items: center;
  flex-wrap: none;
}

.error-container .button.flat:hover {
  background: transparent;
  border-color: transparent;
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