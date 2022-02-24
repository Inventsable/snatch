<template>
  <Wrapper class="home-wrapper">
    <Progress-Bar :percent="progress" :size="3" />
    <Input
      label="URL"
      flat
      v-model="url"
      placeholder="http://youtube.com/..."
    />
    <div class="skeleton">
      <div class="skeleton-content">
        <div v-if="!hasValidURL" class="placeholder">
          <Anno uppercase>{{ urlErrorMessage }}</Anno>
        </div>
        <div v-else>WORKING ON IT...</div>
      </div>
    </div>
    <Button
      :disabled="!hasValidURL"
      label="Snatch"
      uppercase
      icon="download"
      block
      @click="downloadAndInjectVideo"
    />
  </Wrapper>
</template>

<script>
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
    quality: "highest",
  }),
  computed: {
    urlErrorMessage() {
      return this.hasNoURL
        ? "No URL queried"
        : !this.validURL
        ? "URL is invalid"
        : "Working...";
    },
    hasNoURL() {
      return !this.url || !this.url.length;
    },
    hasValidURL() {
      return !this.hasNoURL && this.validURL;
    },
  },
  methods: {
    async downloadAndInjectVideo() {
      if (!this.hasValidURL) {
        console.error("Func is running without valid URL");
        return null;
      }
    },
    clearData() {
      this.progress = 0;
      this.url = "";
      this.title = "";
      this.validURL = false;
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

.skeleton-content {
  box-sizing: border-box;
  width: 100%;
  padding-top: 56.25%;
  height: 0px;
  position: relative;
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
</style>