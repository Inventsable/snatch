<template>
  <div id="app">
    <Menus
      refresh
      :context="[
        {
          label: 'About',
          callback: this.visitHomepage,
        },
        {
          label: 'Clear settings',
          callback: this.removeSettings,
        },
      ]"
    />
    <Panel no-utils script-path="host.jsx">
      <router-view />
    </Panel>
  </div>
</template>

<script>
import { mapActions } from "vuex";
import { evalScript } from "brutalism";
import { openURL } from "cluecumber";
export default {
  data: () => ({}),
  methods: {
    ...mapActions("settings", ["deleteAll"]),
    visitHomepage() {
      openURL("https://github.com/Inventsable/snatch#snatch");
    },
    removeSettings() {
      this.deleteAll();
    },
    async runTestScript() {
      let result = await evalScript(`
        function test() {
          alert('Hello world!')
          return 'result from JSX file'
        }
        test();
      `);
      console.log(result);
    },
  },
};
</script>

<style>
</style>
