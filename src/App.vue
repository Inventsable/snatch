<template>
  <div id="app">
    <Menus
      refresh
      debug
      :context="[
        {
          label: 'Reset',
          callback: this.testClick,
        },
      ]"
    />
    <Panel>
      <router-view />
    </Panel>
  </div>
</template>

<script>
import { mapActions } from "vuex";
import { evalScript } from "brutalism";
export default {
  data: () => ({}),
  methods: {
    ...mapActions("settings", ["deleteAll"]),
    testClick(item) {
      // this.deleteAll();
      console.log("Click");
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
