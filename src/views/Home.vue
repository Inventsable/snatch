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
    <File-Picker
      folder
      clearable
      :fullPath="true"
      label="Output folder"
      prefs-id="folder"
      @prefs="updateOutput"
      @input="updateOutput"
      @clear="() => (outputFolder = '')"
    />
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
      :label="
        hasDownloaded ? 'Done' : isDownloading ? `${this.progress}%` : 'Snatch'
      "
      uppercase
      :icon="hasDownloaded ? 'check' : isDownloading ? '' : 'download'"
      block
      @click="beginDownload"
      :color="
        hasDownloaded ? 'var(--color-selection)' : 'var(--color-button-primary)'
      "
    />
  </Wrapper>
</template>

<script>
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
    quality: "highest",
    hasFocus: false,
    testedURL: false,
    channelLink: "",
    channelName: "",
    outputFolder: "",
    hasDownloaded: false,
    isDownloading: false,
  }),
  async mounted() {
    // If the panel was mounted and prefs are filled, automatically query the URL:
    if (this.url.length) this.checkURL(this.url);
  },
  computed: {
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
      return `${this.outputFolder}/${this.title}.mp4`;
    },
  },
  methods: {
    updateOutput(data) {
      if (Array.isArray(data) && data.length) this.outputFolder = data[0];
      else {
        console.error("Unexpected non-Array fed into File-Picker:", data);
      }
    },
    async checkURL(data) {
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
      let download = await this.downloadAndInjectVideo();
      if (download) {
        let injection = await evalScript(this.generateJSXText());
        console.log(injection);
      }
    },
    async downloadAndInjectVideo() {
      if (!this.canDownload) {
        console.error("Func is running without valid URL or params");
        return null;
      }
      return new Promise((resolve, reject) => {
        this.progress = 0;
        this.hasDownloaded = false;
        this.isDownloading = true;
        ytdl(this.url, {
          filter: "audioandvideo",
          quality: "highestvideo",
        })
          .on("progress", (chunkSize, downloaded, size) => {
            this.progress = Math.round((downloaded / size) * 100);
          })
          .on("finish", () => {
            console.log("Closed?");
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