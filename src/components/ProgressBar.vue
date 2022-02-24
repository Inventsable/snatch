<template>
  <!-- 
    Issues:
      - I want the bar to pop up / down BEFORE the width is adjusted
  -->
  <div
    class="progress-bar-wrapper"
    :style="{
      top: realTop,
      opacity: value >= 100 ? 1 : 1,
    }"
  >
    <div class="progress-bar-container">
      <div
        class="progress-bar-value"
        :style="{
          width: realPercent,
          height: realSize,
          background: realColor,
          'transition-property': 'width',
          'transition-delay': delay,
          'transition-duration': duration,
          'transition-timing-function': timing,
        }"
      />
    </div>
  </div>
</template>

<script>
export default {
  props: {
    percent: {
      type: Number,
      default: 0,
    },
    delay: {
      type: String,
      default: "20ms",
    },
    duration: {
      type: String,
      default: "120ms",
    },
    timing: {
      type: String,
      default: "var(--quad)",
    },
    size: {
      type: Number,
      default: 2,
    },
    color: {
      type: String,
      default: "",
    },
    value: {
      type: Number,
      default: 0,
    },
    debug: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    realPercent() {
      return `${this.realValue}%`;
    },
    realTransition() {
      return `width ${this.timing}`;
    },
    realSize() {
      return `${this.size}px`;
    },
    realColor() {
      if (!this.color.length) return `var(--color-selection);`;
      else {
        if (!/-/.test(this.color)) return this.color;
        return `var(--color-${this.color
          .replace(/var\(/, "")
          .replace(/(--color-|color-)/, "")
          .replace(/\)$/, "")})`;
      }
    },
  },
  data: () => ({
    realValue: 0,
    realTop: 0,
    locked: false,
  }),
  mounted() {
    this.realValue = this.percent || this.value;
    this.getRealTop();
  },
  watch: {
    realTop(val) {
      if (this.debug) console.log("Top is now:", val);
    },
    percent(val) {
      this.realValue = val;
    },
    value(val) {
      this.realValue = val >= 0 && val <= 100 ? val : val >= 100 ? 100 : 0;
    },
    realValue(val, lastVal) {
      const self = this;
      if (this.debug)
        console.log("VALUE:", this.realValue, "LAST VAL:", lastVal);
      if (val >= 100 || val <= 0 || lastVal >= 100 || lastVal <= 0) {
        this.getRealTop();
        if (this.debug) console.log("Toggle top first...");
        setTimeout(() => {
          self.realValue = val >= 0 && val <= 100 ? val : val >= 100 ? 100 : 0;
        }, 220);
      } else {
        if (this.debug) console.log("No toggle");
        this.realValue = val >= 0 && val <= 100 ? val : val >= 100 ? 100 : 0;
      }
      if (this.debug)
        if (val >= 100) {
          // console.log(val, lastVal);
          this.locked = true;
          setTimeout(() => {
            self.reset();
          }, 520);
        }
      this.$emit("input", val);
    },
  },
  methods: {
    getRealTop() {
      let temp = `${
        this.value >= 100 || this.percent >= 100
          ? this.size * -1
          : this.value > 0 || this.percent > 0
          ? this.size
          : this.size * -1
      }px`;
      this.realTop = temp;
    },
    getProgressStyle() {
      let style = "";
      style += `height: ${this.size}; width: ${this.realValue}%;`;
      return style;
    },
    reset() {
      if (this.debug) console.log("RESET");
      this.$emit("reset");
      this.realValue = 0;
      this.locked = false;
    },
  },
};
</script>

<style>
.progress-bar-wrapper {
  transition: top 200ms var(--quad) 0ms, opacity 500ms var(--quad) 20ms;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  margin: 0;
  height: fit-content;
}
.progress-bar-container {
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  width: 100%;
}

.progress-bar-value {
  background-color: var(--color-selection);
}
</style>
