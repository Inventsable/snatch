<template>
  <div id="app">
    <!-- 
      Dynamic menu component reactively handles all flyout and context menus.
      https://github.com/Inventsable/brutalism/tree/master/components/Menus
     -->
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
    <!-- <Tabs invert :routes="routes" /> -->
  </div>
</template>

<script>
import { mapActions } from "vuex";
import { evalScript } from "brutalism";
export default {
  data: () => ({
    routes: [
      { label: "Home", name: "home" },
      { label: "About", path: "/about" },
    ],
  }),
  methods: {
    ...mapActions("settings", ["deleteAll"]),
    testClick(item) {
      this.deleteAll();
    },
    checkMenu(item, index, val) {
      console.log(item, index, val);
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
